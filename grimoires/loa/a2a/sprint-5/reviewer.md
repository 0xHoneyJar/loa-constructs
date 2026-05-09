# Sprint 5 Implementation Report (Partial)

**Sprint**: Sprint 5 — Persistent State + Iteration Auditor
**Cycle**: cycle-construct-bounded-context (simstim-20260508-96627a1c)
**Branch**: `cycle/construct-bounded-context`
**Beads**: `bd-nobi.6`
**Date**: 2026-05-08
**Commit**: `19e4eb09`
**Status**: PARTIAL — 5 of 8 tasks shipped + 1 stub. S5-T6/T7 deferred to Sprint 5b.

> Stale prior-cycle artifacts superseded.

---

## Executive Summary

Sprint 5 lands the persistent-state surface + iteration-auditor enumerate phase. The substrate now carries:
- **Composite-key persistent state** (project_id × composition_id × construct_slug × skill_slug × stage_id × schema_version) with atomic-rename writes + flock-coordinated concurrent access.
- **State-poisoning safeguard**: foreign-construct extension rejected with `[STATE-OWNERSHIP-VIOLATION]` (closes Flatline HIGH).
- **TTL policy**: `write` (default) + `access` (opt-in) per SDD §3.3.
- **Race-coordinated GC**: re-read-under-lock + mtime grace + flock 0-timeout.
- **Iteration auditor Phase 1**: walks compositions, enforces FR-7.2 mandate.

3 lib files (~1023 lines) + 2 bats suites (~335 lines, 19 tests). Combined matrix: **68/68 tests** (Sprint 1+2+3+5 bats + Sprint 0 schema gate).

---

## AC Verification

### Sprint 5 SHIPPED acceptance

> **AC-5.A**: Persistent state survives GC race in sentinel test.

✓ Met. `tests/composition/state/run.bats:115-149` — manual lock-holder in background subshell + concurrent GC. Asserts `total_skipped_locked >= 1` AND state file exists. Exercises real flock semantics.

> **AC-5.B**: Two compositions invoking same skill at different stages have independent state.

✓ Met. `tests/composition/state/run.bats:96-114` — same construct + skill + composition_id, different stage_id → distinct paths via composite key.

### Sprint 5 DEFERRED acceptance

> **AC-5.C**: Iteration dual-run produces L1+L2+L3 diff layers.

⏸ Deferred to Sprint 5b. The `--phase dual-run` STUB documents the L1/L2/L3 protocol + delegates legacy-baseline preview. Full integration requires Sprint 3+4 executor maturity to run BOTH `persistent_leak` AND `stream_edge` semantics.

> **AC-5.D**: Opt-in iteration flag respected.

⏸ Deferred to Sprint 5b. Auditor SURFACES `iteration_mode` field; runtime ENFORCEMENT lands with S5-T6.

### Per-task (5 of 8 + 1 stub + 1 closed-loop)

| ID | Status | Evidence |
|---|---|---|
| ✓ S5-T1 | Met | composite key + atomic-rename + flock; tests 1-4 |
| ✓ S5-T2 | Met | write/access policy + ownership safeguard; tests 5-8 |
| ✓ S5-T3 | Met | flock + mtime grace + re-read; tests 10-12 |
| ✓ S5-T4 | Met | sentinel test 13 |
| ✓ S5-T5 | Met | enumerate phase; iteration tests 1-5 |
| ⏸ S5-T6 | Stub | dual-run STUB documents L1/L2/L3; full → 5b |
| ⏸ S5-T7 | Stub | iteration_mode SURFACED; runtime → 5b |
| ✓ S5-T8 | Closed loop | Sprint 1's compose-stream-graph; auditor surfaces at corpus level |

---

## Tasks Completed

### S5-T1 — `lib/persistent-state.sh` (~520 lines)

API: `init / set / get / extend / path`. Composite key encoded as filesystem path (FR-5.1). Atomic-rename writes (close Flatline IMP-009 + HIGH on torn reads): write `.tmp` → fsync → rename. Portable flock via util-linux binary + mkdir fallback.

### S5-T2 — TTL policy + state-poisoning safeguard

`write` (default): TTL = last_updated + ttl_seconds. `access` (opt-in): TTL = last_accessed + ttl_seconds. Foreign-construct extension → `[STATE-OWNERSHIP-VIOLATION]` exit 1. Audit trail records construct + skill on every TTL extension.

### S5-T3 — `lib/compose-state-gc.sh` (~273 lines)

Daily cron pass. flock `-n -x` (0-timeout). RE-READ ttl_expires + mtime under lock. Skip if held / mtime within 4h grace. JSON summary buckets: deleted / skipped_locked / skipped_mtime / skipped_alive / errors.

**Subshell gotcha** (lines 97-115 documented): `( flock ; cmd ) 9>file` subshell drops parent array updates. Fix: `exec 9>file` in parent shell, run flock against FD 9 directly.

### S5-T4 — Sentinel test

`tests/composition/state/run.bats:115-149`. Background subshell holds lock; concurrent GC verifies `total_skipped_locked >= 1` AND state survives. Both flock + mkdir-fallback paths covered.

