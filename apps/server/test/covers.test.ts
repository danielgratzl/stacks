import type { CoverCandidate } from '@stacks/shared';
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { CoverSearch, type CoverProvider } from '../src/services/cover-search';
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

const candidate = (source: CoverCandidate['source'], n: number): CoverCandidate => ({
  source,
  title: `${source} ${n}`,
  creator: '',
  year: null,
  thumbnailUrl: `https://img.example/${source}/${n}-s.jpg`,
  imageUrl: `https://img.example/${source}/${n}.jpg`,
});
const provider =
  (source: CoverCandidate['source'], count: number): CoverProvider =>
  async () =>
    Array.from({ length: count }, (_, i) => candidate(source, i));

describe('cover search', () => {
  it('asks the provider for that type and source, and caps its results', async () => {
    const books = vi.fn(provider('apple', 20));
    const music = vi.fn(provider('apple', 3));
    const { call } = await setup({
      coverSearch: new CoverSearch({ book: { apple: books }, vinyl: { apple: music } }),
    });
    const res = await call('GET', '/api/covers/search?type=book&source=apple&q=left%20hand');
    expect(res.status).toBe(200);
    const results = res.body.results as CoverCandidate[];
    expect(results).toHaveLength(8);
    expect(results[0]).toEqual(candidate('apple', 0));
    expect(books).toHaveBeenCalledWith('left hand');
    expect(music).not.toHaveBeenCalled();
  });

  it('drops duplicate images', async () => {
    const twice: CoverProvider = async () => [candidate('deezer', 1), candidate('deezer', 1)];
    const { call } = await setup({ coverSearch: new CoverSearch({ book: {}, vinyl: { deezer: twice } }) });
    const res = await call('GET', '/api/covers/search?type=vinyl&source=deezer&q=x');
    expect(res.body.results).toHaveLength(1);
  });

  it('caches answers but not failures', async () => {
    const working = vi.fn(provider('openlibrary', 2));
    const failing = vi.fn(async (): Promise<CoverCandidate[]> => {
      throw new Error('down');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { call } = await setup({
      coverSearch: new CoverSearch({ book: { openlibrary: working, apple: failing }, vinyl: {} }),
    });
    await call('GET', '/api/covers/search?type=book&source=openlibrary&q=Dune');
    await call('GET', '/api/covers/search?type=book&source=openlibrary&q=dune');
    expect(working).toHaveBeenCalledTimes(1);

    const res = await call('GET', '/api/covers/search?type=book&source=apple&q=dune');
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('search_failed');
    await call('GET', '/api/covers/search?type=book&source=apple&q=dune');
    expect(failing).toHaveBeenCalledTimes(2);
  });

  it('validates the query', async () => {
    const { call } = await setup({
      coverSearch: new CoverSearch({ book: { apple: provider('apple', 1) }, vinyl: {} }),
    });
    expect((await call('GET', '/api/covers/search?type=book&source=apple&q=%20')).status).toBe(400);
    expect((await call('GET', '/api/covers/search?type=dvd&source=apple&q=x')).status).toBe(400);
    expect((await call('GET', '/api/covers/search?type=book&q=x')).status).toBe(400);
    const wrong = await call('GET', '/api/covers/search?type=book&source=deezer&q=x');
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe('unknown_source');
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
