import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'accent' | 'positive' | 'negative' | 'warn'

/**
 * Tones map to meaning, never to decoration. `warn` is what a mock-produced number
 * wears, so it must stay visually distinct from every neutral chip on screen.
 */
const TONE: Record<BadgeTone, string> = {
  neutral: 'border-border bg-surface-sunk text-text-muted',
  accent: 'border-accent/25 bg-accent-sunk text-accent',
  positive: 'border-positive/25 bg-positive/8 text-positive',
  negative: 'border-negative/25 bg-negative/8 text-negative',
  warn: 'border-warn/25 bg-warn/8 text-warn',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  /** Use for mutation codes, accessions and hashes. */
  mono?: boolean
}

export function Badge({ className, tone = 'neutral', mono = false, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'rounded-control inline-flex items-center gap-1 border px-1.5 py-0.5',
        'text-11 whitespace-nowrap font-medium',
        mono && 'font-mono tracking-normal',
        TONE[tone],
        className,
      )}
      {...props}
    />
  )
}

/** The only place `rounded-full` is permitted. */
export function StatusDot({ tone = 'neutral', className, ...props }: BadgeProps) {
  const fill: Record<BadgeTone, string> = {
    neutral: 'bg-text-faint',
    accent: 'bg-accent',
    positive: 'bg-positive',
    negative: 'bg-negative',
    warn: 'bg-warn',
  }
  return (
    <span
      className={cn('inline-block size-1.5 shrink-0 rounded-full', fill[tone], className)}
      {...props}
    />
  )
}
