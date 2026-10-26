import { Label as LabelPrimitive } from 'radix-ui';
import * as React from 'react';
import { cn } from '@/lib/utils';

export function Label({
  className,
  optional,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { optional?: boolean }) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'mb-1.5 flex select-none items-baseline gap-1.5 text-[13px] font-medium leading-none',
        className,
      )}
      {...props}
    >
      {children}
      {optional && <span className="text-muted-foreground font-normal">optional</span>}
    </LabelPrimitive.Root>
  );
}
