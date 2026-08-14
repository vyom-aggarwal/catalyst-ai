/**
 * Skeletons match the geometry of the table they are standing in for — same row
 * height, same column rhythm — so nothing shifts when the data lands. A centred
 * spinner over the whole page is banned.
 */
export default function Loading() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-border flex h-12 shrink-0 items-center border-b px-6">
        <h1 className="text-18 font-strong">Projects</h1>
      </header>
      <div className="border-border bg-surface-sunk h-8 border-b" />
      <div aria-hidden>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-row border-border flex items-center gap-3 border-b px-3">
            <div className="rounded-control bg-surface-sunk h-2 w-40" />
            <div className="rounded-control bg-surface-sunk h-2 w-24" />
            <div className="rounded-control bg-surface-sunk h-2 w-32" />
            <div className="rounded-control bg-surface-sunk ml-auto h-2 w-16" />
          </div>
        ))}
      </div>
      <span className="sr-only" role="status">
        Loading projects
      </span>
    </div>
  )
}
