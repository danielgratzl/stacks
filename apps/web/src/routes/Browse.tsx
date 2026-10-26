import {
  locationPath,
  locationSubtree,
  normalizeText,
  originalYearOf,
  type Item,
  type MediaType,
} from '@stacks/shared';
import { ArrowUpRight, Globe, LayoutGrid, List, MapPin, Plus, Search, Tag, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { ItemCard, ItemRow, ROW_GRID } from '@/components/ItemCard';
import { LocationSelect } from '@/components/LocationSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { NativeSelect } from '@/components/ui/native-select';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { uniqueSorted } from '@/lib/format';
import { creatorsText, MEDIA } from '@/lib/media';
import { useLocations } from '@/lib/queries';
import { useSheet } from '@/lib/sheet';
import { cn } from '@/lib/utils';

type View = 'grid' | 'list';
const VIEW_KEY = 'stacks-browse-view';
const readView = (): View => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
};

const SORTS = {
  recent: (a: Item, b: Item) => b.addedAt.localeCompare(a.addedAt),
  title: (a: Item, b: Item) => a.title.localeCompare(b.title),
  creator: (a: Item, b: Item) =>
    creatorsText(a).localeCompare(creatorsText(b)) || a.title.localeCompare(b.title),
  year: (a: Item, b: Item) => (originalYearOf(a) ?? 9999) - (originalYearOf(b) ?? 9999),
};
type SortKey = keyof typeof SORTS;

