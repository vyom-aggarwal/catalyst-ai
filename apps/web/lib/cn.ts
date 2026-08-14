import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge ships knowledge of Tailwind's stock scales, but `tokens.css`
 * deletes those and declares our own. Without teaching it the replacements it
 * cannot tell `text-13` (a size) from `text-muted` (a colour), and
 * `cn('text-12', 'text-13')` would emit both.
 */
const FONT_SIZES = ['11', '12', '13', '15', '18', '24']

const COLORS = [
  'canvas',
  'surface',
  'surface-sunk',
  'border',
  'border-strong',
  'text',
  'text-muted',
  'text-faint',
  'accent',
  'accent-sunk',
  'positive',
  'negative',
  'warn',
  'transparent',
  'current',
  'inherit',
]

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: FONT_SIZES }],
      'text-color': [{ text: COLORS }],
      'bg-color': [{ bg: COLORS }],
      'border-color': [{ border: COLORS }],
      'font-weight': [{ font: ['normal', 'medium', 'strong'] }],
      rounded: [{ rounded: ['control', 'panel', 'dialog'] }],
      shadow: [{ shadow: ['popover', 'dialog'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
