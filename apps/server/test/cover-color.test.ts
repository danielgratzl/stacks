import { coverColorGroup } from '@stacks/shared';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { items } from '../src/db/schema';
import { setup } from './helpers';

const solid = (background: string) =>
  sharp({ create: { width: 20, height: 30, channels: 3, background } })
    .png()
    .toBuffer();

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe('cover colors', () => {
  it('finds the dominant color of a stored cover', async () => {
    const { covers } = await setup();
    const { cover } = await covers.save(await solid('#336699'));
    const hex = (await covers.dominantColor(cover))!;
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    channels(hex).forEach((v, i) => expect(Math.abs(v - channels('#336699')[i]!)).toBeLessThan(12));
    expect(coverColorGroup(hex)).toBe('blue');
  });

  it('returns null for invalid or missing covers', async () => {
    const { covers } = await setup();
    expect(await covers.dominantColor('../etc/passwd')).toBeNull();
    expect(await covers.dominantColor('00000000-0000-0000-0000-000000000000.webp')).toBeNull();
  });

  it('keeps the color in step with the item cover', async () => {
    const { call, covers } = await setup();
    const red = (await covers.save(await solid('#cc2222'))).cover;
    const green = (await covers.save(await solid('#22aa33'))).cover;
    const item = (await call('POST', '/api/items', { type: 'book', title: 'A', cover: red })).body;
    expect(coverColorGroup(item.coverColor)).toBe('red');

    const renamed = (await call('PATCH', `/api/items/${item.id}`, { title: 'B' })).body;
    expect(renamed.coverColor).toBe(item.coverColor);

    const recovered = (await call('PATCH', `/api/items/${item.id}`, { cover: green })).body;
    expect(coverColorGroup(recovered.coverColor)).toBe('green');

    const uncovered = (await call('PATCH', `/api/items/${item.id}`, { cover: null })).body;
    expect(uncovered.coverColor).toBeNull();

    const plain = (await call('POST', '/api/items', { type: 'vinyl', title: 'C' })).body;
    expect(plain.coverColor).toBeNull();
  });

  it('ignores a cover color sent by the client', async () => {
    const { call } = await setup();
    const item = (await call('POST', '/api/items', { type: 'book', title: 'A', coverColor: '#ff0000' })).body;
    expect(item.coverColor).toBeNull();
  });

  it('backfills items that have a cover but no color', async () => {
    const { call, covers, db, itemService } = await setup();
    const { cover } = await covers.save(await solid('#eeeeee'));
    await call('POST', '/api/items', { type: 'book', title: 'A', cover });
    await call('POST', '/api/items', { type: 'book', title: 'B' });
    db.update(items).set({ coverColor: null }).run();

    expect(await itemService.backfillCoverColors()).toBe(1);
    const list = (await call('GET', '/api/items')).body.items;
    expect(coverColorGroup(list.find((i: { title: string }) => i.title === 'A').coverColor)).toBe('white');
    expect(await itemService.backfillCoverColors()).toBe(0);
  });
});
