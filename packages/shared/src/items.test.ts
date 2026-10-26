import { describe, expect, it } from 'vitest';
import { groupSeries, locationPath, locationSubtree, locationTree, originalYearOf } from './items';
import { ITEM_DEFAULTS, itemCreateSchema, normalizeItem, validateItem, type Item } from './schemas';

const item = (over: Partial<Item>): Item => ({
  ...ITEM_DEFAULTS,
  id: String(Math.random()),
  type: 'book',
  title: 'Untitled',
  addedAt: '',
  createdAt: '',
  updatedAt: '',
  ...over,
});

const locations = [
  { id: 'a', name: 'Living room', parentId: null, position: 0 },
  { id: 'b', name: 'Shelf', parentId: 'a', position: 0 },
  { id: 'c', name: 'Top', parentId: 'b', position: 0 },
  { id: 'd', name: 'Study', parentId: null, position: 1 },
];

describe('locations', () => {
  it('builds paths from the root', () => {
    expect(locationPath(locations, 'c')).toEqual(['Living room', 'Shelf', 'Top']);
    expect(locationPath(locations, null)).toEqual([]);
  });
  it('collects subtrees', () => {
    expect([...locationSubtree(locations, 'a')].sort()).toEqual(['a', 'b', 'c']);
  });
  it('flattens in depth-first order', () => {
    expect(locationTree(locations).map((l) => `${l.depth}:${l.name}`)).toEqual([
      '0:Living room',
      '1:Shelf',
      '2:Top',
      '0:Study',
    ]);
  });
});

describe('series', () => {
  it('groups case-insensitively and reports gaps', () => {
    const [series] = groupSeries([
      item({ title: 'One', seriesName: 'Discworld', seriesNumber: '1' }),
      item({ title: 'Four', seriesName: 'discworld', seriesNumber: '4' }),
      item({ title: 'Two', seriesName: 'Discworld', seriesNumber: '2' }),
    ]);
    expect(series?.items.map((i) => i.title)).toEqual(['One', 'Two', 'Four']);
    expect(series?.missing).toEqual([3]);
  });
});

describe('items', () => {
  it('prefers the original year', () => {
    expect(originalYearOf({ originalYear: 1959, editionYear: 2015 })).toBe(1959);
    expect(originalYearOf({ originalYear: null, editionYear: 2015 })).toBe(2015);
  });
  it('rejects editions older than the original', () => {
    expect(validateItem(item({ originalYear: 2000, editionYear: 1990 })).editionYear).toBeTruthy();
  });
  it('clears location and loan for wishlist items', () => {
    const out = normalizeItem(
      item({ status: 'wishlist', locationId: 'x', loan: { to: 'A', since: '2026-01-01' } }),
    );
    expect(out.locationId).toBeNull();
    expect(out.loan).toBeNull();
  });
  it('de-duplicates creators and tags', () => {
    const parsed = itemCreateSchema.parse({ type: 'book', title: 'X', tags: ['Jazz', 'jazz', ' Blues '] });
    expect(parsed.tags).toEqual(['Jazz', 'Blues']);
  });
});
