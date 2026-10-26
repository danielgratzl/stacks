import type { Item } from '@stacks/shared';
import { ArrowUpRight, Heart } from 'lucide-react';
import { coverUrl } from '@/lib/api';
import { creatorsText, isWish } from '@/lib/media';
import { cn } from '@/lib/utils';

const SWATCH = [
  '#2f4a3a',
  '#5b3a29',
  '#2b3d5b',
  '#6b4f1d',
  '#4a2f4f',
  '#1f4f4f',
  '#7a3b3b',
  '#3a3a40',
  '#4f5f2a',
  '#8a5a2b',
  '#2e5560',
  '#5a2e3f',
];
const hash = (s: string) => {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
};

type CoverItem = Pick<Item, 'type' | 'title' | 'creators' | 'cover' | 'status' | 'loan' | 'seriesNumber'>;
type Size = 'sm' | 'md' | 'lg';

/** A typographic stand-in for items without a cover image. */
function GeneratedCover({ item, size }: { item: CoverItem; size: Size }) {
  const bg = SWATCH[hash(item.title + creatorsText(item)) % SWATCH.length];
  const initial = (
    <div className="grid h-full place-items-center text-[13px] font-semibold">{item.title.slice(0, 1)}</div>
  );
  if (item.type === 'vinyl') {
    return (
      <div className="relative h-full w-full overflow-hidden text-[#f4f1ea]" style={{ background: bg }}>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'repeating-radial-gradient(circle at 78% 22%, rgb(255 255 255 / .22) 0 1px, transparent 1px 9px)',
          }}
        />
        {size === 'sm' ? (
          <div className="absolute inset-0">{initial}</div>
        ) : (
          <div className="absolute inset-x-0 bottom-0 p-[8%]">
            <div
              className={cn(
                'line-clamp-3 text-balance font-semibold leading-tight',
                size === 'lg' ? 'text-xl' : 'text-[13px]',
              )}
            >
              {item.title}
            </div>
            <div className={cn('mt-1 truncate opacity-75', size === 'lg' ? 'text-sm' : 'text-[11px]')}>
              {creatorsText(item)}
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div
      className="book-spine relative flex h-full w-full flex-col justify-between overflow-hidden text-[#f4f1ea]"
      style={{ background: bg, padding: size === 'sm' ? 0 : '12% 10% 10% 16%' }}
    >
      {size === 'sm' ? (
        initial
      ) : (
        <>
          <div
            className={cn(
              'line-clamp-5 text-balance font-semibold leading-[1.15]',
              size === 'lg' ? 'text-xl' : 'text-[13px]',
            )}
          >
            {item.title}
          </div>
          <div>
            <div className="mb-2 h-px w-6 bg-current opacity-40" />
            <div className={cn('line-clamp-2 opacity-80', size === 'lg' ? 'text-sm' : 'text-[11px]')}>
              {creatorsText(item)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * A book or record cover. Records sit in a sleeve and slide out on hover
 * (or permanently, with peek="always").
 */
export function CoverArt({
  item,
  size = 'md',
  peek = 'hover',
  className,
}: {
  item: CoverItem;
  size?: Size;
  peek?: 'hover' | 'always' | 'never';
  className?: string;
}) {
  const vinyl = item.type === 'vinyl';
  const label = SWATCH[(hash(item.title) + 3) % SWATCH.length];
  return (
    <div className={cn('relative', className)} style={{ aspectRatio: vinyl ? '1 / 1' : '2 / 3' }}>
      {vinyl && size !== 'sm' && peek !== 'never' && (
        <div
          className={cn(
            'record ease-snappy absolute inset-[3%] rounded-full transition-transform duration-500',
            peek === 'always'
              ? 'translate-x-[22%]'
              : 'group-hover:translate-x-[18%] group-focus-visible:translate-x-[18%]',
          )}
        >
          <div className="record-label" style={{ background: label }} />
        </div>
      )}
      <div
        className={cn(
          'cover-frame bg-muted ease-snappy relative h-full w-full overflow-hidden ring-1 ring-black/5 transition-[transform,box-shadow] duration-300 dark:ring-white/10',
          vinyl
            ? 'rounded-[3px] shadow-[0_1px_2px_rgb(0_0_0/.2),0_6px_14px_-8px_rgb(0_0_0/.4)]'
            : 'book-spine rounded-[2px_5px_5px_2px] shadow-[0_1px_2px_rgb(0_0_0/.2),0_8px_16px_-10px_rgb(0_0_0/.45)]',
          size !== 'sm' &&
            !vinyl &&
            peek === 'hover' &&
            'group-hover:-translate-y-1.5 group-hover:shadow-[0_2px_4px_rgb(0_0_0/.2),0_16px_24px_-12px_rgb(0_0_0/.5)]',
          'group-focus-visible:ring-ring group-focus-visible:ring-2',
        )}
      >
        {item.cover ? (
          <img
            src={coverUrl(item.cover)}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : (
          <GeneratedCover item={item} size={size} />
        )}
        {size !== 'sm' && item.loan && !isWish(item) && (
          <span className="anim-pop absolute bottom-1.5 left-1.5 z-[3] inline-flex items-center gap-1 rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-900 shadow-sm">
            <ArrowUpRight className="size-3" strokeWidth={2.4} />
            Lent
          </span>
        )}
        {size !== 'sm' && isWish(item) && (
          <span className="text-vinyl absolute bottom-1.5 left-1.5 z-[3] grid size-5 place-items-center rounded-full bg-white/95 shadow-sm">
            <Heart className="size-3 fill-current" />
          </span>
        )}
        {size !== 'sm' && item.type === 'book' && item.seriesNumber && (
          <span className="tnum absolute right-1.5 top-1.5 z-[3] rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            #{item.seriesNumber}
          </span>
        )}
      </div>
    </div>
  );
}
