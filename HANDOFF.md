# Start here

You are picking up a multi-session build. This file orients you; it is the first
thing to read and the last thing to update.

Status current as of **2026-08-15, end of Phase 4**.

---

## 1. Read these, in this order

| #   | File              | What it gives you                                                                        | Authority                                                                |
| --- | ----------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | `BRIEF.md`        | What the product is, why, all nine screens, the phase plan with exit gates, domain rules | **The owner's specification.** Verbatim. Never edited to match the code. |
| 2   | `DESIGN.md`       | Every colour, type size, space, radius, shadow, easing — and what is banned              | Contract. Update in the same commit as any deviation.                    |
| 3   | `ARCHITECTURE.md` | Module boundaries, the numbering subsystem, the confirmation gate, state ownership       | Contract. Same rule.                                                     |
| 4   | This file         | Status, what is unverified, decisions made in conversation, machine quirks               | Status. Rots. Trust code and tests over it.                              |

If this file contradicts `BRIEF.md`, the brief wins. If it contradicts the code,
the code wins and this file needs fixing.

## 2. The three things that must never break

From `BRIEF.md` §2 — everything else is table stakes:

1. **Parse, then confirm.** Nothing runs from an objective the user has not
   explicitly confirmed. Enforced in `services/goals.require_confirmed`, not in
   the UI, because workers are a second caller.
2. **Every number is traceable.** A `Score` cannot exist without a
   `ModelVersion` and a `Run` — `NOT NULL` foreign keys, asserted by tests that
   no future migration may relax.
3. **The validation loop** (Phase 8). The brief calls it the entire moat.

And the honesty rule that cuts across all three: **never fabricate a scientific
number outside `MockProvider`.** Unavailable means `—` with a tooltip, never an
imputed value. An unstated field means "not stated", never a plausible default.

## 3. Where things stand

| Phase                                                               | State       |
| ------------------------------------------------------------------- | ----------- |
| 1 — monorepo, Docker, migrations, token layer, primitives, one page | Done        |
| 2 — target setup, numbering reconciliation, sequence track          | Done        |
| 3 — constraints, goal composer, confirmable parse                   | Done        |
| 4 — job queue, `Predictor`, `MockProvider`, run view                | Done        |
| 5 — variant workbench, Mol\*, provenance drawer                     | **Next**    |
| 6 — real `ESMScorer` + `StabilityPredictor`                         | Not started |
| 7 — design sets, epistasis, wet-lab handoff                         | Not started |
| 8 — results intake, calibration, scorecard                          | Not started |
| 9 — Playwright, a11y, README                                        | Not started |

Exit gates for each phase are in `BRIEF.md` §9. Phase 5's is: _10,000 rows
scroll at 60fps and any score traces to a model version in two clicks._

## 4. Verify before you change anything

```sh
docker compose up -d
python scripts/verify_gates.py
```

75 checks asserting the Phase 2, 3 and 4 exit gates end to end over HTTP. It
seeds its own project and target, so it is idempotent and safe to re-run. **Add
a section to it for each phase you complete.** The Phase 4 section needs the
`worker` container; it checks that first and says so if nothing is consuming the
queue.

Per-package gates, all currently green:

```sh
pnpm typecheck && pnpm lint && pnpm test           # 97 vitest
cd apps/api && .venv/Scripts/python -m pytest -q   # 225 pytest
cd apps/api && .venv/Scripts/ruff check . && .venv/Scripts/mypy catalyst
```

Python tests are hermetic — no database, no network, no Redis. Anything that
genuinely crosses Postgres is asserted in `verify_gates.py` instead, because that
is the boundary a future caller actually crosses. Keep it that way.

The design system is enforced mechanically, not by discipline:
`apps/web/test/tokens.test.ts` fails the build on a hex literal, an off-scale
type size, a stock Tailwind radius, a gradient, `backdrop-blur`, emoji, a third
shadow, or `rounded-full` outside status dots. It also asserts `DESIGN.md` and
`tokens.css` agree on every colour value. **If you need a new size or colour, add
a token to `DESIGN.md` — do not reach for an arbitrary value.**

## 5. What is NOT verified — read before claiming anything works

