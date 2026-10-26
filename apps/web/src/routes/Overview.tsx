import {
  groupSeries,
  locationPath,
  locationSubtree,
  locationTree,
  originalYearOf,
  type Item,
  type Location,
  type MediaType,
} from '@stacks/shared';
import { ChevronRight, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { CoverArt } from '@/components/CoverArt';
import { PageHeader } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { agoText, daysSince, plural, uniqueSorted } from '@/lib/format';
import { useHighlight } from '@/lib/highlight';
import { creatorsText, isWish, lentLabel, MEDIA } from '@/lib/media';
import { useItems, useLocations } from '@/lib/queries';
import { useSheet } from '@/lib/sheet';
import { cn } from '@/lib/utils';

function MediumPanel({ type, items, locations }: { type: MediaType; items: Item[]; locations: Location[] }) {
  const media = MEDIA[type];
  const sheet = useSheet();
  const list = items.filter((i) => i.type === type);
  const recent = [...list].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 3);
  const languages = uniqueSorted(list.map((i) => i.language));
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const lastMonth = list.filter((i) => i.addedAt > monthAgo).length;
  const tags = uniqueSorted(list.flatMap((i) => i.tags)).length;
  const lent = list.filter((i) => i.loan).length;
  const rooms = new Map<string, number>();
  for (const i of list) {
    const room = locationPath(locations, i.locationId)[0];
    if (room) rooms.set(room, (rooms.get(room) ?? 0) + 1);
  }
  const topRoom = [...rooms.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const decades = new Map<number, number>();
  for (const i of list) {
    const y = originalYearOf(i);
    if (y) decades.set(Math.floor(y / 10) * 10, (decades.get(Math.floor(y / 10) * 10) ?? 0) + 1);
  }
  const decadeList = [...decades.entries()].sort((a, b) => a[0] - b[0]);
  const decadeMax = Math.max(1, ...decadeList.map((d) => d[1]));
  const Icon = media.icon;
  const tone = type === 'book' ? 'text-book' : 'text-vinyl';
  const bar = type === 'book' ? 'bg-book/70' : 'bg-vinyl/70';

  return (
    <section className="bg-card rounded-xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={cn('flex items-center gap-2 text-sm font-medium', tone)}>
            <Icon className="size-4" />
            {media.label}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="tnum text-3xl font-semibold tracking-tight">{list.length}</span>
            <span className="text-muted-foreground text-sm">
              {list.length === 1 ? media.one : media.many}
            </span>
          </div>
        </div>
        <div className="relative h-[84px] w-[120px] shrink-0">
          {recent.length === 0 && (
            <button
              type="button"
              onClick={() => sheet.add(type)}
              aria-label={`Add a ${media.one}`}
              style={{ width: type === 'vinyl' ? 80 : 56, aspectRatio: type === 'vinyl' ? '1/1' : '2/3' }}
              className="border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground absolute right-0 top-0 grid place-items-center rounded-[4px] border border-dashed transition-colors"
            >
              <Plus className="size-4" />
            </button>
          )}
          {recent.map((it, i) => (
            <button
              key={it.id}
              type="button"
              onClick={() => sheet.open(it.id)}
              aria-label={it.title}
              className="absolute top-0 outline-none transition-transform duration-300 hover:z-10 hover:-translate-y-1"
              style={{
                right: i * 26,
                width: type === 'vinyl' ? 80 : 56,
                zIndex: 3 - i,
                transform: `rotate(${(i - 1) * 4}deg)`,
              }}
            >
              <CoverArt item={it} size="sm" />
            </button>
          ))}
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 border-t pt-4 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs">Last 30 days</dt>
          <dd className="tnum mt-0.5 font-medium">{lastMonth ? `+${lastMonth}` : '0'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Languages</dt>
          <dd className="mt-0.5 truncate font-medium" title={languages.join(', ')}>
            {languages.length
              ? languages.slice(0, 2).join(', ') + (languages.length > 2 ? ` +${languages.length - 2}` : '')
              : '–'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Mostly in</dt>
          <dd className="mt-0.5 truncate font-medium">{topRoom ?? '–'}</dd>
        </div>
      </dl>
      {decadeList.length > 1 && (
        <figure className="mt-4" aria-label="Items by decade of original release">
          <div className="flex h-10 items-end gap-1">
            {decadeList.map(([d, n]) => (
              <div
                key={d}
                title={`${d}s: ${n}`}
                className={cn('flex-1 rounded-t-sm transition-[height] duration-500', bar)}
                style={{ height: `${Math.max(12, (n / decadeMax) * 100)}%` }}
              />
            ))}
          </div>
          <figcaption className="text-muted-foreground tnum mt-1 flex justify-between text-[11px]">
            <span>{decadeList[0]![0]}s</span>
            <span>{decadeList.at(-1)![0]}s</span>
          </figcaption>
        </figure>
      )}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          {[tags ? plural(tags, 'tag') : null, lent ? `${lent} lent out` : null].filter(Boolean).join(', ')}
        </span>
        <Button variant="ghost" size="sm" className="-mr-2" asChild>
          <Link to={media.path}>
            Browse {media.label.toLowerCase()}
            <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function Shelf({ items }: { items: Item[] }) {
  const sheet = useSheet();
  const { id: highlight } = useHighlight();
  return (
    <div className="no-scrollbar -mx-5 overflow-x-auto px-5 sm:-mx-8 sm:px-8">
      <div className="flex w-max items-start">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => sheet.open(it.id)}
            className={cn(
              'group flex w-max flex-col text-left outline-none',
              highlight === it.id && 'just-added',
            )}
          >
            <div className="flex items-end px-3" style={{ height: 168 }}>
              <div className={it.type === 'vinyl' ? 'h-[156px] w-[156px]' : 'h-[160px] w-[107px]'}>
                <CoverArt item={it} className="h-full" />
              </div>
            </div>
            <div className="ledge h-2 w-full" />
            <div className="w-0 min-w-full px-3 pt-2.5">
              <div className="truncate text-[13px] font-medium">{it.title}</div>
              <div className="text-muted-foreground truncate text-xs">{creatorsText(it)}</div>
            </div>
          </button>
        ))}
        <div className="ledge mt-[168px] h-2 w-16 rounded-r-sm" />
      </div>
    </div>
  );
}

export function Overview() {
  const { data: allItems, isPending } = useItems();
  const { data: locations = [] } = useLocations();
  const sheet = useSheet();
  const items = useMemo(() => (allItems ?? []).filter((i) => !isWish(i)), [allItems]);

  if (isPending)
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-44 rounded-xl lg:col-span-2" />
      </div>
    );

  if (!items.length)
    return (
      <div className="anim-fade mx-auto mt-10 max-w-md text-center">
        <div className="relative mx-auto mb-8 flex h-28 w-48 items-end justify-center gap-2">
          <div className="border-input h-24 w-16 rounded-[2px_4px_4px_2px] border border-dashed" />
          <div className="border-input h-24 w-24 rounded-[3px] border border-dashed" />
          <div className="ledge absolute -bottom-2 left-0 right-0 h-2 rounded-sm" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Start your shelf</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Add the books and records you own. Covers, series and where each one lives are all optional, so you
          can catalogue quickly and fill in details later.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => sheet.add('book')}>
            <Plus />
            Add a book
          </Button>
          <Button variant="outline" onClick={() => sheet.add('vinyl')}>
            <Plus />
            Add a record
          </Button>
        </div>
        {!locations.length && (
          <p className="text-muted-foreground mt-6 text-[13px]">
            Tip:{' '}
            <Link to="/settings" className="text-foreground font-medium underline-offset-4 hover:underline">
              set up your rooms and shelves
            </Link>{' '}
            first, so you can say where things live as you go.
          </p>
        )}
      </div>
    );

  const recent = [...items].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 12);
  const lent = items.filter((i) => i.loan).sort((a, b) => a.loan!.since.localeCompare(b.loan!.since));
  const gaps = groupSeries(items)
    .filter((s) => s.missing.length)
    .slice(0, 4);
  const rooms = locationTree(locations)
    .filter((l) => l.depth === 0)
    .map((l) => {
      const ids = locationSubtree(locations, l.id);
      return { id: l.id, name: l.name, n: items.filter((i) => i.locationId && ids.has(i.locationId)).length };
    });
  const unplaced = items.filter((i) => !i.locationId).length;
  const roomMax = Math.max(1, unplaced, ...rooms.map((r) => r.n));

  return (
    <div className="anim-fade">
      <PageHeader title="Overview" subtitle={`${plural(items.length, 'item')} in your library`} />
      <div className="space-y-10">
        <div className="grid gap-4 lg:grid-cols-2">
          <MediumPanel type="book" items={items} locations={locations} />
          <MediumPanel type="vinyl" items={items} locations={locations} />
        </div>
        <section>
          <h2 className="mb-4 text-[15px] font-semibold">Recently added</h2>
          <Shelf items={recent} />
        </section>
        {lent.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Lent out</h2>
              <Button variant="ghost" size="sm" className="-mr-2" asChild>
                <Link to="/lent">All {lent.length}</Link>
              </Button>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {lent.slice(0, 4).map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => sheet.open(it.id)}
                    className="hover:bg-accent/50 flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors"
                  >
                    <div className="w-9 shrink-0">
                      <CoverArt item={it} size="sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{it.title}</div>
                      <div className="text-muted-foreground truncate text-xs">{lentLabel(it)}</div>
                    </div>
                    <span className="text-muted-foreground tnum shrink-0 text-xs">
                      {agoText(daysSince(it.loan!.since))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Where things are</h2>
              <Button variant="ghost" size="sm" className="-mr-2" asChild>
                <Link to="/settings">Edit locations</Link>
              </Button>
            </div>
            {rooms.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No locations yet.{' '}
                <Link
                  to="/settings"
                  className="text-foreground font-medium underline-offset-4 hover:underline"
                >
                  Set up rooms and shelves
                </Link>{' '}
                to see where everything lives.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {[...rooms, ...(unplaced ? [{ id: '_none', name: 'No location', n: unplaced }] : [])].map(
                  (r) => (
                    <li
                      key={r.id}
                      className="grid grid-cols-[minmax(0,140px)_1fr_32px] items-center gap-3 text-sm"
                    >
                      <span className={cn('truncate', r.id === '_none' && 'text-muted-foreground')}>
                        {r.name}
                      </span>
                      <span className="bg-muted h-1.5 overflow-hidden rounded-full">
                        <span
                          className="bg-foreground/70 block h-full rounded-full transition-[width] duration-700"
                          style={{ width: `${(r.n / roomMax) * 100}%` }}
                        />
                      </span>
                      <span className="text-muted-foreground tnum text-right">{r.n}</span>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Series with gaps</h2>
              <Button variant="ghost" size="sm" className="-mr-2" asChild>
                <Link to="/books/series">All series</Link>
              </Button>
            </div>
            {gaps.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Every series you’ve started is complete, as far as the numbers go.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {gaps.map((s) => (
                  <li key={s.name}>
                    <Link
                      to={`/books/series?focus=${encodeURIComponent(s.name)}`}
                      className="hover:bg-accent/60 flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                      <span className="text-muted-foreground text-xs">
                        Missing{' '}
                        {s.missing
                          .slice(0, 4)
                          .map((n) => `#${n}`)
                          .join(', ')}
                        {s.missing.length > 4 ? '…' : ''}
                      </span>
                      <ChevronRight className="text-muted-foreground size-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
