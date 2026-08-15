/**
 * Linear sequence track.
 *
 * Plain SVG with arithmetic scaling — a linear map from residue index to x needs
 * no library, and D3 scales arrive with the actual charts in a later phase
 * rather than sitting unused now.
 *
 * The track's job is to make numbering disagreement visible: each scheme gets a
 * row, gaps are drawn as gaps rather than closed up, and the tick labels come
 * from the scheme itself instead of from the array index.
 */

export interface TrackScheme {
  id: string
  label: string
  kind: string
  isCanonical: boolean
  /** One label per sequence position; null where the scheme does not cover it. */
  labels: (string | null)[]
}

const ROW_HEIGHT = 34
const BAR_HEIGHT = 10
const LEFT = 4
const RIGHT = 4

export function SequenceTrack({
  length,
  schemes,
  mismatches = [],
  height = 0,
}: {
  length: number
  schemes: TrackScheme[]
  /** 1-based sequence positions where structure and sequence disagree. */
  mismatches?: number[]
  height?: number
}) {
  if (length === 0 || schemes.length === 0) return null

  const width = 1000
  const inner = width - LEFT - RIGHT
  const x = (position: number) => LEFT + ((position - 1) / length) * inner
  const totalHeight = height || schemes.length * ROW_HEIGHT + 18

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${totalHeight}`}
        className="min-w-track-min w-full"
        role="img"
        aria-label={`Sequence track, ${length} residues, ${schemes.length} numbering schemes`}
      >
        {schemes.map((scheme, row) => {
          const y = row * ROW_HEIGHT + 12
          const segments = coveredSegments(scheme.labels)

          return (
            <g key={scheme.id}>
              <text x={LEFT} y={y - 3} className="fill-text-muted text-11">
                {scheme.label}
                {scheme.isCanonical ? ' · canonical' : ''}
              </text>

              {/* Full extent, drawn first so gaps read as absence. */}
              <rect
                x={LEFT}
                y={y}
                width={inner}
                height={BAR_HEIGHT}
                rx={2}
                className="fill-surface-sunk"
              />

              {segments.map(([start, end]) => (
                <rect
                  key={`${scheme.id}-${start}`}
                  x={x(start)}
                  y={y}
                  width={Math.max(1, x(end + 1) - x(start))}
                  height={BAR_HEIGHT}
                  rx={2}
                  className={scheme.isCanonical ? 'fill-accent' : 'fill-border-strong'}
                />
              ))}

              {ticksFor(scheme.labels, length).map((tick) => (
                <text
                  key={`${scheme.id}-tick-${tick.position}`}
                  x={x(tick.position)}
                  y={y + BAR_HEIGHT + 10}
                  textAnchor={tick.anchor}
                  className="fill-text-faint text-11 tabular-nums"
                >
                  {tick.label}
                </text>
              ))}
            </g>
          )
        })}

        {mismatches.map((position) => (
          <line
            key={`mismatch-${position}`}
            x1={x(position)}
            x2={x(position)}
            y1={6}
            y2={schemes.length * ROW_HEIGHT + 6}
            className="stroke-negative"
            strokeWidth={1.5}
          />
        ))}
      </svg>
    </div>
  )
}

/** Runs of consecutive covered positions, as 1-based inclusive ranges. */
function coveredSegments(labels: (string | null)[]): [number, number][] {
  const segments: [number, number][] = []
  let start: number | null = null

  labels.forEach((label, index) => {
    const position = index + 1
    if (label !== null && start === null) {
      start = position
    } else if (label === null && start !== null) {
      segments.push([start, position - 1])
      start = null
    }
  })

  if (start !== null) segments.push([start, labels.length])
  return segments
}

/**
 * First and last covered label, plus interior ones. Labels come from the scheme,
 * never from the index — that substitution is the whole bug class this screen
 * exists to prevent.
 */
function ticksFor(
  labels: (string | null)[],
  length: number,
): { position: number; label: string; anchor: 'start' | 'middle' | 'end' }[] {
  const covered = labels
    .map((label, index) => ({ label, position: index + 1 }))
    .filter((entry): entry is { label: string; position: number } => entry.label !== null)

  if (covered.length === 0) return []

  const first = covered[0]!
  const last = covered[covered.length - 1]!
  const ticks: { position: number; label: string; anchor: 'start' | 'middle' | 'end' }[] = [
    { position: first.position, label: first.label, anchor: 'start' as const },
    { position: last.position, label: last.label, anchor: 'end' as const },
  ]

  for (const fraction of [0.25, 0.5, 0.75]) {
    const target = Math.round(length * fraction)
    const entry = covered.find((candidate) => candidate.position >= target)
    if (
      entry &&
      Math.abs(entry.position - first.position) > length * 0.08 &&
      Math.abs(entry.position - last.position) > length * 0.08
    ) {
      ticks.push({ position: entry.position, label: entry.label, anchor: 'middle' as const })
    }
  }

  return ticks
}
