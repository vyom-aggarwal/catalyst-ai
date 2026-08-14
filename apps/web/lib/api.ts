import { metaSchema, projectListSchema, type Meta, type ProjectRow } from '@catalyst/schema'

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

export function fetchMeta(): Promise<Meta> {
  return request('/meta', metaSchema)
}

export function fetchProjects(): Promise<ProjectRow[]> {
  return request('/projects', projectListSchema)
}
