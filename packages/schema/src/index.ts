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

/** Numbering scheme kinds, mirroring `catalyst.models.enums.NumberingKind`. */
export const numberingKindSchema = z.enum(['sequence', 'pdb_author', 'construct'])
export type NumberingKind = z.infer<typeof numberingKindSchema>

export const numberingSchemeSchema = z.object({
  id: z.string().uuid(),
  kind: numberingKindSchema,
  label: z.string(),
  is_canonical: z.boolean(),
  note: z.string().nullable(),
  first_label: z.string().nullable(),
  last_label: z.string().nullable(),
  covered: z.number().int(),
})

export type NumberingScheme = z.infer<typeof numberingSchemeSchema>

export const structureSchema = z.object({
  id: z.string().uuid(),
  source: z.string(),
  identifier: z.string().nullable(),
  chain: z.string().nullable(),
  content_hash: z.string(),
  is_predicted: z.boolean(),
})

export type Structure = z.infer<typeof structureSchema>

export const targetSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  name: z.string(),
  organism: z.string().nullable(),
  uniprot_accession: z.string().nullable(),
  sequence: z.string(),
  length: z.number().int(),
  numbering_schemes: z.array(numberingSchemeSchema),
  structures: z.array(structureSchema),
  canonical_scheme_label: z.string().nullable(),
  /** False until a canonical scheme is confirmed. Gates every downstream screen. */
  is_designable: z.boolean(),
})

export type Target = z.infer<typeof targetSchema>

export const targetSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  organism: z.string().nullable(),
  uniprot_accession: z.string().nullable(),
  length: z.number().int(),
  is_designable: z.boolean(),
  canonical_scheme_label: z.string().nullable(),
})

export const projectDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  organism: z.string().nullable(),
  objective: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  targets: z.array(targetSummarySchema),
})

export type ProjectDetail = z.infer<typeof projectDetailSchema>
export type TargetSummary = z.infer<typeof targetSummarySchema>

export const reconcileOutcomeSchema = z.enum(['reconciled', 'ambiguous', 'needs_alignment'])
export type ReconcileOutcome = z.infer<typeof reconcileOutcomeSchema>

export const mismatchSchema = z.object({
  sequence_position: z.number().int(),
  sequence_residue: z.string(),
  structure_label: z.string(),
  structure_residue: z.string(),
})

export const reconciliationSchema = z.object({
  outcome: reconcileOutcomeSchema,
  method: z.enum(['exact', 'alignment']).nullable(),
  chain_id: z.string(),
  structure_id: z.string().uuid(),
  coverage: z.number(),
  identity: z.number(),
  covered: z.number().int(),
  total: z.number().int(),
  mismatches: z.array(mismatchSchema),
  candidate_offsets: z.array(z.number().int()),
  /** Present only when an alignment ran. Stated so the run is reproducible. */
  parameters: z.record(z.string(), z.number()).nullable(),
  note: z.string(),
  labels: z.array(z.string().nullable()),
})

export type Reconciliation = z.infer<typeof reconciliationSchema>
export type Mismatch = z.infer<typeof mismatchSchema>

export const trackResidueSchema = z.object({
  index: z.number().int(),
  residue: z.string(),
  label: z.string().nullable(),
})

export const sequenceTrackSchema = z.object({
  target_id: z.string().uuid(),
  scheme_label: z.string().nullable(),
  residues: z.array(trackResidueSchema),
  schemes: z.array(z.record(z.string(), z.unknown())),
})

export type SequenceTrack = z.infer<typeof sequenceTrackSchema>
export type TrackResidue = z.infer<typeof trackResidueSchema>

/* ------------------------------------------------------------------ goals */

export const objectiveSchema = z.enum([
  'thermostability',
  'activity',
  'expression',
  'solubility',
  'binding_affinity',
  'specificity',
  'solvent_tolerance',
  'other',
])

export type Objective = z.infer<typeof objectiveSchema>

/**
 * Every field is nullable. An absent field means the user did not state it —
 * never a default. The UI must render "not stated" rather than filling a gap.
 */
export const goalSpecSchema = z.object({
  objective: objectiveSchema.nullable(),
  objective_detail: z.string().nullable(),
  target_value: z.object({ value: z.number(), unit: z.string() }).nullable(),
  preserve: z.array(z.string()),
  budget: z.object({
    variants: z.number().int().nullable(),
    amount: z.number().nullable(),
    currency: z.string().nullable(),
  }),
  expression_host: z.string().nullable(),
  assay: z.string().nullable(),
  /** Clauses the parser could not place, shown rather than dropped. */
  unparsed: z.array(z.string()),
  method: z.string().optional(),
  note: z.string().optional(),
  restatement: z.string().optional(),
  matched_phrases: z.array(z.string()).optional(),
})

export type GoalSpec = z.infer<typeof goalSpecSchema>

export const goalSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  target_id: z.string().uuid(),
  raw_text: z.string(),
  spec: goalSpecSchema,
  restatement: z.string(),
  method: z.string(),
  note: z.string(),
  missing_required: z.array(z.string()),
  is_confirmed: z.boolean(),
  confirmed_at: z.string().datetime({ offset: true }).nullable(),
  expectations: z.object({
    will: z.array(z.string()),
    will_not: z.array(z.string()),
  }),
})

export type Goal = z.infer<typeof goalSchema>
export const goalListSchema = z.array(goalSchema)

export const preflightSchema = z.object({
  can_start: z.boolean(),
  reason: z.string().nullable(),
  remedy: z.string().nullable(),
})

export type Preflight = z.infer<typeof preflightSchema>

/* ------------------------------------------------------------ constraints */

export const constraintKindSchema = z.enum([
  'catalytic',
  'ligand_contact',
  'cofactor_contact',
  'binding_interface',
  'disulfide',
  'signal_peptide',
  'purification_tag',
  'do_not_touch',
])

export type ConstraintKind = z.infer<typeof constraintKindSchema>

export const constraintSchema = z.object({
  id: z.string().uuid(),
  kind: constraintKindSchema,
  positions: z.array(z.number().int()),
  /** The same positions as the canonical scheme labels them. */
  labels: z.array(z.string()),
  note: z.string().nullable(),
})

export type Constraint = z.infer<typeof constraintSchema>
export const constraintListSchema = z.array(constraintSchema)

/** A proposal read from UniProt. Constrains nothing until accepted. */
export const suggestionSchema = z.object({
  kind: constraintKindSchema,
  positions: z.array(z.number().int()),
  labels: z.array(z.string()),
  residues: z.array(z.string()),
  source: z.string(),
  note: z.string(),
})

export type Suggestion = z.infer<typeof suggestionSchema>
export const suggestionListSchema = z.array(suggestionSchema)
