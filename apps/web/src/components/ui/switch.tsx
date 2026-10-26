import { Switch as SwitchPrimitive } from 'radix-ui';
import * as React from 'react';
import { cn } from '@/lib/utils';

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'shadow-xs focus-visible:ring-ring/50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80 peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent outline-none transition-colors focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="bg-background ease-snappy dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full shadow-sm ring-0 transition-transform duration-200 data-[state=checked]:translate-x-[calc(100%-1px)] data-[state=unchecked]:translate-x-0.5" />
    </SwitchPrimitive.Root>
  );
}