**The Claude goal parser has never run against the real API.** No
`ANTHROPIC_API_KEY` is configured, so every parse falls back to the deterministic
rule parser and is badged as such in the UI. Its failure branches (refusal,
truncation, non-JSON, API error) are covered hermetically in
`tests/test_claude_parser.py` against a fake client. The live path is
unexercised. Do not describe it as working until it has been called.

**No screen has been looked at by a human.** Rendering was verified by fetching
HTML and asserting on content — not pixels. `BRIEF.md` §4 is emphatic about how
this must look and that judgement has not yet been made. Ask the owner to open
`localhost:3000` before Phase 9, ideally sooner.

**`docker compose up` is verified; a cold clone is not.** It has always run on a
machine that already had images and a populated database.

**Every scientific number in the product is currently synthetic.** The only
provider is `MockProvider`, registered as two predictors. Its output is
deterministic and plausibly shaped, and it is marked as synthetic in five places:
the persistent bar, a badge on every scoring stage, an asterisk on every
individual number, `ModelVersion.is_mock` in the database, and `is_demo` on the
run and the ranking. Nothing outside `catalyst/providers/mock.py` invents a
number. Do not describe any ranking this build produces as a prediction.

**The 10,000-row bar has not been measured.** A run on the seeded lipase produces
3,439 variants and the run view previews ten of them in a plain table. Phase 5's
gate is 60fps at 10,000 rows on TanStack Virtual, and nothing has been profiled.

**Nothing has been re-run after a structure changed underneath a target.** The
content-address check that would catch it exists and is unit-tested; the live
path has not been exercised.

## 6. Decisions taken in conversation

Not derivable from the code. These were agreed with the owner.

- **Tooling and dependency choices are delegated to the assistant.** Pick them,
  state the reason in one line, do not open a question. Scientific defaults are
  the opposite — always escalate.
- **Goal parsing is Claude with a deterministic fallback**, not a structured form
  and not rules-only. The fallback is not a degraded mode: it is the offline path
  and the test path, and it runs on any API failure or safety refusal.
- **Parser model defaults to `claude-opus-5`**, overridable via
  `CATALYST_PARSER_MODEL`. An earlier Sonnet 5 suggestion was withdrawn —
  downgrading for cost is the owner's call, not the assistant's.
- **UniProt constraint annotations are suggestions, never auto-applied**, and
  every position is translated into the canonical numbering scheme first.
- **3D constraint picking deferred to Phase 5** when Mol\* lands. Phase 3 ships
  the linear sequence track only.
- **Alignment uses identity scoring, not BLOSUM62.** This was an assistant
  decision, flagged for the owner's review and **not yet re-confirmed**.
  Rationale in `ARCHITECTURE.md` §9. Reversible.
- **Proposed, not agreed:** doing Phase 8 before Phase 6. The scorecard works
  against ProteinGym measurements and mock predictions, so the moat does not
  depend on real models, and it keeps the GPU question open.
- **A run scores the entire single-point space and narrows afterwards.** Every
  substitution at every nameable position, then rank, then apply the budget the
  user actually stated. Any pre-filter — only buried positions, only conservative
  substitutions — would be a scientific choice made without asking.
- **Consensus is a mean of normalised ranks, not of scores.** Averaging kcal/mol
  with a log-likelihood ratio would produce a number that sorts and means
  nothing. Assistant decision; the arithmetic is in `domain/aggregate.py` and is
  reversible.
- **The consensus is not stored.** It is not a model output and would need a
  fabricated `ModelVersion` to become a `Score`. Aggregation, filtering and
  ranking are recomputed from stored scores on every read.

## 7. Open scientific decisions — ask, never decide

Each changes the advice this product gives a bench scientist.

| Decision                                                                     | Blocks                          |
| ---------------------------------------------------------------------------- | ------------------------------- |
| Relative-solvent-accessibility cutoffs separating core / boundary / surface  | Phase 5 rationale text, Phase 6 |
| Which objectives each **real** predictor may be offered for                  | Phase 6                         |
| Primer Tm algorithm and its parameters                                       | Phase 7 wet-lab handoff         |
| Fuzzy-join thresholds matching bench measurements to variants                | Phase 8 validation loop         |

On the second row: `Predictor.objectives` decides what the goal composer greys
out. The mock's coverage was chosen so the whole interface is exercisable and is
**not** a claim about any real model — `mock_fitness` currently claims seven
objectives. Before Phase 6 the owner must state, per real predictor, which
objectives it may be offered for. Inheriting the mock's list would have a
stability model quietly answering a specificity question.

