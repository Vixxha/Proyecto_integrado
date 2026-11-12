import * as React from 'react'
import { Select as SelectPrimitive } from 'radix-ui'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value
export function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return <SelectPrimitive.Trigger data-slot="select-trigger" className={cn('flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-input bg-card px-3 text-xs outline-none transition-colors hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50 [&>span]:truncate', className)} {...props}>{children}<SelectPrimitive.Icon asChild><ChevronDown className="size-3.5 text-muted-foreground" /></SelectPrimitive.Icon></SelectPrimitive.Trigger>
}
export function SelectContent({ className, children, position = 'popper', ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return <SelectPrimitive.Portal><SelectPrimitive.Content position={position} sideOffset={5} className={cn('relative z-50 max-h-80 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-card p-1 text-foreground shadow-lg', className)} {...props}><SelectPrimitive.ScrollUpButton className="flex justify-center py-1"><ChevronUp className="size-4" /></SelectPrimitive.ScrollUpButton><SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport><SelectPrimitive.ScrollDownButton className="flex justify-center py-1"><ChevronDown className="size-4" /></SelectPrimitive.ScrollDownButton></SelectPrimitive.Content></SelectPrimitive.Portal>
}
export function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return <SelectPrimitive.Item className={cn('relative flex w-full cursor-default select-none items-center rounded-md py-2.5 pr-8 pl-3 text-xs outline-none focus:bg-accent data-[disabled]:opacity-50', className)} {...props}><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText><span className="absolute right-2"><SelectPrimitive.ItemIndicator><Check className="size-4" /></SelectPrimitive.ItemIndicator></span></SelectPrimitive.Item>
}
