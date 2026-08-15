'use server'

import { revalidatePath } from 'next/cache'

import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'

/**
 * Actions return a result rather than throwing, so a failure reaches the screen
 * with its remedy intact instead of becoming a generic error boundary.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string; remedy: string }

async function attempt<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await run() }
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, message: error.message, remedy: error.remedy }
    }
    throw error
  }
}

export async function createProjectAction(input: {
  name: string
  organism?: string
  objective?: string
}): Promise<ActionResult<{ id: string }>> {
  const result = await attempt(() => api.createProject(input))
  if (result.ok) revalidatePath('/projects')
  return result.ok ? { ok: true, data: { id: result.data.id } } : result
}

export async function createTargetAction(
  projectId: string,
  input:
    | { source: 'uniprot'; accession: string }
    | { source: 'sequence'; name: string; text: string; organism?: string },
): Promise<ActionResult<{ id: string }>> {
  const result = await attempt(() => api.createTarget(projectId, input))
  if (result.ok) {
    revalidatePath(`/projects/${projectId}`)
    revalidatePath('/projects')
  }
  return result.ok ? { ok: true, data: { id: result.data.id } } : result
}

export async function attachStructureAction(
  targetId: string,
  input: { source: 'pdb' | 'alphafold_db'; identifier?: string },
): Promise<ActionResult<null>> {
  const result = await attempt(() => api.attachStructure(targetId, input))
  if (result.ok) revalidatePath(`/targets/${targetId}`)
  return result.ok ? { ok: true, data: null } : result
}

/** Computes a mapping for review. Writes nothing, so nothing is revalidated. */
export async function previewReconciliationAction(
  targetId: string,
  input: { structure_id: string; chain_id?: string; use_alignment?: boolean },
) {
  return attempt(() => api.previewReconciliation(targetId, input))
}

export async function acceptReconciliationAction(
  targetId: string,
  input: { structure_id: string; chain_id?: string; use_alignment?: boolean },
): Promise<ActionResult<null>> {
  const result = await attempt(() => api.acceptReconciliation(targetId, input))
  if (result.ok) revalidatePath(`/targets/${targetId}`)
  return result.ok ? { ok: true, data: null } : result
}

export async function confirmCanonicalAction(
  targetId: string,
  schemeId: string,
): Promise<ActionResult<{ label: string | null }>> {
  const result = await attempt(() => api.confirmCanonical(targetId, schemeId))
  if (!result.ok) return result
  revalidatePath(`/targets/${targetId}`)
  revalidatePath('/projects')
  return { ok: true, data: { label: result.data.canonical_scheme_label } }
}
