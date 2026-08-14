/**
 * The contract between apps/web and apps/api.
 *
 * Hand-written for now. Once the API surface grows past a couple of endpoints
 * these move to generation from the FastAPI OpenAPI document, so the Pydantic
 * models stay the single source of truth and drift becomes impossible rather
 * than merely unlikely.
 */

import { z } from 'zod'

/**
 * Demo mode is the honesty switch. When true, a provider that fabricates numbers
 * is active and the interface must say so on every screen.
 */
export const metaSchema = z.object({
  demo_mode: z.boolean(),
  providers: z.array(z.string()),
})

export type Meta = z.infer<typeof metaSchema>

export const projectRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  organism: z.string().nullable(),
  objective: z.string().nullable(),
  target_name: z.string().nullable(),
  target_count: z.number().int(),
  run_count: z.number().int(),
  measured_variant_count: z.number().int(),
  last_activity_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }),
})

export type ProjectRow = z.infer<typeof projectRowSchema>

export const projectListSchema = z.array(projectRowSchema)
