import type { InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'

import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Sequences, mutation codes, accessions and hashes are always mono. */
  mono?: boolean
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, mono = false, invalid = false, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-control rounded-control bg-surface text-13 text-text w-full border px-2',
        'placeholder:text-text-faint',
        'hover:border-border-strong',
        'disabled:bg-surface-sunk disabled:text-text-faint disabled:pointer-events-none',
        'duration-fast ease-out-quint transition-[border-color]',
        mono && 'font-mono',
        invalid && 'border-negative',
        className,
      )}
      {...props}
    />
  )
})
