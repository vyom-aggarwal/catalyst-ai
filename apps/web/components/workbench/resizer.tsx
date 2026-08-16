'use client'

import { useCallback, useEffect, useRef } from 'react'

import { cn } from '@/lib/cn'

/**
 * A drag handle between panes. DESIGN.md §2: the three-pane workbench is
 * resizable and the sizes persist per user.
 *
 * A 1px hairline with a wider invisible grab area, because the hairline is the
 * structural device and widening it to make it grabbable would turn a border
 * into a bar. Keyboard-resizable too — arrow keys move it, so the pane layout
 * is not mouse-only.
 */
export function Resizer({
  label,
  value,
  onChange,
  min,
  max,
  /** Which way a positive delta grows the pane. */
  direction = 'right',
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  direction?: 'left' | 'right'
}) {
  const dragging = useRef(false)
  const start = useRef({ pointer: 0, value: 0 })

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragging.current) return
      const delta = event.clientX - start.current.pointer
      const next = start.current.value + (direction === 'right' ? delta : -delta)
      onChange(Math.round(next))
    },
    [direction, onChange],
  )

  const onPointerUp = useCallback(() => {
    dragging.current = false
    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [onPointerMove, onPointerUp])

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={(event) => {
        dragging.current = true
        start.current = { pointer: event.clientX, value }
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 32 : 8
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          onChange(value + (direction === 'right' ? -step : step))
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          onChange(value + (direction === 'right' ? step : -step))
        }
      }}
      className={cn(
        'group relative w-px shrink-0 cursor-col-resize',
        'bg-border hover:bg-border-strong',
        'focus-visible:bg-accent focus-visible:outline-none',
      )}
    >
      {/* The grab target is wider than the line it moves. */}
      <span className="absolute inset-y-0 -left-1 -right-1 block" />
    </div>
  )
}
