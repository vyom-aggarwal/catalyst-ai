'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Mol*, embedded and controlled.
 *
 * The plugin is created headless — `PluginContext` with a bare canvas — rather
 * than through `createPluginUI`, which would bring Mol*'s own toolbars and
 * panels. BRIEF.md §3 asks for an embedded, controlled viewer and §4 says every
 * visual decision is ours; adopting another product's chrome inside the
 * inspector would be neither.
 *
 * Loaded dynamically and only in the browser: Mol* is several megabytes and
 * needs a WebGL context, so it must not enter the server bundle or the
 * workbench's initial payload.
 *
 * **This component cannot be verified from the DOM.** Everything it draws goes
 * to a WebGL canvas, so an automated check can confirm that it mounted, that it
 * fetched coordinates and that it reported no error — but not that the right
 * residue is on screen. What needs human eyes is listed in HANDOFF.md §5.
 */

interface ViewerState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  message?: string
}

export function StructureViewer({
  targetId,
  apiBase,
  authorLabel,
  code,
}: {
  targetId: string
  apiBase: string
  /**
   * How the *structure file* numbers this residue, which is not the canonical
   * scheme the table shows and not the sequence index either. Supplied by the
   * API alongside the geometry, because converting between numbering schemes by
   * arithmetic is the error this application exists to avoid.
   */
  authorLabel: string | null
  code: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Typed as unknown: nothing outside this file may reach into the plugin, and
  // the UI must never import a Mol* type into a shared component signature.
  const pluginRef = useRef<unknown>(null)
  const [state, setState] = useState<ViewerState>({ status: 'idle' })

  useEffect(() => {
    let cancelled = false
    let disposed = false

    async function boot() {
      if (!canvasRef.current || !containerRef.current) return
      setState({ status: 'loading' })
      try {
        const [{ PluginContext }, { DefaultPluginSpec }] = await Promise.all([
          import('molstar/lib/mol-plugin/context'),
          import('molstar/lib/mol-plugin/spec'),
        ])

        const plugin = new PluginContext(DefaultPluginSpec())
        await plugin.init()
        if (cancelled) {
          plugin.dispose()
          return
        }
        const initialised = await plugin.initViewerAsync(
          canvasRef.current,
          containerRef.current,
        )
        if (!initialised) {
          setState({
            status: 'error',
            message:
              'WebGL is not available in this browser context, so the structure cannot be drawn.',
          })
          plugin.dispose()
          return
        }
        pluginRef.current = plugin

        const data = await plugin.builders.data.download(
          { url: `${apiBase}/targets/${targetId}/structure`, isBinary: false },
          { state: { isGhost: true } },
        )
        const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb')
        await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default')
        if (cancelled) return
        setState({ status: 'ready' })
      } catch (error) {
        if (cancelled) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'The structure could not be loaded.',
        })
      }
    }

    void boot()
    return () => {
      cancelled = true
      if (!disposed && pluginRef.current) {
        disposed = true
        ;(pluginRef.current as { dispose: () => void }).dispose()
        pluginRef.current = null
      }
    }
  }, [apiBase, targetId])

  // Focus the residue whenever the selection moves. Kept separate from boot so
  // clicking through the table does not reload the structure.
  useEffect(() => {
    const plugin = pluginRef.current
    if (!plugin || state.status !== 'ready' || authorLabel === null) return

    // Author labels can carry an insertion code (`100A`). The numeric part is
    // auth_seq_id; the letter is auth_ins_code.
    const match = /^(-?\d+)([A-Za-z]?)$/.exec(authorLabel)
    if (!match) return
    const seqId = Number(match[1])
    const insCode = match[2] ?? ''

    let cancelled = false
    async function focus() {
      try {
        const [{ Script }, { StructureSelection }] = await Promise.all([
          import('molstar/lib/mol-script/script'),
          import('molstar/lib/mol-model/structure'),
        ])
        const typed = plugin as {
          managers: {
            structure: {
              hierarchy: { current: { structures: { cell: { obj?: { data: unknown } } }[] } }
            }
            camera: { focusLoci: (loci: unknown) => void }
            interactivity: { lociSelects: { selectOnly: (input: { loci: unknown }) => void } }
          }
        }
        const entry = typed.managers.structure.hierarchy.current.structures[0]
        const data = entry?.cell.obj?.data
        if (!data || cancelled) return

        const selection = Script.getStructureSelection(
          (q) =>
            q.struct.generator.atomGroups({
              'residue-test': q.core.rel.eq([
                q.struct.atomProperty.macromolecular.auth_seq_id(),
                seqId,
              ]),
              'chain-test': q.core.rel.eq([
                q.struct.atomProperty.macromolecular.pdbx_PDB_ins_code(),
                insCode,
              ]),
            }),
          data as never,
        )
        const loci = StructureSelection.toLociWithSourceUnits(selection)
        typed.managers.interactivity.lociSelects.selectOnly({ loci })
        typed.managers.camera.focusLoci(loci)
      } catch {
        // Focusing is a convenience. A failure here must not take down the
        // panel that is already showing the structure.
      }
    }
    void focus()
    return () => {
      cancelled = true
    }
  }, [authorLabel, state.status])

  return (
    <div className="space-y-2">
      <p className="text-11 text-text-muted font-medium uppercase tracking-wide">Structure</p>

      <div
        ref={containerRef}
        data-testid="structure-viewer"
        data-status={state.status}
        className="border-border rounded-panel bg-surface-sunk relative aspect-square w-full overflow-hidden border"
      >
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />
        {state.status !== 'ready' ? (
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <p className="text-12 text-text-muted text-center">
              {state.status === 'loading'
                ? 'Loading structure…'
                : state.status === 'error'
                  ? state.message
                  : ''}
            </p>
          </div>
        ) : null}
      </div>

      <p className="text-12 text-text-muted">
        Wild-type coordinates, focused on {code}. Predicted models carry per-residue pLDDT in
        the B-factor column; it is a confidence score, not a temperature factor.
      </p>
      {/* The specification asks for a wild-type/mutant rotamer toggle. Placing a
          mutant side chain requires a packer, which is not in this build — and a
          toggle that redrew the wild-type residue under a "mutant" label would
          be fabricating structural data, which is the one thing this product
          must not do. Stated rather than faked. */}
      <p className="text-12 text-text-faint">
        Mutant side chains are not modelled: placing a rotamer needs a side-chain packer,
        which this build does not have. Only wild-type coordinates are shown.
      </p>
    </div>
  )
}
