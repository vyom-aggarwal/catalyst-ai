# Handoff — state of the build

Written 2026-08-15, at the end of Phase 3. This file records what is true, what
is verified, and what was decided in conversation and would otherwise be lost.

`DESIGN.md` and `ARCHITECTURE.md` are the contracts and are authoritative. This
file is _status_, which rots — trust the code, the tests, and those two files
over anything here that contradicts them.

---

## 1. Where things stand

Phases 1–3 of the brief are complete and committed. Phases 4–9 remain.

| Phase                                                               | State       |
| ------------------------------------------------------------------- | ----------- |
| 1 — monorepo, Docker, migrations, token layer, primitives, one page | Done        |
| 2 — target setup, numbering reconciliation, sequence track          | Done        |
| 3 — constraints, goal composer, confirmable parse                   | Done        |
| 4 — job queue, `Predictor`, `MockProvider`, run view                | Not started |
| 5 — variant workbench, Mol\*, provenance drawer                     | Not started |
| 6 — real `ESMScorer` + `StabilityPredictor`                         | Not started |
| 7 — design sets, epistasis, wet-lab handoff                         | Not started |
| 8 — results intake, calibration, scorecard                          | Not started |
| 9 — Playwright, a11y, README                                        | Not started |

## 2. Verifying in one command

```sh
docker compose up -d
python scripts/verify_gates.py
```

That asserts the Phase 2 and Phase 3 exit gates end to end over HTTP, seeding
its own project and target so it is idempotent. Run it before and after any
change that touches numbering, goals, or constraints.

The per-package gates:

```sh
pnpm typecheck && pnpm lint && pnpm test          # 76 vitest
cd apps/api && .venv/Scripts/python -m pytest -q  # 143 pytest
cd apps/api && .venv/Scripts/ruff check . && .venv/Scripts/mypy catalyst
```

## 3. What is NOT verified

**The Claude goal parser has never been run against the real API.** No
`ANTHROPIC_API_KEY` has been configured, so every parse falls back to the
deterministic rule parser and is badged as such in the UI. Its failure branches
(refusal, truncation, non-JSON, API error) are covered by hermetic tests against
a fake client in `tests/test_claude_parser.py`, but the live path is unexercised.
Do not describe it as working until it has been called.

**No screen has been checked visually.** Rendering was verified by fetching the
HTML and asserting on content. Nobody has looked at the pixels, and §4 of the
brief is emphatic about how this should look. A human should open
`localhost:3000` and judge it before Phase 9.

## 4. Decisions made in conversation

These are not obvious from the code and were agreed in chat.

- **Tooling and dependency choices are delegated.** Pick them, state the reason
  in one line, do not open a question. Scientific defaults are the opposite —
  always escalate those.
- **Goal parsing: Claude with a deterministic fallback.** Not a structured form,
  not rules-only. The fallback is not a degraded mode; it is the offline path
  and the test path.
- **Parser model defaults to `claude-opus-5`**, overridable with
  `CATALYST_PARSER_MODEL`. An earlier suggestion of Sonnet 5 was withdrawn:
  downgrading for cost is the user's decision, not the assistant's.
- **UniProt constraints are imported as suggestions, never auto-applied**, and
  every position is translated into the canonical scheme first.
- **3D constraint picking was deferred to Phase 5**, when Mol\* lands. Phase 3
  ships the linear sequence track only.
- **Alignment uses identity scoring, not BLOSUM62.** This was an assistant
  decision, flagged for review and not yet re-confirmed. Rationale is in
  `ARCHITECTURE.md` §9; it is reversible.
- **Suggested resequencing:** Phase 8 (the validation loop, and the brief's
  stated moat) does not depend on Phase 6 having real models — the scorecard
  works against ProteinGym measurements and mock predictions. Doing 8 before 6
  would land the differentiating feature while the GPU question stays open.
  Not agreed, just proposed.

## 5. Environment quirks on this machine

- **Postgres is published on host port 5433**, not 5432, because another
  project's container (`nexus-db-1`) holds 5432. Both ports are env-configurable
  via `POSTGRES_PORT` / `REDIS_PORT`.
- **pnpm is a corepack shim** installed into `%APPDATA%\npm`. If `pnpm` is not
  found, re-run `corepack enable --install-directory "$env:APPDATA\npm"`.
- **Docker Desktop lives under `%LOCALAPPDATA%\Programs\DockerDesktop`**, not
  Program Files, and will not start from a non-interactive process — a human has
  to launch it.
- **PowerShell 5.1 mangles here-strings containing double quotes** when passing
  them to native commands. Write long commit messages to a file and use
  `git commit -F`.

## 6. Open scientific decisions

Each changes the advice the product gives a bench scientist. None should be
decided by the assistant.

| Decision                                                                    | Blocks                          |
| --------------------------------------------------------------------------- | ------------------------------- |
| Relative-solvent-accessibility cutoffs separating core / boundary / surface | Phase 5 rationale text, Phase 6 |
| Primer Tm algorithm and its parameters                                      | Phase 7 wet-lab handoff         |
| Fuzzy-join thresholds matching bench measurements to variants               | Phase 8 validation loop         |

Already settled by the brief and not open: the ΔΔG sign convention
(destabilizing positive, kcal/mol, always with an interval), the >90% MSA
conservation high-risk flag, and the 8 Å epistasis pair-flag distance.

## 7. Working agreement

- Build in the numbered phases. After each: typecheck, lint, tests, fix
  everything red, commit with a real message.
- **Stop and check in at the end of each phase.** Do not silently continue.
- A smaller number of finished screens beats a full skeleton.
- Commit messages here are long on purpose. They carry the reasoning that a
  summarised conversation would otherwise lose.
