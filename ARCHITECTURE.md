# CatalystAI — architecture

Module boundaries. **If you deviate, update this file in the same commit.**

---

## 1. Workspace layout

```
catalyst-ai/
├── apps/
│   ├── web/         Next.js 15 App Router, React 19, TypeScript strict
│   └── api/         FastAPI, Python 3.12, Pydantic v2, SQLModel
├── packages/
│   └── schema/      Zod schemas + types generated from the API's OpenAPI document
└── docker-compose.yml
```

`packages/schema` is the **only** module both apps depend on. `apps/web` never imports
from `apps/api` and vice versa; they meet at the HTTP boundary and at the shared schema.

---

## 2. The rule that matters most

> **The UI must never import a model client directly.**

There is exactly one seam between "what the product asks for" and "what a model can do",
and it is the `Predictor` protocol (§4). The web app knows about _scores_ and _model
versions_; it does not know that ESM exists. Concretely:

- `apps/web` may not import anything from a provider module, may not name a model in a
  conditional, and may not encode a model's quirks in a component.
- Anything the UI needs to vary by model arrives as **data** — through
  `Capabilities` and `ModelVersion` records — never as a branch in a component.

The test for whether this holds: adding a fourth stability predictor must touch zero
files under `apps/web/components`.

---

## 3. Layers in `apps/api`

Dependencies point downward only. A module never imports from a layer above it.

```
  routes/        HTTP surface. Pydantic request/response models. No business logic.
     │
  services/      Orchestration: build a run, aggregate scores, apply constraints.
     │           This is where domain rules from spec §7 live.
     │
  providers/     Predictor implementations. The ONLY place a model client may be
     │           imported. Each provider is self-contained and declares its own
     │           Capabilities. MockProvider lives here too.
     │
  sources/       External retrieval and parsing: UniProt, RCSB, AlphaFold DB,
     │           PDB and FASTA. No model runs here — these are downloads — which
     │           is why they sit beside providers/ rather than inside it.
     │
  parsers/       Free-text goal → structured objective. A language model reads
     │           the sentence; a deterministic rule parser runs whenever it
     │           cannot. Not providers/: a parser produces no scientific number
     │           and has no weights hash to cite. See §10.
     │
  domain/        Pure logic with no I/O and no database: amino acid nomenclature,
     │           mutation codes, numbering reconciliation. Everything here is a
     │           function of its arguments, and is where the numbering rules in
     │           §9 are actually enforced.
     │
  models/        SQLModel tables (spec §8). No behaviour beyond validators.
     │
  db.py          Engine + session. Sync psycopg 3 — the same session code path is
                 used by routes, RQ workers, and Alembic.
```

`workers/` sits beside `routes/` as a second entry point at the same level: it consumes
`services/` exactly as routes do. A job must be runnable from either without changes.

### Why sync

The workload is queue-bound, not connection-bound — real work happens in RQ workers, not
in request handlers. Sync SQLModel means routes, workers, Alembic, and pytest share one
engine and one session idiom, instead of needing a parallel sync engine for the three
contexts that cannot be async.

---

## 4. The model layer

One interface, many providers.

```python
class Predictor(Protocol):
    id: str
    name: str
    version: str
    weights_hash: str
    modality: Literal["stability", "fitness", "structure", "generative"]
    requires: Capabilities   # structure? MSA? max_len? GPU?
    citation: str

    def score(self, variants: list[Variant], ctx: TargetContext) -> list[Score]: ...
```

Implementations: `ESMScorer` (masked-marginal log-odds), `StabilityPredictor`
(ThermoMPNN-shaped adapter), `StructureProvider` (AlphaFold DB / uploaded PDB / ESMFold),
`MSAProvider`, `GenerativeProvider` (ProteinMPNN / RFdiffusion — for scaffold and binder
tasks, **not** presented as a point-mutation oracle).

**Every provider declares what it cannot do.** The UI greys out objectives that no
available provider supports, rather than running them and returning something worthless.

