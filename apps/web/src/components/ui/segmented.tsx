import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label?: string;
  icon?: LucideIcon;
  ariaLabel?: string;
}

/** A segmented control with a sliding selection indicator. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <div
      role="tablist"
      className={cn('bg-muted relative inline-grid rounded-lg p-1 text-sm', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="bg-background ease-snappy dark:bg-input/60 absolute bottom-1 left-1 top-1 rounded-md shadow-sm transition-transform duration-300"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => {
        const Icon = o.icon;
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={o.ariaLabel ?? o.label}
            onClick={() => onChange(o.value)}
            className={cn(
              'focus-visible:ring-ring/50 relative z-[1] inline-flex h-7 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 font-medium outline-none transition-colors focus-visible:ring-[3px]',
              selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
