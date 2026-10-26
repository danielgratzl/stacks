import { cn } from '@/lib/utils';

export function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'bg-muted text-muted-foreground pointer-events-none hidden h-5 select-none items-center rounded border px-1.5 font-sans text-[11px] font-medium sm:inline-flex',
        className,
      )}
      {...props}
    />
  );
}
