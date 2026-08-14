import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

/**
 * Presentational table primitives. Sorting, virtualisation and selection arrive in
 * Phase 5 on top of TanStack Table and TanStack Virtual; these components define
 * only the geometry and typography so both the small tables and the 10,000-row
 * workbench table read as the same object.
 */

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('text-13 w-full border-collapse', className)} {...props} />
    </div>
  )
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('bg-surface-sunk sticky top-0 z-10 [&_tr]:border-b', className)}
      {...props}
    />
  )
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr]:border-b', className)} {...props} />
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean
  compact?: boolean
}

export function TableRow({ className, selected, compact, ...props }: TableRowProps) {
  return (
    <tr
      data-selected={selected || undefined}
      className={cn(
        compact ? 'h-row-compact' : 'h-row',
        'border-border',
        'hover:bg-surface-sunk',
        // Selection is one of the two things the accent is reserved for.
        selected && 'bg-accent-sunk hover:bg-accent-sunk',
        className,
      )}
      {...props}
    />
  )
}

export interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean
}

export function TableHeaderCell({ className, numeric, ...props }: TableHeaderCellProps) {
  return (
    <th
      scope="col"
      className={cn(
        'text-11 text-text-muted h-8 px-3 font-medium uppercase tracking-wide',
        // 11px uppercase is the only place uppercase is permitted.
        numeric ? 'text-right' : 'text-left',
        className,
      )}
      {...props}
    />
  )
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Right-aligns and forces tabular figures. Every number in a table is numeric. */
  numeric?: boolean
  mono?: boolean
  muted?: boolean
}

export function TableCell({ className, numeric, mono, muted, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        'px-3 align-middle',
        numeric && 'text-right tabular-nums',
        mono && 'font-mono',
        muted && 'text-text-muted',
        className,
      )}
      {...props}
    />
  )
}

/**
 * The absence of a value. Never an imputed number, never a zero standing in for
 * "unknown" — a missing score reads as a dash and explains itself on hover.
 */
export function EmptyCell({ reason }: { reason: string }) {
  return (
    <span className="text-text-faint" title={reason}>
      —
    </span>
  )
}
