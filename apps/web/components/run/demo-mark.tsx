/**
 * The per-number honesty mark.
 *
 * Specification §6 requires a fabricating provider to badge *every individual
 * number* it produced, not only the screen. A full badge on every cell would
 * make a dense table unreadable, so the mark is a single warn-coloured asterisk
 * carrying its explanation on hover, with the footnote spelled out once beneath
 * the table.
 *
 * The decision to show it comes from `is_mock` on the model version that
 * produced the number. No component here recognises a model by name — see
 * ARCHITECTURE.md §2.
 */

export const DEMO_FOOTNOTE =
  'Synthetic value from a provider that fabricates numbers. Not model output, and not a prediction.'

export function DemoMark({ modelName }: { modelName?: string }) {
  return (
    <span
      className="text-warn ml-0.5 select-none"
      aria-label="synthetic value"
      title={modelName ? `${modelName}. ${DEMO_FOOTNOTE}` : DEMO_FOOTNOTE}
    >
      *
    </span>
  )
}

export function DemoFootnote() {
  return (
    <p className="text-12 text-text-muted">
      <span className="text-warn">*</span> {DEMO_FOOTNOTE}
    </p>
  )
}
