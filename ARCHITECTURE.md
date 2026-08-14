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

| Kind                                            | Owner                                |
| ----------------------------------------------- | ------------------------------------ |
| Server state (projects, runs, variants, scores) | **TanStack Query**                   |
| Workbench UI state (selection, filters, panels) | **Zustand**                          |
| URL-addressable state (project, run, variant)   | **The route** — deep links must work |

No Redux. Server data is never copied into Zustand; the store holds selection and view
state that references server data by id.

Tables are TanStack Table + TanStack Virtual. The bar is **10,000 rows at 60fps**, which
means row components are memoised and cell renderers stay pure.

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
