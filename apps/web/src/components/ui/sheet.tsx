import { XIcon } from 'lucide-react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

export function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="bg-overlay data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'bg-background ease-snappy data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] shadow-2xl data-[state=closed]:duration-200 data-[state=open]:duration-300 sm:max-w-[600px]',
          className,
        )}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b pl-5 pr-3 sm:pl-6">
      <SheetPrimitive.Title className="text-[15px] font-semibold">{title}</SheetPrimitive.Title>
      <SheetPrimitive.Description className="sr-only">{description ?? title}</SheetPrimitive.Description>
      <SheetPrimitive.Close className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring/50 grid size-9 place-items-center rounded-md outline-none transition-colors focus-visible:ring-[3px]">
        <XIcon className="size-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </div>
  );
}
