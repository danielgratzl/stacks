import { groupSeries, normalizeText, type Item } from '@stacks/shared';
import { ChevronDown, Heart, Layers, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CoverArt } from '@/components/CoverArt';
import { EmptyState } from '@/components/EmptyState';
import { ItemCard } from '@/components/ItemCard';
import { Input } from '@/components/ui/input';
import { plural, uniqueSorted } from '@/lib/format';
import { useSheet } from '@/lib/sheet';
import { cn } from '@/lib/utils';

const anchor = (name: string) => `series-${normalizeText(name).replace(/[^a-z0-9]+/g, '-')}`;

/** Series of owned books, in order, with gaps you can fill (or that are on the wishlist). */
export function SeriesList({
  owned,
  wishlist,
  focus,
}: {
  owned: Item[];
  wishlist: Item[];
  focus: string | null;
}) {
  const sheet = useSheet();
  const all = useMemo(() => groupSeries(owned), [owned]);
  const [open, setOpen] = useState(() => new Set(focus ? [normalizeText(focus)] : []));
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!focus) return;
    setOpen(new Set([normalizeText(focus)]));
    const t = setTimeout(
      () => document.getElementById(anchor(focus))?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      80,
    );
    return () => clearTimeout(t);
  }, [focus]);

  if (!all.length)
    return (
      <EmptyState icon={Layers} title="No series yet">
        Give a book a series name and number and it will be grouped here, with any gaps called out.
      </EmptyState>
    );

  const query = normalizeText(q);
  const list = all.filter(
    (s) =>
      !query ||
      normalizeText(s.name).includes(query) ||
      s.items.some((i) => normalizeText(i.creators.join(' ')).includes(query)),
  );
  const toggle = (key: string) =>
    setOpen((o) => {
      const next = new Set(o);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div>
      <div className="relative mb-5 max-w-sm">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          data-search
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search series or authors"
          className="pl-9"
        />
      </div>
      <ul className="divide-y rounded-xl border">
        {list.map((s) => {
          const key = normalizeText(s.name);
          const isOpen = open.has(key);
          const authors = uniqueSorted(s.items.flatMap((i) => i.creators));
          // Interleave owned books with numbered gaps.
          const slots: ({ item: Item } | { gap: number })[] = [];
          const have = new Set(s.items.map((i) => Math.floor(parseFloat(i.seriesNumber))));
          let next = 1;
          for (const item of s.items) {
            const n = Math.floor(parseFloat(item.seriesNumber));
            if (Number.isFinite(n)) {
              for (; next < n; next++) if (!have.has(next)) slots.push({ gap: next });
              next = Math.max(next, n + 1);
            }
            slots.push({ item });
          }
          return (
            <li key={key} id={anchor(s.name)} className="scroll-mt-24">
              <button
                type="button"
                onClick={() => toggle(key)}
                aria-expanded={isOpen}
                className="hover:bg-accent/40 flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors"
              >
                <div className="relative h-14 w-14 shrink-0">
                  {s.items.slice(0, 3).map((it, i) => (
                    <div
                      key={it.id}
                      className="absolute top-0 w-9 transition-transform duration-300"
                      style={{
                        left: i * 8,
                        zIndex: 3 - i,
                        transform: `rotate(${(i - 1) * (isOpen ? -3 : 3)}deg)`,
                      }}
                    >
                      <CoverArt item={it} size="sm" />
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.name}</div>
                  <div className="text-muted-foreground truncate text-sm">{authors.join(', ')}</div>
                </div>
                <div className="hidden text-right text-sm sm:block">
                  <div className="tnum">{plural(s.items.length, 'book')}</div>
                  <div className={cn('text-xs', s.missing.length ? 'text-muted-foreground' : 'text-book')}>
                    {s.missing.length
                      ? `Missing ${s.missing
                          .slice(0, 3)
                          .map((n) => `#${n}`)
                          .join(', ')}${s.missing.length > 3 ? '…' : ''}`
                      : 'No gaps'}
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    'text-muted-foreground size-4 transition-transform duration-300',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
              <div
                className="ease-snappy grid transition-[grid-template-rows] duration-300"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden" inert={!isOpen}>
                  <div
                    className="grid gap-x-4 gap-y-6 px-4 pb-5 pt-2"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))' }}
                  >
                    {slots.map((slot) => {
                      if ('item' in slot) return <ItemCard key={slot.item.id} item={slot.item} />;
                      const wished = wishlist.find(
                        (w) =>
                          w.type === 'book' &&
                          normalizeText(w.seriesName) === key &&
                          Math.floor(parseFloat(w.seriesNumber)) === slot.gap,
                      );
                      if (wished)
                        return (
                          <button
                            key={`wish-${slot.gap}`}
                            type="button"
                            onClick={() => sheet.open(wished.id)}
                            className="group text-left outline-none"
                          >
                            <div className="opacity-60 transition-opacity group-hover:opacity-100">
                              <CoverArt item={wished} />
                            </div>
                            <div className="mt-2.5 line-clamp-2 text-[13px] font-medium leading-snug">
                              {wished.title}
                            </div>
                            <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                              <Heart className="size-3" />
                              On your wishlist
                            </div>
                          </button>
                        );
                      return (
                        <button
                          key={`gap-${slot.gap}`}
                          type="button"
                          onClick={() =>
                            sheet.add('book', {
                              seriesName: s.name,
                              seriesNumber: String(slot.gap),
                              creator: authors[0],
                            })
                          }
                          className="group text-left outline-none"
                        >
                          <div
                            className="border-input text-muted-foreground group-hover:border-foreground/40 group-hover:text-foreground group-focus-visible:ring-ring grid place-items-center rounded-[2px_5px_5px_2px] border border-dashed transition-colors group-focus-visible:ring-2"
                            style={{ aspectRatio: '2 / 3' }}
                          >
                            <div className="text-center">
                              <div className="tnum text-lg font-semibold">#{slot.gap}</div>
                              <div className="mt-1 flex items-center gap-1 text-[11px]">
                                <Plus className="size-3" />
                                Add
                              </div>
                            </div>
                          </div>
                          <div className="text-muted-foreground mt-2.5 text-xs">Not in your library</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
