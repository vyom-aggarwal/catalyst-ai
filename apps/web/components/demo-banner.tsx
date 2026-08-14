/**
 * The honesty bar.
 *
 * Rendered on every screen whenever a provider that fabricates numbers is active.
 * It is not dismissible: the moment a user can hide it, a synthetic ΔΔG can be
 * screenshotted into a slide deck with nothing marking it as synthetic.
 */
export function DemoBanner() {
  return (
    <div
      role="status"
      className="border-warn/30 bg-warn/8 flex h-7 shrink-0 items-center gap-2 border-b px-4"
    >
      <span className="text-11 font-strong text-warn uppercase tracking-wide">
        Demo data — not model output
      </span>
      <span className="text-12 text-text-muted">
        Numbers on screen are synthetic. Exports are watermarked and primers are not generated.
      </span>
    </div>
  )
}
