import type { CoverCandidate, CoverSearchQuery, CoverSource, MediaType } from '@stacks/shared';
import { fetch } from 'undici';
import { AppError } from '../lib/errors';
import { USER_AGENT } from './safe-fetch';

export type CoverProvider = (q: string) => Promise<CoverCandidate[]>;
export type CoverProviders = Record<MediaType, Partial<Record<CoverSource, CoverProvider>>>;

/** Where provider thumbnails are served from, including redirect targets. The CSP allows these. */
export const COVER_IMAGE_HOSTS = [
  'https://covers.openlibrary.org',
  'https://archive.org',
  'https://*.archive.org',
  'https://*.mzstatic.com',
  'https://*.dzcdn.net',
];

const PER_PROVIDER = 8;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_SIZE = 50;

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`${new URL(url).host} answered ${response.status}`);
  }
  return response.json();
}

const withParams = (base: string, params: Record<string, string | number>) => {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  return url.toString();
};

const yearOf = (value: unknown): number | null => {
  const year = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  return Number.isInteger(year) && year > 0 && year < 10000 ? year : null;
};

interface OpenLibrarySearch {
  docs?: { title?: string; author_name?: string[]; first_publish_year?: number; cover_i?: number }[];
}

export const openLibrary: CoverProvider = async (q) => {
  // Open Library search often takes several seconds.
  const data = (await fetchJson(
    withParams('https://openlibrary.org/search.json', {
      q,
      fields: 'title,author_name,first_publish_year,cover_i',
      limit: PER_PROVIDER,
    }),
    15_000,
  )) as OpenLibrarySearch;
  return (data.docs ?? [])
    .filter((d) => d.cover_i && d.cover_i > 0)
    .map((d) => ({
      source: 'openlibrary',
      title: d.title ?? '',
      creator: d.author_name?.[0] ?? '',
      year: yearOf(d.first_publish_year),
      thumbnailUrl: `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`,
      imageUrl: `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`,
    }));
};

interface ItunesSearch {
  results?: {
    trackName?: string;
    collectionName?: string;
    artistName?: string;
    releaseDate?: string;
    artworkUrl100?: string;
  }[];
}

/** iTunes artwork URLs end in a size that can be swapped for a larger one. */
const ARTWORK_SIZE = /\/100x100bb\.(jpg|png|webp)$/;

const itunes =
  (entity: 'ebook' | 'album'): CoverProvider =>
  async (q) => {
    const data = (await fetchJson(
      withParams('https://itunes.apple.com/search', {
        term: q,
        media: entity === 'ebook' ? 'ebook' : 'music',
        entity,
        limit: PER_PROVIDER,
      }),
    )) as ItunesSearch;
    return (data.results ?? [])
      .filter((r) => r.artworkUrl100 && ARTWORK_SIZE.test(r.artworkUrl100))
      .map((r) => ({
        source: 'apple',
        title: (entity === 'ebook' ? r.trackName : r.collectionName) ?? '',
        creator: r.artistName ?? '',
        year: yearOf(r.releaseDate?.slice(0, 4)),
        thumbnailUrl: r.artworkUrl100!.replace(ARTWORK_SIZE, '/300x300bb.$1'),
        imageUrl: r.artworkUrl100!.replace(ARTWORK_SIZE, '/1200x1200bb.$1'),
      }));
  };

export const appleBooks = itunes('ebook');
export const appleMusic = itunes('album');

interface DeezerSearch {
  error?: unknown;
  data?: {
    title?: string;
    artist?: { name?: string };
    md5_image?: string;
    cover_medium?: string;
    cover_xl?: string;
  }[];
}

export const deezer: CoverProvider = async (q) => {
  const data = (await fetchJson(
    withParams('https://api.deezer.com/search/album', { q, limit: PER_PROVIDER }),
  )) as DeezerSearch;
  // Deezer reports errors with a 200 status.
  if (data.error) throw new Error('Deezer answered with an error');
  return (data.data ?? [])
    .filter((a) => a.md5_image && a.cover_medium && a.cover_xl)
    .map((a) => ({
      source: 'deezer',
      title: a.title ?? '',
      creator: a.artist?.name ?? '',
      year: null,
      thumbnailUrl: a.cover_medium!,
      imageUrl: a.cover_xl!,
    }));
};

export const DEFAULT_PROVIDERS: CoverProviders = {
  book: { apple: appleBooks, openlibrary: openLibrary },
  vinyl: { apple: appleMusic, deezer },
};

/** Searches one source at a time, so the client can show fast sources before slow ones answer. */
export class CoverSearch {
  private cache = new Map<string, { at: number; results: CoverCandidate[] }>();

  constructor(private providers: CoverProviders = DEFAULT_PROVIDERS) {}

  async search({ type, source, q }: CoverSearchQuery): Promise<CoverCandidate[]> {
    const provider = this.providers[type][source];
    if (!provider) throw new AppError(400, 'unknown_source', `There’s no ${source} search for that type.`);

    const key = `${type}\n${source}\n${q.toLocaleLowerCase()}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.results;

    let found: CoverCandidate[];
    try {
      found = await provider(q);
    } catch (error) {
      console.warn(`cover search (${source}) failed:`, error);
      throw new AppError(502, 'search_failed', 'Couldn’t reach that cover service. Try again in a moment.');
    }
    const seen = new Set<string>();
    const results = found.filter((c) => !seen.has(c.imageUrl) && seen.add(c.imageUrl)).slice(0, PER_PROVIDER);

    this.cache.delete(key);
    this.cache.set(key, { at: Date.now(), results });
    if (this.cache.size > CACHE_SIZE) this.cache.delete(this.cache.keys().next().value!);
    return results;
  }
}