/** Search, filter and sort for one medium. Filters live in the URL so they survive navigation. */
export function Browse({ type, items, loading }: { type: MediaType; items: Item[]; loading: boolean }) {
  const media = MEDIA[type];
  const sheet = useSheet();
  const { data: locations = [] } = useLocations();
  const [params, setParams] = useSearchParams();
  const [view, setViewState] = useState<View>(readView);
  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // ignore
    }
  };

  const q = params.get('q') ?? '';
  const loc = params.get('loc') ?? '';
  const lang = params.get('lang') ?? '';
  const tag = params.get('tag') ?? '';
  const avail = params.get('avail') ?? '';
  const sort = (params.get('sort') as SortKey) in SORTS ? (params.get('sort') as SortKey) : 'recent';
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const clearAll = () => {
    const next = new URLSearchParams(params);
    ['q', 'loc', 'lang', 'tag', 'avail'].forEach((k) => next.delete(k));
    setParams(next, { replace: true });
  };

  const pool = useMemo(() => items.filter((i) => i.type === type), [items, type]);
  const languages = uniqueSorted(pool.map((i) => i.language));
  const tags = uniqueSorted(pool.flatMap((i) => i.tags));
  const anyLent = pool.some((i) => i.loan);

  const results = useMemo(() => {
    const words = normalizeText(q).split(/\s+/).filter(Boolean);
    const inLocation = loc ? locationSubtree(locations, loc) : null;
    return pool
      .filter((i) => {
        if (inLocation && !(i.locationId && inLocation.has(i.locationId))) return false;
        if (lang && i.language !== lang) return false;
        if (tag && !i.tags.includes(tag)) return false;
        if (avail === 'lent' && !i.loan) return false;
        if (avail === 'shelf' && i.loan) return false;
        if (!words.length) return true;
        const hay = normalizeText(
          [
            i.title,
            i.subtitle,
            creatorsText(i),
            i.publisher,
            i.originalYear,
            i.editionYear,
            i.seriesName,
            i.barcode,
            i.tags.join(' '),
            i.notes,
            i.language,
            i.loan?.to,
          ].join(' '),
        );
        return words.every((w) => hay.includes(w));
      })
      .sort(SORTS[sort]);
  }, [pool, q, loc, lang, tag, avail, sort, locations]);

  const active = [
    loc && { key: 'loc', label: locationPath(locations, loc).join(' › '), icon: MapPin },
    lang && { key: 'lang', label: lang, icon: Globe },
    tag && { key: 'tag', label: tag, icon: Tag },
    avail && { key: 'avail', label: avail === 'lent' ? 'Lent out' : 'On the shelf', icon: ArrowUpRight },
  ].filter(Boolean) as { key: string; label: string; icon: typeof Tag }[];

  if (loading)
    return (
      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))' }}>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} style={{ aspectRatio: type === 'vinyl' ? '1/1' : '2/3' }} />
        ))}
      </div>
    );

  if (!pool.length)
    return (
      <EmptyState
        icon={media.icon}
        title={`No ${media.label.toLowerCase()} yet`}
        actions={
          <Button onClick={() => sheet.add(type)}>
            <Plus />
            Add a {media.one}
          </Button>
        }
      >
        Add your first {media.one} and it will show up here.
      </EmptyState>
    );

  return (
    <div>
      <div className="bg-background/90 sticky top-0 z-20 -mx-5 px-5 pb-3 pt-1 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              data-search
              type="search"
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder={`Search ${media.label.toLowerCase()}`}
              className="pl-9 pr-10"
              aria-label={`Search ${media.label.toLowerCase()}`}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setParam('q', '');
                  e.currentTarget.blur();
                }
              }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2">
              <Kbd>/</Kbd>
            </span>
          </div>
          <LocationSelect
            aria-label="Location"
            className="min-w-[140px] flex-1 sm:w-[170px] sm:flex-none"
            value={loc || null}
            onChange={(v) => setParam('loc', v ?? '')}
            locations={locations}
            placeholder="All locations"
          />
          {languages.length > 0 && (
            <NativeSelect
              aria-label="Language"
              className="min-w-[140px] flex-1 sm:w-[150px] sm:flex-none"
              value={lang}
              onChange={(e) => setParam('lang', e.target.value)}
            >
              <option value="">All languages</option>
              {languages.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </NativeSelect>
          )}
          {tags.length > 0 && (
            <NativeSelect
              aria-label="Tag"
              className="min-w-[140px] flex-1 sm:w-[130px] sm:flex-none"
              value={tag}
              onChange={(e) => setParam('tag', e.target.value)}
            >
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </NativeSelect>
          )}
          {anyLent && (
            <NativeSelect
              aria-label="Status"
              className="min-w-[140px] flex-1 sm:w-[140px] sm:flex-none"
              value={avail}
              onChange={(e) => setParam('avail', e.target.value)}
            >
              <option value="">Any status</option>
              <option value="shelf">On the shelf</option>
              <option value="lent">Lent out</option>
            </NativeSelect>
          )}
          <NativeSelect
            aria-label="Sort"
            className="min-w-[140px] flex-1 sm:w-[160px] sm:flex-none"
            value={sort}
            onChange={(e) => setParam('sort', e.target.value === 'recent' ? '' : e.target.value)}
          >
            <option value="recent">Recently added</option>
            <option value="title">Title</option>
            <option value="creator">{media.creator}</option>
            <option value="year">Original year</option>
          </NativeSelect>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'grid', icon: LayoutGrid, ariaLabel: 'Grid view' },
              { value: 'list', icon: List, ariaLabel: 'List view' },
            ]}
          />
        </div>
        {(active.length > 0 || q) && (
          <div className="anim-fade mt-3 flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-muted-foreground tnum mr-1">
              {results.length} of {pool.length}
            </span>
            {active.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setParam(a.key, '')}
                className="anim-pop bg-background hover:bg-accent inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-2.5 pr-1.5 text-xs font-medium transition-colors"
              >
                <a.icon className="text-muted-foreground size-3" />
                {a.label}
                <X className="text-muted-foreground size-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="text-muted-foreground hover:text-foreground ml-1 text-xs underline-offset-4 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {results.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm font-medium">No {media.label.toLowerCase()} match these filters</p>
          <p className="text-muted-foreground mt-1 text-sm">Try fewer words or remove a filter.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={clearAll}>
            Clear filters
          </Button>
        </div>
      ) : view === 'grid' ? (
        <div
          className="mt-4 grid gap-x-5 gap-y-7"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${type === 'vinyl' ? 150 : 128}px, 1fr))` }}
        >
          {results.map((it) => (
            <ItemCard key={it.id} item={it} />
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <div
            className={cn('text-muted-foreground hidden gap-4 border-b px-2 pb-2 text-xs md:grid', ROW_GRID)}
          >
            <span />
            <span>Title</span>
            <span>{media.creator}</span>
            <span>Year</span>
            <span>Location</span>
            <span>Language</span>
          </div>
          <div className="mt-1 space-y-0.5">
            {results.map((it) => (
              <ItemRow key={it.id} item={it} locations={locations} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
