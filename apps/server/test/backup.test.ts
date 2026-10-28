import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { setup } from './helpers';

describe('export and import', () => {
  it('round-trips items, locations and covers into an empty library', async () => {
    const source = await setup();
    const room = (await source.call('POST', '/api/locations', { name: 'Room' })).body;
    const shelf = (await source.call('POST', '/api/locations', { name: 'Shelf', parentId: room.id })).body;
    const img = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } })
      .png()
      .toBuffer();
    const cover = await source.covers.save(img);
    await source.call('POST', '/api/items', {
      type: 'book',
      title: 'A',
      locationId: shelf.id,
      cover: cover.cover,
      readStatus: 'read',
    });
    await source.call('POST', '/api/items', { type: 'vinyl', title: 'B', status: 'wishlist' });
    const exported = (await source.call('GET', '/api/export')).body;
    expect(Object.keys(exported.covers)).toEqual([cover.cover]);
    expect(exported.items[0]).not.toHaveProperty('coverColor');

    const target = await setup();
    const result = await target.call('POST', '/api/import', exported);
    expect(result.body).toEqual({ locations: 2, items: 2, skipped: 0, covers: 1 });
    const items = (await target.call('GET', '/api/items')).body.items;
    expect(items.find((i: { title: string }) => i.title === 'A')).toMatchObject({
      locationId: shelf.id,
      cover: cover.cover,
      readStatus: 'read',
      coverColor: expect.stringMatching(/^#[0-9a-f]{6}$/),
    });

    // importing again adds nothing
    expect((await target.call('POST', '/api/import', exported)).body).toMatchObject({ items: 0, skipped: 2 });
  });

  it('imports exports made before read status existed', async () => {
    const source = await setup();
    await source.call('POST', '/api/items', { type: 'book', title: 'A' });
    const exported = (await source.call('GET', '/api/export')).body;
    for (const item of exported.items) delete item.readStatus;

    const target = await setup();
    expect((await target.call('POST', '/api/import', exported)).body).toMatchObject({ items: 1 });
    expect((await target.call('GET', '/api/items')).body.items[0].readStatus).toBe('unread');
  });
});
