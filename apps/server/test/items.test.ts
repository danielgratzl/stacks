import { describe, expect, it } from 'vitest';
import { setup } from './helpers';

describe('items API', () => {
  it('creates an item with defaults and lists it', async () => {
    const { call } = await setup();
    const created = await call('POST', '/api/items', {
      type: 'book',
      title: '  Dune ',
      creators: ['Frank Herbert'],
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      title: 'Dune',
      status: 'owned',
      tags: [],
      loan: null,
      originalYear: null,
    });
    const list = await call('GET', '/api/items');
    expect(list.body.items).toHaveLength(1);
  });

  it('rejects missing titles and editions older than the original', async () => {
    const { call } = await setup();
    expect((await call('POST', '/api/items', { type: 'book', title: '' })).status).toBe(400);
    const res = await call('POST', '/api/items', {
      type: 'vinyl',
      title: 'X',
      originalYear: 1990,
      editionYear: 1980,
    });
    expect(res.status).toBe(422);
    expect(res.body.error.fields.editionYear).toBeTruthy();
  });

  it('rejects unknown locations and covers', async () => {
    const { call } = await setup();
    const res = await call('POST', '/api/items', {
      type: 'book',
      title: 'X',
      locationId: crypto.randomUUID(),
      cover: `${crypto.randomUUID()}.webp`,
    });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.fields).sort()).toEqual(['cover', 'locationId']);
  });

  it('clears location and loan when moving to the wishlist, and resets addedAt', async () => {
    const { call } = await setup();
    const loc = (await call('POST', '/api/locations', { name: 'Shelf' })).body;
    const item = (
      await call('POST', '/api/items', {
        type: 'book',
        title: 'X',
        locationId: loc.id,
        loan: { to: 'Anna', since: '2026-10-01' },
      })
    ).body;
    expect(item.loan).toEqual({ to: 'Anna', since: '2026-10-01' });
    await new Promise((r) => setTimeout(r, 5));
    const moved = (await call('PATCH', `/api/items/${item.id}`, { status: 'wishlist' })).body;
    expect(moved).toMatchObject({ status: 'wishlist', locationId: null, loan: null });
    expect(moved.addedAt > item.addedAt).toBe(true);
  });

  it('patches only the given fields', async () => {
    const { call } = await setup();
    const item = (await call('POST', '/api/items', { type: 'vinyl', title: 'Kind of Blue', tags: ['jazz'] }))
      .body;
    const patched = (await call('PATCH', `/api/items/${item.id}`, { notes: 'First pressing' })).body;
    expect(patched).toMatchObject({ title: 'Kind of Blue', tags: ['jazz'], notes: 'First pressing' });
  });

  it('soft-deletes and restores', async () => {
    const { call } = await setup();
    const item = (await call('POST', '/api/items', { type: 'book', title: 'X' })).body;
    expect((await call('DELETE', `/api/items/${item.id}`)).status).toBe(204);
    expect((await call('GET', `/api/items/${item.id}`)).status).toBe(404);
    expect((await call('GET', '/api/items')).body.items).toHaveLength(0);
    expect((await call('POST', `/api/items/${item.id}/restore`)).status).toBe(200);
    expect((await call('GET', '/api/items')).body.items).toHaveLength(1);
  });

  it('purges items deleted before the cutoff', async () => {
    const { call, itemService } = await setup();
    const item = (await call('POST', '/api/items', { type: 'book', title: 'X' })).body;
    await call('DELETE', `/api/items/${item.id}`);
    expect(itemService.purgeDeleted(new Date(Date.now() + 1000))).toBe(1);
    expect((await call('POST', `/api/items/${item.id}/restore`)).status).toBe(404);
  });
});
