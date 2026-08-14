'use client'

import * as ToastPrimitive from '@radix-ui/react-toast'
import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

import { cn } from '@/lib/cn'

export type ToastTone = 'neutral' | 'positive' | 'negative'

export interface ToastOptions {
  /**
   * Names the effect that just happened, echoing the button that caused it:
   * `Start design run` produces `Design run started`.
   */
  title: string
  description?: string
  tone?: ToastTone
}

interface ToastRecord extends ToastOptions {
  id: number
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null)

export function useToast(): (options: ToastOptions) => void {
  const context = useContext(ToastContext)
  if (context === null) {
    throw new Error('useToast must be used inside <ToastProvider>')
  }
  return context
}

const TONE_BORDER: Record<ToastTone, string> = {
  neutral: 'border-border',
  positive: 'border-positive/40',
  negative: 'border-negative/40',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])

  const toast = useCallback((options: ToastOptions) => {
    setToasts((current) => {
      // Toast spam is banned. An identical message already on screen is the same
      // event reported twice, so it replaces rather than stacks.
      const duplicate = current.find(
        (item) => item.title === options.title && item.description === options.description,
      )
      if (duplicate) return current
      return [...current, { ...options, id: Date.now() + Math.random() }]
    })
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const value = useMemo(() => toast, [toast])

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {toasts.map((item) => (
          <ToastPrimitive.Root
            key={item.id}
            onOpenChange={(open) => {
              if (!open) dismiss(item.id)
            }}
            className={cn(
              'rounded-panel bg-surface shadow-popover border p-3',
              'animate-[layer-in_var(--duration-base)_var(--ease-out-quint)]',
              TONE_BORDER[item.tone ?? 'neutral'],
            )}
          >
            <ToastPrimitive.Title className="text-13 text-text font-medium">
              {item.title}
            </ToastPrimitive.Title>
            {item.description ? (
              <ToastPrimitive.Description className="text-12 text-text-muted mt-0.5">
                {item.description}
              </ToastPrimitive.Description>
            ) : null}
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport
          className={cn('fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2 outline-none')}
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}
