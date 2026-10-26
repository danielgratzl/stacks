import type { Item, MediaType } from '@stacks/shared';
import { ArrowUpRight, BookOpen, Disc3, Undo2, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/AppShell';
import { CoverArt } from '@/components/CoverArt';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { agoText, daysSince, formatDay } from '@/lib/format';
import { creatorsText, isWish } from '@/lib/media';
import { toastError, useItems, useUpdateItem } from '@/lib/queries';
import { useSheet } from '@/lib/sheet';
import { cn } from '@/lib/utils';

const NOT_NOTED = 'Not noted';

export function Lent() {
  const { data = [] } = useItems();
  const sheet = useSheet();
  const update = useUpdateItem();
  const [type, setType] = useState<'all' | MediaType>('all');
  const [group, setGroup] = useState<'date' | 'person'>('date');
  const allLent = data.filter((i) => !isWish(i) && i.loan);
  const lent = allLent
    .filter((i) => type === 'all' || i.type === type)
    .sort((a, b) => a.loan!.since.localeCompare(b.loan!.since));

  const returned = (item: Item) =>
    update.mutate(
      { id: item.id, patch: { loan: null } },
      {
        onSuccess: () =>
          toast.success(`“${item.title}” is back`, {
            action: {
              label: 'Undo',
              onClick: () => update.mutate({ id: item.id, patch: { loan: item.loan } }),
            },
          }),
        onError: toastError('Couldn’t save that'),
      },
    );

  if (!allLent.length)
    return (
      <div className="anim-fade">
        <PageHeader title="Lent out" />
        <EmptyState icon={ArrowUpRight} title="Nothing lent out">
          Open any book or record and choose Lend to keep track of who has it.
        </EmptyState>
      </div>
    );

  const groups: [string | null, Item[]][] =
    group === 'person'
      ? [
          ...lent
            .reduce((m, i) => {
              const k = i.loan!.to.trim() || NOT_NOTED;
              m.set(k, [...(m.get(k) ?? []), i]);
              return m;
            }, new Map<string, Item[]>())
            .entries(),
        ].sort((a, b) => (a[0] === NOT_NOTED ? 1 : b[0] === NOT_NOTED ? -1 : a[0].localeCompare(b[0])))
      : [[null, lent]];

  return (
    <div className="anim-fade">
      <PageHeader title="Lent out" subtitle={`${allLent.length} out right now`} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: 'All' },
            { value: 'book', label: 'Books', icon: BookOpen },
            { value: 'vinyl', label: 'Vinyl', icon: Disc3 },
          ]}
        />
        <Segmented
          className="ml-auto"
          value={group}
          onChange={setGroup}
          options={[
            { value: 'date', label: 'By date' },
            { value: 'person', label: 'By person' },
          ]}
        />
      </div>
      {lent.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No {type === 'book' ? 'books' : 'records'} lent out right now.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map(([name, list]) => (
            <section key={name ?? 'all'}>
              {name && (
                <h2 className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <User className="text-muted-foreground size-3.5" />
                  {name}
                  <span className="text-muted-foreground tnum font-normal">{list.length}</span>
                </h2>
              )}
              <ul className="divide-y rounded-xl border">
                {list.map((it) => {
                  const days = daysSince(it.loan!.since);
                  return (
                    <li key={it.id} className="anim-fade flex items-center gap-3 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => sheet.open(it.id)}
                        className="focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-[3px]"
                      >
                        <div className="w-10 shrink-0">
                          <CoverArt item={it} size="sm" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{it.title}</div>
                          <div className="text-muted-foreground truncate text-xs">
                            {group === 'person'
                              ? creatorsText(it)
                              : it.loan!.to
                                ? `With ${it.loan!.to}`
                                : 'Borrower not noted'}
                          </div>
                        </div>
                        <div className="hidden shrink-0 text-right sm:block">
                          <div className="tnum text-sm">{formatDay(it.loan!.since)}</div>
                          <div
                            className={cn(
                              'tnum text-xs',
                              days > 60 ? 'text-vinyl font-medium' : 'text-muted-foreground',
                            )}
                          >
                            {agoText(days)}
                          </div>
                        </div>
                      </button>
                      <Button size="sm" variant="outline" onClick={() => returned(it)}>
                        <Undo2 className="size-3.5" />
                        Returned
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
