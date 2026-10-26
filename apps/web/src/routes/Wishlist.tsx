import { normalizeText, type MediaType } from '@stacks/shared';
import { Check, Heart, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { ItemCard } from '@/components/ItemCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { plural } from '@/lib/format';
import { useHighlight } from '@/lib/highlight';
import { creatorsText, isWish, MEDIA } from '@/lib/media';
import { toastError, useItems, useUpdateItem } from '@/lib/queries';
import { useSheet } from '@/lib/sheet';
import { cn } from '@/lib/utils';

export function Wishlist() {
  const { data = [] } = useItems();
  const items = data.filter(isWish);
  const sheet = useSheet();
  const update = useUpdateItem();
  const { flash } = useHighlight();
  const [q, setQ] = useState('');
  const words = normalizeText(q).split(/\s+/).filter(Boolean);
  const matches = (i: (typeof items)[number]) =>
    !words.length ||
    words.every((w) =>
      normalizeText(
        [i.title, i.subtitle, creatorsText(i), i.publisher, i.seriesName, i.tags.join(' '), i.notes].join(
          ' ',
        ),
      ).includes(w),
    );

  const acquire = (id: string, title: string) =>
    update.mutate(
      { id, patch: { status: 'owned' } },
      {
        onSuccess: () => {
          flash(id);
          toast.success(`“${title}” moved to your collection`, {
            action: { label: 'Undo', onClick: () => update.mutate({ id, patch: { status: 'wishlist' } }) },
          });
        },
        onError: toastError('Couldn’t move that'),
      },
    );

  const books = items.filter((i) => i.type === 'book').length;
  const add = (type: MediaType) => sheet.add(type, { wishlist: true });

  if (!items.length)
    return (
      <div className="anim-fade">
        <PageHeader title="Wishlist" />
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          actions={
            <>
              <Button onClick={() => add('book')}>
                <Plus />
                Wish for a book
              </Button>
              <Button variant="outline" onClick={() => add('vinyl')}>
                <Plus />
                Wish for a record
              </Button>
            </>
          }
        >
          Keep track of books and records you want. They stay out of your collection until you get them.
        </EmptyState>
      </div>
    );

  return (
    <div className="anim-fade">
      <PageHeader
        title="Wishlist"
        subtitle={`${plural(books, 'book')} and ${plural(items.length - books, 'record')}`}
      />
      <div className="space-y-10">
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            data-search
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search wishlist"
            className="pl-9"
          />
        </div>
        {(['book', 'vinyl'] as const).map((type) => {
          const media = MEDIA[type];
          const all = items.filter((i) => i.type === type);
          const list = all.filter(matches).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
          return (
            <section key={type}>
              <div className="mb-4 flex items-center gap-2">
                <h2
                  className={cn(
                    'flex items-center gap-2 text-[15px] font-semibold',
                    type === 'book' ? 'text-book' : 'text-vinyl',
                  )}
                >
                  <media.icon className="size-4" />
                  {media.label}
                </h2>
                <span className="text-muted-foreground tnum text-sm">{all.length}</span>
                <Button variant="ghost" size="sm" className="-mr-2 ml-auto" onClick={() => add(type)}>
                  <Plus />
                  Add
                </Button>
              </div>
              {list.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
                  {all.length
                    ? `No ${media.label.toLowerCase()} match “${q}”.`
                    : `No ${media.label.toLowerCase()} on your wishlist yet.`}
                </p>
              ) : (
                <div
                  className="grid gap-x-5 gap-y-7"
                  style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${type === 'vinyl' ? 150 : 128}px, 1fr))`,
                  }}
                >
                  {list.map((it) => (
                    <div key={it.id} className="group/wish relative">
                      <ItemCard item={it} />
                      <button
                        type="button"
                        onClick={() => acquire(it.id, it.title)}
                        aria-label={`Move ${it.title} to your collection`}
                        className="bg-background/95 focus-visible:ring-ring absolute left-2 top-2 z-10 inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium shadow-md outline-none ring-1 ring-black/5 transition-all duration-200 hover:scale-105 focus-visible:opacity-100 focus-visible:ring-2 md:opacity-0 md:group-hover/wish:opacity-100"
                      >
                        <Check className="size-3.5" strokeWidth={2.4} />
                        Got it
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
