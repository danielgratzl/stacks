import { locationPath, originalYearOf, type Item, type Location } from '@stacks/shared';
import { ArrowUpRight } from 'lucide-react';
import { useHighlight } from '@/lib/highlight';
import { creatorsText, isWish, lentLabel } from '@/lib/media';
import { useSheet } from '@/lib/sheet';
import { cn } from '@/lib/utils';
import { CoverArt } from './CoverArt';

export function ItemCard({ item, className }: { item: Item; className?: string }) {
  const { open } = useSheet();
  const { id } = useHighlight();
  return (
    <button
      type="button"
      onClick={() => open(item.id)}
      className={cn(
        'group block w-full min-w-0 rounded-md text-left outline-none',
        id === item.id && 'just-added',
        className,
      )}
    >
      <CoverArt item={item} />
      <div className="mt-2.5 pr-1">
        <div className="line-clamp-2 text-[13px] font-medium leading-snug">{item.title}</div>
        <div className="text-muted-foreground mt-0.5 truncate text-xs">
          {creatorsText(item) || originalYearOf(item)}
        </div>
        {item.loan && !isWish(item) && (
          <div className="text-foreground/80 mt-1 flex items-center gap-1 truncate text-xs font-medium">
            <ArrowUpRight className="size-3" />
            <span className="truncate">{lentLabel(item)}</span>
          </div>
        )}
      </div>
    </button>
  );
}

export const ROW_GRID = 'md:grid-cols-[40px_minmax(0,2fr)_minmax(0,1.3fr)_64px_minmax(0,1.4fr)_96px]';

export function ItemRow({ item, locations }: { item: Item; locations: Location[] }) {
  const { open } = useSheet();
  const { id } = useHighlight();
  const year = originalYearOf(item);
  return (
    <button
      type="button"
      onClick={() => open(item.id)}
      className={cn(
        'hover:bg-accent/70 focus-visible:ring-ring/50 group grid w-full grid-cols-[40px_1fr_auto] items-center gap-4 rounded-md px-2 py-2 text-left outline-none transition-colors focus-visible:ring-[3px]',
        ROW_GRID,
        id === item.id && 'just-added',
      )}
    >
      <div className="w-10">
        <CoverArt item={item} size="sm" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">
          {item.title}
          {item.seriesName && (
            <span className="text-muted-foreground tnum ml-2 text-xs font-normal">
              {item.seriesName} #{item.seriesNumber || '?'}
            </span>
          )}
        </div>
        <div className="text-muted-foreground truncate text-xs md:hidden">
          {[creatorsText(item), year].filter(Boolean).join(', ')}
        </div>
        {item.subtitle && !item.loan && (
          <div className="text-muted-foreground hidden truncate text-xs md:block">{item.subtitle}</div>
        )}
        {item.loan && (
          <div className="bg-muted mt-0.5 inline-flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium">
            <ArrowUpRight className="size-3" />
            {lentLabel(item)}
          </div>
        )}
      </div>
      <div className="text-muted-foreground hidden truncate text-sm md:block">{creatorsText(item)}</div>
      <div className="text-muted-foreground tnum hidden text-sm md:block">
        {year}
        {item.originalYear && item.editionYear && item.editionYear !== item.originalYear && (
          <span className="block text-[11px] opacity-70" title="Edition year">
            ed. {item.editionYear}
          </span>
        )}
      </div>
      <div className="text-muted-foreground hidden truncate text-sm md:block">
        {locationPath(locations, item.locationId).join(' › ')}
      </div>
      <div className="text-muted-foreground truncate text-right text-xs md:text-left md:text-sm">
        {item.language}
      </div>
    </button>
  );
}
