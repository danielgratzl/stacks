import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { isPrivateAddress } from '../src/services/safe-fetch';
import { setup } from './helpers';

const png = () =>
  sharp({ create: { width: 2000, height: 3000, channels: 3, background: '#336699' } })
    .png()
    .toBuffer();

describe('covers', () => {
  it('stores uploads as bounded WebP and serves them', async () => {
    const { app, call } = await setup();
    const form = new FormData();
    form.append('file', new File([new Uint8Array(await png())], 'cover.png', { type: 'image/png' }));
    const res = await app.request('/api/covers', { method: 'POST', body: form });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { cover: string };
    expect(body).toMatchObject({ width: 667, height: 1000 });
    const file = await app.request(`/covers/${body.cover}`);
    expect(file.headers.get('content-type')).toBe('image/webp');
    const item = await call('POST', '/api/items', { type: 'book', title: 'X', cover: body.cover });
    expect(item.status).toBe(201);
  });

  it('rejects files that are not images', async () => {
    const { app } = await setup();
    const form = new FormData();
    form.append('file', new File(['hello'], 'x.png', { type: 'image/png' }));
    expect((await app.request('/api/covers', { method: 'POST', body: form })).status).toBe(422);
  });

  it('refuses to import from private addresses', async () => {
    const { call } = await setup();
    for (const url of [
      'http://127.0.0.1/x.png',
      'http://localhost/x.png',
      'http://[::1]/x.png',
      'http://10.0.0.5/a.jpg',
    ]) {
      const res = await call('POST', '/api/covers/import', { url });
      expect(res.status, url).toBe(422);
      expect(res.body.error.code).toBe('forbidden_address');
    }
    expect((await call('POST', '/api/covers/import', { url: 'file:///etc/passwd' })).status).toBe(422);
  });

  it('removes orphaned files but keeps referenced ones', async () => {
    const { covers } = await setup();
    const a = await covers.save(await png());
    const b = await covers.save(await png());
    expect(await covers.removeOrphans(new Set([a.cover]), -1)).toBe(1);
    expect(await covers.exists(a.cover)).toBe(true);
    expect(await covers.exists(b.cover)).toBe(false);
  });
});

describe('isPrivateAddress', () => {
  it.each([
    ['127.0.0.1', true],
    ['10.1.2.3', true],
    ['172.20.0.1', true],
    ['192.168.1.10', true],
    ['169.254.169.254', true],
    ['::1', true],
    ['fd00::1', true],
    ['::ffff:127.0.0.1', true],
    ['93.184.216.34', false],
    ['2606:2800:220:1::1', false],
  ])('%s → %s', (ip, expected) => expect(isPrivateAddress(ip)).toBe(expected));
});
