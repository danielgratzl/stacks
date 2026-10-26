import type { Item, Location } from './schemas';

/** The year an item is "from": the original release, falling back to the edition. */
export const originalYearOf = (item: Pick<Item, 'originalYear' | 'editionYear'>): number | null =>
  item.originalYear ?? item.editionYear ?? null;

export const normalizeText = (s: string | null | undefined): string =>
  (s ?? '')
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Ids of a location and every location nested below it. */
export function locationSubtree(locations: Location[], id: string): Set<string> {
  const ids = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const l of locations) {
      if (l.parentId && ids.has(l.parentId) && !ids.has(l.id)) {
        ids.add(l.id);
        changed = true;
      }
    }
  }
  return ids;
}

/** Names from the root to the given location. */
export function locationPath(locations: Location[], id: string | null): string[] {
  if (!id) return [];
  const byId = new Map(locations.map((l) => [l.id, l]));
  const parts: string[] = [];
  let current = byId.get(id);
  let guard = 0;
  while (current && guard++ < 64) {
    parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return parts;
}

export interface LocationNode extends Location {
  depth: number;
}

/** Depth-first, position-ordered flattening of the location hierarchy. */
export function locationTree(locations: Location[]): LocationNode[] {
  const children = new Map<string, Location[]>();
  for (const l of locations) {
    const key = l.parentId ?? '';
    const list = children.get(key) ?? [];
    list.push(l);
    children.set(key, list);
  }
  for (const list of children.values())
    list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const out: LocationNode[] = [];
  const seen = new Set<string>();
  const walk = (parent: string, depth: number) => {
    for (const l of children.get(parent) ?? []) {
      if (seen.has(l.id)) continue;
      seen.add(l.id);
      out.push({ ...l, depth });
      walk(l.id, depth + 1);
    }
  };
  walk('', 0);
  return out;
}

export interface Series {
  name: string;
  items: Item[];
  /** Whole numbers below the highest owned number that aren't owned. */
  missing: number[];
}

export function groupSeries(items: Item[]): Series[] {
  const groups = new Map<string, { name: string; items: Item[] }>();
  for (const item of items) {
    if (item.type !== 'book' || !item.seriesName.trim()) continue;
    const key = normalizeText(item.seriesName.trim());
    const group = groups.get(key) ?? { name: item.seriesName.trim(), items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => {
      const numbers = group.items.map((i) => parseFloat(i.seriesNumber)).filter(Number.isFinite);
      const max = numbers.length ? Math.floor(Math.max(...numbers)) : 0;
      const have = new Set(numbers.map(Math.floor));
      const missing: number[] = [];
      for (let n = 1; n <= max; n++) if (!have.has(n)) missing.push(n);
      const sorted = [...group.items].sort(
        (a, b) =>
          (parseFloat(a.seriesNumber) || Infinity) - (parseFloat(b.seriesNumber) || Infinity) ||
          a.title.localeCompare(b.title),
      );
      return { name: group.name, items: sorted, missing };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
