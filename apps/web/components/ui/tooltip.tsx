'use client'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ReactElement, ReactNode } from 'react'

import { cn } from '@/lib/cn'

export const TooltipProvider = TooltipPrimitive.Provider

export interface TooltipProps {
  content: ReactNode
  children: ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Suppress when the content would only repeat the visible label. */
  disabled?: boolean
}

/**
 * Deliberately a single component rather than the Root/Trigger/Content trio.
 * Every tooltip in this product is "hover this, read that", and the composed form
 * invites inconsistent delays and offsets across screens.
 */
export function Tooltip({ content, children, side = 'top', disabled = false }: TooltipProps) {
  if (disabled) return children

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            'rounded-control border-border bg-surface z-50 max-w-72 border px-2 py-1',
            'text-12 text-text shadow-popover',
            'animate-[layer-in_var(--duration-fast)_var(--ease-out-quint)]',
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
