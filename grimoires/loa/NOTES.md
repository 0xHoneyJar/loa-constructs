# Loa Project Notes

## Session Continuity — 2026-04-23 (cycle-012 · constructs-api libSQL sovereign-landing)

### Current state (mid-cycle, operator-gated pause)

**Branch**: `feat/spiral-loa-constructs-cycle-012-api-libsql-migration` (cut from main, 3 commits ahead)
**Simstim ID**: `simstim-20260423-6d5187da`
**Beads umbrella**: `bd-1o9` (13 children bd-1o9.1–13)
**Completed**: T1.1 (branch+preflight) · T1.2 (schema) · T1.3 (SQL audit) · T1.4 (db client) · T1.5 (route port) · T1.6 (route prune)
**Paused at**: T1.7 (Turso provision + Railway env wire) — requires operator credentials

### Build state
- `bun run typecheck` **PASSES**
- `bun run build` **PASSES** (dist/index.js 40.15 KB)
- Migration SQL generated: `apps/api/drizzle/0000_red_katie_power.sql` (4 tables, 12 indexes, 4 CHECK constraints)
- Postgres-era schema (30 tables, 14 migrations) + 14 dead routers + 25+ services removed per [[tool-absence-as-enforcement]]

### Operator action required before T1.7 resumes

```bash
# 1. Authenticate Turso CLI (not logged in as of T1.1 preflight)
turso auth login

# 2. Provision prod DB
turso db create constructs-network-prod
# Capture: DB URL (libsql://<db>-<org>.turso.io) + auth token

# 3. Wire Railway env vars (prod)
railway variables --set "TURSO_DATABASE_URL=libsql://..."
railway variables --set "TURSO_AUTH_TOKEN=..."
# Keep DATABASE_URL set until T1.9 cutover (safety)

# 4. Confirm and resume
/run-resume   # or continue /simstim session
```

### Resume plan
After operator completes above: T1.7 → T1.8 (dev rehearsal) → T1.9 (prod cutover with go/no-go + rollback) → T1.10 (backup/DR: R2 daily dumps + runbook) → T1.11 (UI smoke per [[builder-touch-imperative]]) → T1.12 (doctrine amend: [[saas-exit-vectors]] instance-1 executed) → T1.13 (L-close: findings F50+, KANSEI, cycle-013 handoff) → consolidated PR.

### Key artifacts
- PRD: `grimoires/loa/prd.md` (13 FRs, 7 NFRs — libSQL-flavored)
- SDD: `grimoires/loa/sdd.md` (5 tables, 7 routers target, migration strategy in §5)
- Sprint: `grimoires/loa/sprint.md` (13 tasks T1.1-T1.13)
- SEED: `grimoires/loa-constructs-seed-2026-04-21/cycle-012-SEED-constructs-api-libsql-migration.md`
- SQL audit: `apps/api/drizzle/.sql-audit.md` (13 L* rewrites, 14 D* deletions)

### Flatline integrations (landed in commits)
- SKP-001: single-instance constraint (rate-limit in-memory, escalation path documented)
- SKP-002: admin audit (`discovery_runs.triggered_by_fingerprint/ip/user_agent`)
- SKP-003-HIGH: R2 backups (T1.10 pending)
- SKP-003-CRITICAL: data-migration rejection logged to state
- SKP-004: dev-rehearsal gate (T1.8 pending)
- SKP-005: trusted-IP middleware with precedence
- IMP-005: atomic counter semantics (`sql\`${packs.view_count} + 1\``)
- IMP-006: schema governance doc (T1.10 alongside DR)

---

## Session Continuity — 2026-04-13 (cycles 052-054)