`Variant.region` (core / boundary / surface) is null on every row and will stay
null until the RSA cutoffs are settled. The column exists; nothing populates it.

Settled by the brief and **not** open: the ΔΔG sign convention (destabilizing
positive, kcal/mol, always with an interval), the >90% MSA conservation
high-risk flag, and the 8 Å epistasis pair-flag distance.

## 8. What Phase 5 will need to know

The workbench is a screen over data that already exists. Nothing below needs a
schema change.

- **`GET /runs/{id}/ranking?limit=` is the table's source.** It returns rank,
  code, `hgvs`, `label`, `sequence_position`, consensus, disagreement, and one
  cell per metric carrying value, uncertainty, interval, `model_version_id` and
  `is_mock`. Omit `limit` for the whole ranking — 3,439 rows on the seeded
  lipase, which is the virtualisation test. `unavailable` maps a metric id to the
  reason it has no values; render those cells as `—` with that text, never zero.
- **Provenance in two clicks** is `model_version_id` on every cell →
  `ModelVersion` (name, version, weights hash, citation, `is_mock`) → the
  `RunStage` that produced it, with its own input hash and logs. The run view
  already renders the second half of that trail; the drawer needs the first.
- **`GET /runs/{id}/filtered`** returns `{code: [constraint kinds]}` from the
  provenance event the filter stage wrote. That is the "retrievable with the
  reason shown" requirement, already in the shape a panel wants.
- **Mutation codes are already written in the canonical scheme.** `code` is
  `S77A`, not `S108A`; `sequence_position` is the index behind it and is for the
  structure viewer, not for display. Do not render it as a residue number.
- **`Variant.features` is an empty dict on every row.** RSA, conservation and
  distance-to-active-site need an MSA provider and settled RSA cutoffs. The
  rationale paragraph the brief asks for must be composed from feature values
  that exist — with none yet, say so rather than write a paragraph from nothing.
- **Zustand is not installed.** `ARCHITECTURE.md` §7 says it enters in Phase 5
  for selection, filters and panel sizes. TanStack Query is installed and the
  provider wraps the whole tree already.
- **TanStack Table and TanStack Virtual are not installed.** Phase 5 is where
  they land, per `BRIEF.md` §3.
- The `worker` container is in compose and `GET /queue` reports whether anything
  is consuming the queue. The run view uses it to explain a stalled run instead
  of spinning; the workbench probably does not need it.

## 9. Machine quirks

- **Postgres is on host port 5433**, not 5432 — another project's container
  (`nexus-db-1`) holds 5432. Configurable via `POSTGRES_PORT` / `REDIS_PORT`.
- **pnpm is a corepack shim** in `%APPDATA%\npm`. If missing:
  `corepack enable --install-directory "$env:APPDATA\npm"`.
- **Docker Desktop is under `%LOCALAPPDATA%\Programs\DockerDesktop`** and will
  not start from a non-interactive process — a human must launch it.
- **PowerShell 5.1 corrupts here-strings containing double quotes** when passing
  them to native commands. Write long commit messages to a file and use
  `git commit -F`.
- **The web container needs `API_INTERNAL_URL`.** Server components run inside
  the container, where `localhost` is the web container itself, not the API.
- **Adding a web dependency needs the image rebuilt, not just restarted.**
  `node_modules` lives in anonymous volumes that shadow the bind mount, so
  installing on the host is invisible to the container. Use
  `docker compose up -d --build --renew-anon-volumes web`.
- **The Windows console is cp1252** and cannot encode `→` or `°`.
  `verify_gates.py` reconfigures its own streams to UTF-8; anything else printing
  those characters needs `PYTHONIOENCODING=utf-8`.

## 10. Working agreement

- Build in the numbered phases from `BRIEF.md` §9. After each: typecheck, lint,
  tests, fix everything red, commit with a real message.
- **Stop and check in at the end of each phase. Do not silently continue.**
- A smaller number of finished screens beats a full skeleton.
- Ask before adding a dependency outside `BRIEF.md` §3. Ask before inventing any
  scientific default.
- Commit messages here run 40+ lines on purpose. They carry the reasoning a
  summarised conversation loses. Keep writing them that way.
- Update this file's §3 and §5 in the same commit that changes them.
