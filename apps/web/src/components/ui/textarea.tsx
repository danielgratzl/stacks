import * as React from 'react';
import { cn } from '@/lib/utils';
import { inputClass } from './input';

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(inputClass, 'h-auto min-h-24 resize-y py-2 leading-relaxed', className)}
      {...props}
    />
  );
}
