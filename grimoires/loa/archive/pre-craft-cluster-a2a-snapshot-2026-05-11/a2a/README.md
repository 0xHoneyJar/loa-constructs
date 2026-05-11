# Archived: a2a/sprint-{1..6} pre-craft-cluster snapshot

**Archived on**: 2026-05-11 during `/run-resume` of `cycle-craft-cluster`.

## Why

`cycle-craft-cluster` re-uses sprint numbers 1–6. The prior cycle (`cycle-construct-bounded-context`, 2026-05-08/09) and an even earlier explorer cycle (late 2025) had each left `COMPLETED`, `auditor-sprint-feedback.md`, and `engineer-feedback.md` files under `grimoires/loa/a2a/sprint-{1..6}/`. The Loa `implement` skill's Phase 0 reads those files first and short-circuits as "already approved" — so `cycle-craft-cluster` Sprint 2 (pair-relay primitive) could not begin without clearing the slots.

Per-cycle a2a scoping is tracked as a framework issue separately.

## What's inside

| Sprint dir | Owning cycle | Status at archive |
|---|---|---|
| `sprint-1/` | cycle-construct-bounded-context (Validators) | COMPLETED + APPROVED |
| `sprint-2/` | cycle-construct-bounded-context (Envelope Builder + Hash Chain) | COMPLETED + APPROVED |
| `sprint-3/` | cycle-construct-bounded-context (Stage Executor — Advisory) | COMPLETED PARTIAL + APPROVED |
| `sprint-4/` | pre-2026 explorer cycle (Launch Prep) | COMPLETED |
| `sprint-5/` | cycle-construct-bounded-context (Persistent State + Iteration Auditor) | COMPLETED PARTIAL + APPROVED |
| `sprint-6/` | pre-2026 explorer cycle (Dashboard Core Pages) | COMPLETED |

Each subdirectory preserves its original `COMPLETED` marker, which cites the true owning cycle.

## Restore

If a downstream tool ever needs to read the original `cycle-construct-bounded-context` audit + review history, the canonical path is now `grimoires/loa/archive/pre-craft-cluster-a2a-snapshot-2026-05-11/a2a/sprint-{N}/` — not `grimoires/loa/a2a/sprint-{N}/`.