### S5-T5 — `lib/compose-iteration-audit.sh` Phase 1 (~231 lines)

Walks `compositions/`, `loa-compositions/compositions/`, fixtures. Reports `has_max_iterations` + `has_terminate_when` + `iteration_mode` + `compliant` per composition. Exit 1 if any violation.

Phase 2 (`--phase dual-run`) STUB: documents L1/L2/L3 layered-diff protocol, delegates legacy-baseline preview to compose-dry-run.

---

## Technical Highlights

**1. Subshell-vs-array gotcha**. `( flock ; cmd ) 9>file` is the textbook pattern but loses array updates because the body runs in a subshell. Fix: `exec 9>file` in parent shell. Documented inline; load-bearing for future `_with_lock` patterns.

**2. Portable fsync via python3**. macOS lacks GNU `stat -c` and `realpath -m`. Sprint 5 leans into Sprint 3's existing python3 fallback pattern: `os.fsync(os.open(path, O_RDONLY))`.

**3. `${VAR:-{}}` parsing gotcha**. Bash parses `${OPT_PAYLOAD:-{}}` as `${OPT_PAYLOAD:-{}` + literal `}` — yields `{}}` instead of `{}`. Fix: explicit conditional. Documented inline.

**4. Composite key collision avoidance**. Path encodes ALL six components; same skill at different stages within the SAME composition → distinct paths. Test 9 proves empirically.

**5. Audit trail append-only at JSON layer**. Operators inspect lifecycle without instrumenting the runner. Optional read-auditing via `LOA_PERSISTENT_STATE_AUDIT_READS=1`.

---

## Testing Summary

| Suite | Count | Status |
|---|---|---|
| state | 13 | ✓ 13/13 |
| iteration | 6 | ✓ 6/6 |
| **Sprint 5** | **19** | **✓ 19/19** |
| Sprint 1+2+3 carryforward | 40 | ✓ 40/40 |
| Sprint 0 schema gate | 9 | ✓ 9/9 |
| **Combined** | **68** | **✓ 68/68** |

---

## Known Limitations

1. **Dual-run + iteration_mode enforcement deferred to Sprint 5b** — both depend on Sprint 3+4 executor maturity.
2. **Slug regex permits `@:` for composition_id** — broader than Sprint 1+2 pattern; needed for SHA-suffixed composition_ids. Sprint 6 hardening's `lib/path-safety.py` must accommodate.
3. **mkdir-fallback flock has degraded shared semantics** — production SHOULD have flock installed.
4. **Empty leaf-dir cleanup best-effort** — GC removes version-leaf only; higher dirs left for operator cron.
5. **fsync is python3-best-effort** — strict-tier (Sprint 4) might want stronger durability.

---

## Verification Steps

```bash
# 1. All Sprint 5 tests
bats tests/composition/state/run.bats tests/composition/iteration/run.bats

# 2. Full regression
bats tests/composition/{state,iteration,runner,envelopes,validators,preflight,output-gate}/run.bats
.claude/scripts/composition-schema-validate.sh

# 3. End-to-end persistent-state demo
KEY=(--project-id demo --composition-id 'demo@sha256:abc' --construct-slug artisan --skill-slug decomposing-feel --stage-id demo.stage-1 --schema-version v1)
.claude/scripts/lib/persistent-state.sh init "${KEY[@]}" --payload-json '{"counter":0}'
.claude/scripts/lib/persistent-state.sh set "${KEY[@]}" --payload-json '{"counter":1}'
.claude/scripts/lib/persistent-state.sh get "${KEY[@]}" | jq '.payload'
.claude/scripts/lib/persistent-state.sh extend "${KEY[@]}" --calling-construct observer --calling-skill foo
# → [STATE-OWNERSHIP-VIOLATION], exit 1

# 4. GC + iteration audit
.claude/scripts/lib/compose-state-gc.sh --dry-run --json | jq '.summary'
.claude/scripts/lib/compose-iteration-audit.sh --phase enumerate --json | jq '{compositions_with_iterate, compliant}'
```

---

## Open Items / Recommendations

1. **Sprint 5b**: lands S5-T6 dual-run + S5-T7 runtime enforcement once executors are mature.
2. **Sprint 6 hardening**: slug regex broadened for `@:` (composition_id) in `lib/path-safety.py`. State path's composite-key join becomes a 4th caller of the safety helper.
3. **`compose-state-gc.sh` cron wiring** is operator-side; script is idempotent + dry-run-friendly.
4. **fsync durability boundary** — strict-tier may want full filesystem sync at composition boundary.

---

## Feedback Addressed

First reviewer for Sprint 5 in this cycle. Bridgebuilder PR-level findings (B-001 tier-cap, B-002 JCS dup, B-003 ✓ closed, B-004 schema_id intent) carry forward to Sprint 6 hardening bundle. Sprint 5 introduces a 4th call site for slug-as-path-component (composite key join), expanding F1 hardening scope by ONE caller.
