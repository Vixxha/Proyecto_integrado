import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
export function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return <input type={type} data-slot="input" className={cn('h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50', className)} {...props} />
}
