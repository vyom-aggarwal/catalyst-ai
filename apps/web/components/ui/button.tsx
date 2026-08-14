'use client'

import { Slot } from '@radix-ui/react-slot'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'

import { cn } from '@/lib/cn'

import { Tooltip } from './tooltip'

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

/**
 * Variants are a plain record rather than a variant library. There are four of
 * them and they are read far more often than they are written.
 */
const VARIANT: Record<ButtonVariant, string> = {
  default: 'border-border bg-surface text-text hover:bg-surface-sunk',
  primary: 'border-transparent bg-accent text-surface hover:bg-accent/90',
  ghost: 'border-transparent bg-transparent text-text hover:bg-surface-sunk',
  // Destructive intent is carried by the label colour. A filled red button reads
  // as an alarm, and most destructive actions here are ordinary and reversible.
  danger: 'border-border bg-surface text-negative hover:bg-surface-sunk',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-control-sm px-2 text-12',
  md: 'h-control px-3 text-13',
}

const BASE =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-control border ' +
  'font-medium whitespace-nowrap select-none ' +
  'transition-[background-color,opacity] duration-fast ease-out-quint ' +
  'disabled:pointer-events-none disabled:opacity-40 ' +
  // No shadow on buttons — hierarchy comes from the border and fill.
  '[&_svg]:size-4 [&_svg]:shrink-0'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Render as the child element, keeping styles. For links that look like buttons. */
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', size = 'md', asChild = false, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      ref={ref}
      // An unspecified type inside a form defaults to submit, which is almost
      // never what a toolbar button meant.
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(BASE, VARIANT[variant], SIZE[size], className)}
      {...props}
    />
  )
})

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'asChild'> {
  /**
   * Required. Icon-only buttons without a tooltip are banned by DESIGN.md §7, so
   * the label is not optional — it becomes both the tooltip and the accessible
   * name. The type system enforces the rule rather than a code review catching it.
   */
  label: string
  icon: ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, className, size = 'md', ...props },
  ref,
) {
  return (
    <Tooltip content={label}>
      <Button
        ref={ref}
        aria-label={label}
        size={size}
        className={cn(size === 'sm' ? 'w-control-sm px-0' : 'w-control px-0', className)}
        {...props}
      >
        {icon}
      </Button>
    </Tooltip>
  )
})
