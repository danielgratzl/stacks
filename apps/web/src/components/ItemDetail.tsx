import { locationPath, type Item, type Loan, type Location } from '@stacks/shared';
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  FileText,
  Heart,
  Layers,
  Pencil,
  Tag,
  Trash2,
  Undo2,
  User,
} from 'lucide-react';
import { Fragment, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { agoText, daysSince, formatDate, formatDay, todayISO } from '@/lib/format';
import { creatorsText, isWish, lentLabel, MEDIA } from '@/lib/media';
import { CoverArt } from './CoverArt';

function LendForm({
  noun,
  borrowers,
  onSave,
  onCancel,
}: {
  noun: string;
  borrowers: string[];
  onSave: (loan: Loan) => void;
  onCancel: () => void;
}) {
  const [to, setTo] = useState('');
  const [since, setSince] = useState(todayISO());
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ to: to.trim(), since: since || todayISO() });
      }}
      className="anim-pop bg-muted/40 mb-6 rounded-lg border p-4"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <ArrowUpRight className="size-4" />
        Lend this {noun}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
        <div>
          <Label htmlFor="lend-to" optional>
            Lent to
          </Label>
          <Input
            id="lend-to"
            autoFocus
            list="dl-borrowers"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Who has it?"
            autoComplete="off"
          />
        </div>
        <div>
          <Label htmlFor="lend-since">Since</Label>
          <Input
            id="lend-since"
            type="date"
            className="tnum"
            value={since}
            max={todayISO()}
            onChange={(e) => setSince(e.target.value)}
          />
        </div>
      </div>
      <datalist id="dl-borrowers">
        {borrowers.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Mark as lent
        </Button>
      </div>
    </form>
  );
}

export function ItemDetail({
  item,
  locations,
  borrowers,
  onEdit,
  onDelete,
  onSeries,
  onLend,
  onReturn,
  onAcquire,
}: {
  item: Item;
  locations: Location[];
  borrowers: string[];
  onEdit: () => void;
  onDelete: () => void;
  onSeries: (name: string) => void;
  onLend: (loan: Loan) => void;
  onReturn: () => void;
  onAcquire: () => void;
}) {
  const media = MEDIA[item.type];
  const wish = isWish(item);
  const [lending, setLending] = useState(false);
  const path = wish ? [] : locationPath(locations, item.locationId);
  const rows: [string, React.ReactNode][] = [
    [media.publisher, item.publisher],
    ['Original year', item.originalYear],
    ['Edition year', item.editionYear],
    ['Language', item.language],
    [
      'Location',
      path.length ? (
        <span className="inline-flex flex-wrap items-center gap-1">
          {path.map((p, i) => (
            <Fragment key={i}>
              {i > 0 && <ChevronRight className="text-muted-foreground size-3" />}
              <span>{p}</span>
            </Fragment>
          ))}
        </span>
      ) : null,
    ],
    [
      item.type === 'book' ? 'ISBN or barcode' : 'Barcode',
      item.barcode ? <span className="tnum">{item.barcode}</span> : null,
    ],
    [wish ? 'On wishlist since' : 'Added', formatDate(item.addedAt)],
  ];
  const Icon = media.icon;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-5 pb-10 pt-6 sm:px-6">
        {item.loan && !wish && (
          <div className="anim-pop bg-muted/50 mb-6 flex items-center gap-3 rounded-lg border p-3 pl-4">
            <span className="bg-background grid size-8 shrink-0 place-items-center rounded-full shadow-sm">
              {item.loan.to ? <User className="size-4" /> : <ArrowUpRight className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{lentLabel(item)}</div>
              <div className="text-muted-foreground text-xs">
                Since {formatDay(item.loan.since)}, {agoText(daysSince(item.loan.since))}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={onReturn}>
              <Undo2 className="size-3.5" />
              Returned
            </Button>
          </div>
        )}
        {lending && (
          <LendForm
            noun={media.one}
            borrowers={borrowers}
            onCancel={() => setLending(false)}
            onSave={(loan) => {
              setLending(false);
              onLend(loan);
            }}
          />
        )}

        <div className="grid gap-6 sm:grid-cols-[170px_1fr]">
          <div
            className={
              item.type === 'vinyl'
                ? 'mx-auto w-full max-w-[150px] pr-8 sm:max-w-none'
                : 'mx-auto w-full max-w-[150px] sm:max-w-none'
            }
          >
            <CoverArt item={item} size="lg" peek="always" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={item.type}>
                <Icon />
                {item.type === 'book' ? 'Book' : 'Vinyl'}
              </Badge>
              {wish && (
                <Badge variant="outline">
                  <Heart />
                  Wishlist
                </Badge>
              )}
            </div>
            <h2 className="mt-3 text-balance text-2xl font-semibold leading-tight tracking-tight">
              {item.title}
            </h2>
            {item.subtitle && <p className="text-muted-foreground mt-1 text-[15px]">{item.subtitle}</p>}
            {item.creators.length > 0 && <p className="mt-3 text-[15px]">{creatorsText(item)}</p>}
            {item.type === 'book' && item.seriesName && (
              <button
                type="button"
                onClick={() => onSeries(item.seriesName)}
                className="hover:bg-accent mt-3 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] transition-colors"
              >
                <Layers className="text-muted-foreground size-3.5" />
                {item.seriesName}
                {item.seriesNumber && (
                  <span className="text-muted-foreground tnum">#{item.seriesNumber}</span>
                )}
                <ChevronRight className="text-muted-foreground size-3.5" />
              </button>
            )}
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-[minmax(110px,auto)_1fr] gap-x-6 gap-y-3 border-t pt-6 text-sm">
          {rows
            .filter(([, v]) => v !== null && v !== '' && v !== undefined)
            .map(([k, v]) => (
              <Fragment key={k}>
                <dt className="text-muted-foreground">{k}</dt>
                <dd>{v}</dd>
              </Fragment>
            ))}
        </dl>
        {item.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <Badge key={t}>
                <Tag className="opacity-60" />
                {t}
              </Badge>
            ))}
          </div>
        )}
        {item.notes && (
          <div className="bg-muted/60 mt-6 whitespace-pre-wrap rounded-lg p-4 text-sm leading-relaxed">
            {item.notes}
          </div>
        )}
        {!item.notes && !item.tags.length && (
          <button
            type="button"
            onClick={onEdit}
            className="border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground mt-6 flex w-full items-center gap-2 rounded-lg border border-dashed p-4 text-left text-sm transition-colors"
          >
            <FileText className="size-4" />
            Add tags, a subtitle or notes
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-t px-5 py-3 sm:px-6">
        <Button variant="quiet" onClick={onDelete}>
          <Trash2 />
          <span className="hidden sm:inline">Delete</span>
        </Button>
        <div className="ml-auto flex gap-2">
          {wish ? (
            <>
              <Button variant="outline" onClick={onEdit}>
                <Pencil />
                Edit
              </Button>
              <Button onClick={onAcquire}>
                <Check />
                Got it, add to collection
              </Button>
            </>
          ) : (
            <>
              {!item.loan && !lending && (
                <Button variant="outline" onClick={() => setLending(true)}>
                  <ArrowUpRight />
                  Lend
                </Button>
              )}
              <Button onClick={onEdit}>
                <Pencil />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
