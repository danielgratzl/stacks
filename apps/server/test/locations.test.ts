import { describe, expect, it } from 'vitest';
import { setup } from './helpers';

describe('locations API', () => {
  it('builds a hierarchy with sibling positions', async () => {
    const { call } = await setup();
    const room = (await call('POST', '/api/locations', { name: 'Living room' })).body;
    const a = (await call('POST', '/api/locations', { name: 'Shelf', parentId: room.id })).body;
    const b = (await call('POST', '/api/locations', { name: 'Cabinet', parentId: room.id })).body;
    expect([a.position, b.position]).toEqual([0, 1]);
    expect((await call('GET', '/api/locations')).body.locations).toHaveLength(3);
  });

  it('prevents moving a location inside itself', async () => {
    const { call } = await setup();
    const room = (await call('POST', '/api/locations', { name: 'Room' })).body;
    const shelf = (await call('POST', '/api/locations', { name: 'Shelf', parentId: room.id })).body;
    const res = await call('PATCH', `/api/locations/${room.id}`, { parentId: shelf.id });
    expect(res.status).toBe(422);
  });

  it('deletes a subtree and moves its items to the parent', async () => {
    const { call } = await setup();
    const room = (await call('POST', '/api/locations', { name: 'Room' })).body;
    const shelf = (await call('POST', '/api/locations', { name: 'Shelf', parentId: room.id })).body;
    const top = (await call('POST', '/api/locations', { name: 'Top', parentId: shelf.id })).body;
    const item = (await call('POST', '/api/items', { type: 'book', title: 'X', locationId: top.id })).body;
    const res = await call('DELETE', `/api/locations/${shelf.id}`);
    expect(res.body).toEqual({ deleted: expect.arrayContaining([shelf.id, top.id]), movedItems: 1 });
    expect((await call('GET', `/api/items/${item.id}`)).body.locationId).toBe(room.id);
    expect((await call('GET', '/api/locations')).body.locations.map((l: { id: string }) => l.id)).toEqual([
      room.id,
    ]);
  });
});