### Aggregation exposes disagreement

Per-model scores are shown alongside the consensus. When models disagree that is the most
useful signal on the screen — it is surfaced, not averaged away.

### Honesty boundary — non-negotiable

`MockProvider` produces deterministic, plausibly-shaped synthetic output so the full UI
is usable without GPUs. It must:

- set a global demo flag rendering a persistent amber `Demo data — not model output` bar
  on every screen,
- badge every individual number it produced,
- watermark PDF exports and **refuse to generate primers**.

**No scientific number is ever fabricated outside this provider.** If a model is
unavailable the cell reads `—` with a tooltip explaining why. No imputation, no
"estimated" placeholders.

---

## 5. Provenance

`ProvenanceEvent` is append-only and is a **first-class entity, not a log file**.

Every score rendered anywhere traces in two clicks to: which model, which version and
weights hash, which inputs, which run, at what time.

Enforced at the database level, not by convention:

- `Score.model_version_id` — `NOT NULL`, FK to `modelversion`
- `Score.run_id` — `NOT NULL`, FK to `run`

A `Score` cannot exist without both. This constraint is the reason a PI can sign off, and
it is not negotiable in any later migration.

---

## 6. Jobs

Redis + RQ. Jobs are **idempotent**. Results are content-addressed and cached on
`hash(model_version + inputs)`, so a re-run with one parameter changed re-executes only
what that parameter affects, and the run diff in the run view is exact rather than
inferred.

---

## 7. State in `apps/web`

| Kind                                              | Owner                                      |
| ------------------------------------------------- | ------------------------------------------ |
| Initial page data (projects, targets, schemes)    | **Server components**, fetched per request |
| Mutations (create, attach, reconcile, confirm)    | **Server actions** in `app/actions.ts`     |
| Live/polled state (run progress, workbench table) | **TanStack Query** — arrives in Phase 4    |
| Workbench UI state (selection, filters, panels)   | **Zustand** — arrives in Phase 5           |
| URL-addressable state (project, run, variant)     | **The route** — deep links must work       |

No Redux. Server data is never copied into Zustand; the store holds selection and view
state that references server data by id.

**Why the split.** Phases 2 and 3 have no polling and no optimistic updates, so a
client-side cache would be a second copy of state with nothing to justify it — server
components fetch, server actions mutate, `revalidatePath` refreshes. TanStack Query
enters in Phase 4, where run progress genuinely streams and a cache earns its place.
Adding it earlier would mean a provider wrapping the tree that nothing reads.

Server actions return `{ok, message, remedy}` rather than throwing, so an API failure
reaches the screen with its remedy intact instead of collapsing into an error boundary.

Tables are TanStack Table + TanStack Virtual from Phase 5. The bar is **10,000 rows at
60fps**, which means row components are memoised and cell renderers stay pure. The
small tables before then are the plain `components/ui/table` primitives.

---

## 8. Component boundaries in `apps/web`

```
components/ui/          Primitives. Radix underneath for behaviour and a11y; every
                        visual decision is ours. Knows nothing about proteins.
components/<domain>/    Domain components. Compose primitives. Know about proteins,
                        know nothing about HTTP.
app/                    Routes. Data fetching and composition.
lib/                    Pure helpers. No React, no network.
```

A primitive that grows a protein-specific prop has been put in the wrong directory.

---

## 9. Numbering — the expensive error

Off-by-one residue numbering is the single most costly mistake this application can make,
so numbering is modelled explicitly rather than assumed:

- A `Target` carries **multiple** numbering schemes (sequence, PDB author, construct).
- Reconciliation is a required setup step with its own UI, not a silent inference.
- The chosen canonical scheme's **name is rendered next to every mutation code** for the
  remainder of the project.
- Canonicality lives on `NumberingScheme.is_canonical`, guarded by a partial unique
  index (`uq_numbering_canonical`), so a target cannot have two canonical schemes.
  A pointer on `Target` would have closed a foreign-key cycle with
  `NumberingScheme.target_id` and left the two tables unorderable for creation.
