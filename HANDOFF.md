# Start here

You are picking up a multi-session build. This file orients you; it is the first
thing to read and the last thing to update.

Status current as of **2026-08-15, end of Phase 3**.

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
| 4 — job queue, `Predictor`, `MockProvider`, run view                | **Next**    |
| 5 — variant workbench, Mol\*, provenance drawer                     | Not started |
| 6 — real `ESMScorer` + `StabilityPredictor`                         | Not started |
| 7 — design sets, epistasis, wet-lab handoff                         | Not started |
| 8 — results intake, calibration, scorecard                          | Not started |
| 9 — Playwright, a11y, README                                        | Not started |

Exit gates for each phase are in `BRIEF.md` §9. Phase 4's is: _a run completes
end to end with demo banners correct everywhere._

## 4. Verify before you change anything

```sh
docker compose up -d
python scripts/verify_gates.py
```

30 checks asserting the Phase 2 and Phase 3 exit gates end to end over HTTP. It
seeds its own project and target, so it is idempotent and safe to re-run. **Add
a section to it for each phase you complete.**

Per-package gates, all currently green:

```sh
pnpm typecheck && pnpm lint && pnpm test           # 76 vitest
cd apps/api && .venv/Scripts/python -m pytest -q   # 143 pytest
cd apps/api && .venv/Scripts/ruff check . && .venv/Scripts/mypy catalyst
```

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

## 7. Open scientific decisions — ask, never decide

Each changes the advice this product gives a bench scientist.

| Decision                                                                    | Blocks                          |
| --------------------------------------------------------------------------- | ------------------------------- |
| Relative-solvent-accessibility cutoffs separating core / boundary / surface | Phase 5 rationale text, Phase 6 |
| Primer Tm algorithm and its parameters                                      | Phase 7 wet-lab handoff         |
| Fuzzy-join thresholds matching bench measurements to variants               | Phase 8 validation loop         |

Settled by the brief and **not** open: the ΔΔG sign convention (destabilizing
positive, kcal/mol, always with an interval), the >90% MSA conservation
high-risk flag, and the 8 Å epistasis pair-flag distance.

## 8. What Phase 4 will need to know

- `services/goals.require_confirmed` already exists and raises `ServiceError`.
  The run pipeline must call it — that is the Phase 3 gate's second caller and
  the reason the check lives in the service layer.
- `services/constraints.constrained_positions` returns
  `{position: [kind, ...]}`, built for the filter step so a removed variant can
  explain _why_ it was removed.
- `ModelVersion.is_mock` already exists and is indexed. The demo banner reads
  from `GET /meta`, which derives `demo_mode` from `CATALYST_PROVIDERS`
  containing `mock`. Both need to agree once real providers land.
- `Run`, `RunStage`, `Score`, `Variant` tables exist from migration
  `0001_initial`. No schema change should be needed to start.
- Redis is already running in compose. **No RQ worker service exists yet** — one
  was deliberately not added in Phase 1 rather than ship a container that did
  nothing.
- TanStack Query is not installed. `ARCHITECTURE.md` §7 says it enters in Phase 4
  when run progress genuinely streams.

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
