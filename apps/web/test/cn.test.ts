import { describe, expect, it } from 'vitest'

import { cn } from '@/lib/cn'

/**
 * `cn` has to know our scales, not Tailwind's. Without that it cannot tell a size
 * from a colour — both start with `text-` — and a component's override would
 * silently depend on stylesheet order instead of argument order.
 */
describe('cn', () => {
  it('resolves conflicting font sizes to the last one', () => {
    expect(cn('text-12', 'text-13')).toBe('text-13')
  })

  it('resolves conflicting text colours to the last one', () => {
    expect(cn('text-muted', 'text-accent')).toBe('text-accent')
  })

  it('keeps a size and a colour together, since they are different properties', () => {
    const result = cn('text-11', 'text-text-faint')
    expect(result).toContain('text-11')
    expect(result).toContain('text-text-faint')
  })

  it('resolves conflicting background colours', () => {
    expect(cn('bg-surface', 'bg-accent-sunk')).toBe('bg-accent-sunk')
  })

  it('resolves conflicting radii', () => {
    expect(cn('rounded-control', 'rounded-panel')).toBe('rounded-panel')
  })

  it('resolves conflicting shadows', () => {
    expect(cn('shadow-popover', 'shadow-dialog')).toBe('shadow-dialog')
  })

  it('resolves conflicting font weights', () => {
    expect(cn('font-normal', 'font-strong')).toBe('font-strong')
  })

  it('drops falsy values', () => {
    expect(cn('text-13', false, undefined, null, '')).toBe('text-13')
  })
})
