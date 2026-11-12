import * as React from 'react'
import { cn } from '@/lib/utils'
export function Card({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="card" className={cn('rounded-xl border border-border bg-card text-card-foreground shadow-xs', className)} {...props} /> }
export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="card-header" className={cn('flex items-start justify-between gap-3 px-6 pt-5 pb-4', className)} {...props} /> }
export function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) { return <h2 data-slot="card-title" className={cn('text-[15px] font-semibold tracking-tight', className)} {...props} /> }
export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) { return <p data-slot="card-description" className={cn('mt-1 text-xs leading-relaxed text-muted-foreground', className)} {...props} /> }
export function CardContent({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="card-content" className={cn('px-6 pb-6', className)} {...props} /> }
