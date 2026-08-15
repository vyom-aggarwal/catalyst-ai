import { describe, expect, it } from 'vitest'

import { parsePositions } from '@/app/targets/[id]/constraints/constraints-panel'

/**
 * Residue positions typed by hand. A misread here puts a hard filter on the
 * wrong residue, so the parser drops what it cannot read rather than guessing —
 * the API then rejects anything outside the sequence.
 */
describe('parsePositions', () => {
  it('reads a comma-separated list', () => {
    expect(parsePositions('70, 73, 130')).toEqual([70, 73, 130])
  })

  it('expands an inclusive range, as a biologist reads it', () => {
    expect(parsePositions('130-134')).toEqual([130, 131, 132, 133, 134])
  })

  it('mixes singles and ranges', () => {
    expect(parsePositions('70, 130-132')).toEqual([70, 130, 131, 132])
  })

  it('tolerates whitespace and repeated separators', () => {
    expect(parsePositions('  70 ,,  73  ')).toEqual([70, 73])
  })

  it('de-duplicates overlapping input', () => {
    expect(parsePositions('70, 70, 69-71')).toEqual([69, 70, 71])
  })

  it('returns positions in order regardless of input order', () => {
    expect(parsePositions('130, 70, 99')).toEqual([70, 99, 130])
  })

  it('drops fragments it cannot read rather than guessing', () => {
    expect(parsePositions('70, Ser73, ?, 99')).toEqual([70, 99])
  })

  it('ignores a reversed range instead of inverting it', () => {
    expect(parsePositions('134-130')).toEqual([])
  })

  it('refuses an absurd range rather than allocating it', () => {
    expect(parsePositions('1-999999')).toEqual([])
  })

  it('returns nothing for empty input', () => {
    expect(parsePositions('')).toEqual([])
    expect(parsePositions('   ')).toEqual([])
  })
})