### Current state
- **cycle-052** (PR #463) — MERGED: Multi-model Bridgebuilder pipeline + Pass-2 enrichment
- **sprint-bug-104** (PR #465) — MERGED: A1+A2+A3 follow-ups (stdin, warn, docblock)
- **cycle-053** (PR #466) — MERGED: Amendment 1 post-PR loop + kaironic convergence
- **cycle-054** (PR #468) — OPEN: Enable Bridgebuilder on this repo (Option A rollout)

### How to restore context
See **Issue #467** — holds full roadmap, proposal doc references, and session trajectory.

Key entry points:
- `grimoires/loa/proposals/close-bridgebuilder-loop.md` (design rationale)
- `grimoires/loa/proposals/amendment-1-sprint-plan.md` (sprint breakdown)
- `.claude/loa/reference/run-bridge-reference.md` (post-PR integration + kaironic pattern)
- `.run/bridge-triage-convergence.json` (if exists — latest convergence state)
- `grimoires/loa/a2a/trajectory/bridge-triage-*.jsonl` (per-decision audit trail)

### Open work (see #467 for full detail)
- **Option A** — Enable + observe (PR #468 in flight)
- **Option B** — Amendment 2: auto-dispatch `.run/bridge-pending-bugs.jsonl` via `/bug`
- **Option C** — Wire A4 (cross-repo) + A5 (lore loading) from Issue #464
- **Option D** — Amendment 3: pattern aggregation across PRs

### Recent HITL design decisions (locked)
1. Autonomous mode acts on BLOCKERs with mandatory logged reasoning (schema: minLength 10)
2. False positives acceptable during experimental phase
3. Depth 5 inherit from `/run-bridge`
4. No cost gating yet — collect data first
5. Production monitoring: manual + scheduled supported

---

# cycle-040 Notes

## Rollback Plan (Multi-Model Adversarial Review Upgrade)

### Full Rollback

Single-commit revert restores all previous defaults:

```bash
git revert <commit-hash>
```

### Partial Rollback — Disable Tertiary Only

```yaml
# .loa.config.yaml — remove or comment out:
hounfour:
  # flatline_tertiary_model: gemini-2.5-pro
```

Flatline reverts to 2-model mode (Opus + GPT-5.3-codex). No code changes needed.

### Partial Rollback — Revert Secondary to GPT-5.2

```yaml
# .loa.config.yaml
flatline_protocol:
  models:
    secondary: gpt-5.2

red_team:
  models:
    attacker_secondary: gpt-5.2
    defender_secondary: gpt-5.2
```

Also revert in:
- `.claude/defaults/model-config.yaml`: `reviewer` and `reasoning` aliases back to `openai:gpt-5.2`
- `.claude/scripts/gpt-review-api.sh`: `DEFAULT_MODELS` prd/sdd/sprint back to `gpt-5.2`
- `.claude/scripts/flatline-orchestrator.sh`: `get_model_secondary()` default back to `gpt-5.2`

## Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-26 | Cache: result stored [key: integrit...] | Source: cache |
| 2026-02-26 | Cache: result stored [key: clear-te...] | Source: cache |
| 2026-02-26 | Cache: result stored [key: clear-te...] | Source: cache |
| 2026-02-26 | Cache: result stored [key: stats-te...] | Source: cache |
| 2026-02-26 | Cache: result stored [key: stats-te...] | Source: cache |
| 2026-02-26 | Cache: result stored [key: test-sec...] | Source: cache |
| 2026-02-26 | Cache: result stored [key: test-key...] | Source: cache |
| 2026-02-26 | Cache: PASS [key: test-key...] | Source: cache |
| 2026-02-26 | Cache: PASS [key: test-key...] | Source: cache |
| 2026-02-26 | Cache: result stored [key: integrit...] | Source: cache |
| 2026-02-26 | Cache: result stored [key: clear-te...] | Source: cache |
| 2026-02-26 | Cache: result stored [key: clear-te...] | Source: cache |
| 2026-02-26 | Cache: result stored [key: stats-te...] | Source: cache |
| 2026-02-26 | Cache: result stored [key: stats-te...] | Source: cache |
| 2026-02-26 | Cache: result stored [key: test-sec...] | Source: cache |
| 2026-02-26 | Cache: result stored [key: test-key...] | Source: cache |
| 2026-02-26 | Cache: PASS [key: test-key...] | Source: cache |
| 2026-02-26 | Cache: PASS [key: test-key...] | Source: cache |
## Blockers

None.