- Mutation codes render in both forms — `A123V` and `p.Ala123Val` — always with the
  scheme label.

No layer is permitted to convert between schemes implicitly. Conversion is an explicit,
audited operation in `services/`.

---

## 10. Goal parsing — the confirmation gate

> **No run may start from a parse the user has not confirmed.**

Enforced in `services/goals.require_confirmed`, not in the UI. A check that exists only
on a screen is a check the API does not have, and Phase 4's worker is a second caller
that would bypass it.

- **The parser has no scientific authority.** It extracts what the sentence says and
  never supplies what it does not. Every field is optional; an absent field means "not
  stated", never a default. The JSON schema admits `null` for every field precisely so
  that "not stated" is never harder to express than a guess.
- **Two implementations, one interface.** Claude reads the sentence. A deterministic
  rule parser runs when there is no API key, on any API failure, on malformed output,
  and on a safety refusal — which returns HTTP 200 with `stop_reason: "refusal"`, so the
  stop reason is checked before content is ever read. A rule-based parse is always
  badged, because it matches phrases rather than reading sentences.
- **Editing a chip clears the confirmation.** What the user agreed to was that
  objective, not that database row.
- **The restatement is built from the parsed fields, never from the input.** Echoing the
  goal back would look correct no matter what the parser actually understood.
- **Expectations are shown before the run**, including that a stability prediction does
  not convert to a Tm shift and that stacked mutations are assumed additive.

### Constraints

Hard filters, so nothing is applied without acceptance. UniProt annotations are imported
as _suggestions_ carrying their source, and every position is translated out of UniProt
numbering into the target's canonical scheme first. On the seeded lipase, UniProt
annotates the catalytic nucleophile at 108 and the confirmed mature-protein scheme calls
it Ser77 — importing the raw number would misplace the most important residue on the
protein by 31 positions.

### How reconciliation actually works

1. **Exact correspondence first.** The chain is split into runs of consecutive author
   numbering; every run must be placeable at one shared offset. The offset relates
   author numbering to sequence index — _not_ position within the resolved residues,
   because author numbering stays continuous across an unresolved loop while the
   resolved list does not. Indexing the resolved list would slide every residue after
   a gap by the length of that gap.
2. **More than one placement is a question, not a coin flip.** Repeats produce an
   `AMBIGUOUS` outcome listing the candidates. The user picks.
3. **Alignment is never reached automatically.** `reconcile()` returns
   `NEEDS_ALIGNMENT` and stops. `align()` runs only on an explicit user action, and
   reports every difference before anything is applied.
4. **Insertion codes go straight to alignment.** 100/100A/100B occupy three sequence
   positions but advance the author number once, so the constant-offset assumption
   does not hold and is not approximated.

Alignment is semi-global Needleman-Wunsch with affine gaps and **identity scoring, not
BLOSUM62** — this maps a structure onto its own sequence, where the question is "which
residue is which", not "are these homologous". A substitution matrix would let a
chemically conservative difference slide into a match, which is the silent off-by-one
being guarded against. End gaps are free so a partial construct is not penalised for
the region it does not cover. The parameters are stored on every scheme produced this
way and shown in the UI; an alignment whose parameters are not stated is not
reproducible.

### Stored schemes are label lists, not offsets

`NumberingScheme.offsets` holds one label per sequence position, null where the scheme
does not cover it. A single integer offset would be a lie for all three of the cases
that actually occur: Ambler numbering skips residues by convention, crystal structures
leave gaps, and insertion codes are not integers.

### Confirming is separate from computing

Saving a reconciled mapping creates a scheme. It does **not** make it canonical.
`confirm_canonical` is a distinct call, writes a `ProvenanceEvent`, and is the only
thing that makes a target designable. Until then the API refuses to render a mutation
code at all, with a 409 — a code rendered against an unconfirmed scheme is precisely
the ambiguity this phase removes.
