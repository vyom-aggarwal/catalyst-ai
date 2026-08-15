import {
  metaSchema,
  projectDetailSchema,
  projectListSchema,
  reconciliationSchema,
  sequenceTrackSchema,
  targetSchema,
  type Meta,
  type ProjectDetail,
  type ProjectRow,
  type Reconciliation,
  type SequenceTrack,
  type Target,
} from '@catalyst/schema'

/**
 * Structural, so the web app depends on @catalyst/schema and not on zod itself.
 * The validation library is an implementation detail of the schema package.
 */
interface Parser<T> {
  safeParse(input: unknown): { success: true; data: T } | { success: false }
}

/**
 * Server components run inside the container, where the API is reachable by
 * service name; the browser reaches it on localhost. Both are needed.
 */
function baseUrl(): string {
  if (typeof window === 'undefined') {
    return (
      process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
    )
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
}

/** A failure the interface can explain: what broke, and what fixes it. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly remedy: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, schema: Parser<T>): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`, { cache: 'no-store' })
  } catch {
    throw new ApiError(
      'Cannot reach the API.',
      'Start the stack with `docker compose up`, then reload.',
    )
  }

  if (!response.ok) {
    throw new ApiError(
      `The API returned ${response.status} for ${path}.`,
      'Check the api service logs with `docker compose logs api`.',
    )
  }

  const parsed = schema.safeParse(await response.json())
  if (!parsed.success) {
    // Silently coercing a mismatched payload is how a wrong number reaches a
    // scientist. Fail loudly instead.
    throw new ApiError(
      `The API response for ${path} did not match the expected schema.`,
      'The web and api versions are out of step — rebuild with `docker compose up --build`.',
    )
  }
  return parsed.data
}

/**
 * The API reports failures as `{message, remedy}`. That shape is preserved all
 * the way to the screen: an error that does not say what fixes it is useless to
 * someone who is busy.
 */
async function send<T>(path: string, body: unknown, schema: Parser<T>): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
  } catch {
    throw new ApiError(
      'Cannot reach the API.',
      'Start the stack with `docker compose up`, then retry.',
    )
  }

  if (!response.ok) {
    const detail = await response
      .json()
      .then((payload: unknown) => {
        const shape = payload as { detail?: { message?: string; remedy?: string } }
        return shape.detail
      })
      .catch(() => undefined)

    throw new ApiError(
      detail?.message ?? `The API returned ${response.status}.`,
      detail?.remedy ?? 'Check the input and try again.',
    )
  }

  const parsed = schema.safeParse(await response.json())
  if (!parsed.success) {
    throw new ApiError(
      `The API response for ${path} did not match the expected schema.`,
      'The web and api versions are out of step — rebuild with `docker compose up --build`.',
    )
  }
  return parsed.data
}

export function fetchMeta(): Promise<Meta> {
  return request('/meta', metaSchema)
}

export function fetchProjects(): Promise<ProjectRow[]> {
  return request('/projects', projectListSchema)
}

export function fetchProject(id: string): Promise<ProjectDetail> {
  return request(`/projects/${id}`, projectDetailSchema)
}

export function fetchTarget(id: string): Promise<Target> {
  return request(`/targets/${id}`, targetSchema)
}

/** Per-residue labels for every scheme, for the sequence track. */
export function fetchTrack(id: string): Promise<SequenceTrack> {
  return request(`/targets/${id}/track`, sequenceTrackSchema)
}

export function createProject(body: {
  name: string
  organism?: string
  objective?: string
}): Promise<ProjectDetail> {
  return send('/projects', body, projectDetailSchema)
}

export function createTarget(
  projectId: string,
  body:
    | { source: 'uniprot'; accession: string }
    | { source: 'sequence'; name: string; text: string; organism?: string },
): Promise<Target> {
  return send(`/projects/${projectId}/targets`, body, targetSchema)
}

export function attachStructure(
  targetId: string,
  body: { source: 'pdb' | 'alphafold_db' | 'uploaded_pdb'; identifier?: string; text?: string },
): Promise<Target> {
  return send(`/targets/${targetId}/structures`, body, targetSchema)
}

/** Computes a mapping and returns it. Persists nothing. */
export function previewReconciliation(
  targetId: string,
  body: { structure_id: string; chain_id?: string; use_alignment?: boolean },
): Promise<Reconciliation> {
  return send(`/targets/${targetId}/reconcile`, body, reconciliationSchema)
}

export function acceptReconciliation(
  targetId: string,
  body: { structure_id: string; chain_id?: string; use_alignment?: boolean },
): Promise<Target> {
  return send(`/targets/${targetId}/reconcile/accept`, body, targetSchema)
}

export function confirmCanonical(targetId: string, schemeId: string): Promise<Target> {
  return send(`/targets/${targetId}/numbering/confirm`, { scheme_id: schemeId }, targetSchema)
}
