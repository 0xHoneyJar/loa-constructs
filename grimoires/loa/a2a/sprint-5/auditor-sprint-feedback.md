# Sprint 5 Security Audit — Paranoid Cypherpunk Auditor

**Sprint**: Sprint 5 — Persistent State + Iteration Auditor — PARTIAL (5 of 8 + 1 stub)
**Cycle**: cycle-construct-bounded-context (`simstim-20260508-96627a1c`)
**Date**: 2026-05-08
**Verdict**: **APPROVED - LETS FUCKING GO**
**Risk Level**: MEDIUM (4 carry-forward findings + 1 NEW LOW)

> Stale prior-cycle audit superseded.

---

## Verdict

**APPROVED - LETS FUCKING GO** ⚠

Sprint 5 ships 5 of 8 security-load-bearing tasks. The persistent-state surface correctly implements:
- Composite key collision prevention (FR-5.1).
- Atomic-rename writes via tmp + fsync + rename (closes Flatline IMP-009 + HIGH).
- Foreign-construct extension rejection via `[STATE-OWNERSHIP-VIOLATION]` (closes Flatline HIGH on state poisoning).
- Race-coordinated GC with re-read-under-lock + mtime grace (closes Flatline HIGH on GC race).

Findings: 4 MEDIUM carry-forward (F1-F4 from Sprints 1+2 + Bridgebuilder B-001+B-002+B-004) + 1 NEW LOW (test-mode flag exposed as operational flag).

## Defense Layers Validated ✓

- **No secrets**: scanned 5 Sprint 5 files (3 lib + 2 tests) for credentials/tokens — zero hits.
- **YAML deserialization**: `yq -o=json` + jq pipeline; no `yaml.load()` paths.
- **JSON deserialization**: `jq empty` validates input before `--argjson` insertion (composite-key writes); reads validated structurally before mutation.
- **Atomic-rename**: write-tmp → fsync → rename → release lock. POSIX-atomic on the rename; fsync ensures durability before the rename.
- **flock-coordinated**: writers acquire exclusive lock; concurrent readers serialize against writers (chose simplicity over shared-lock optimization given small state file size).
- **Composite-key collision avoidance**: path encodes ALL six key components (project_id × composition_id × construct_slug × skill_slug × stage_id × schema_version). Same skill at different stages → distinct paths → no state mixing.
- **Ownership cross-check at write/extend**: state file records `ownership.owning_construct` at init; subsequent set/extend operations verify caller against owner. Foreign callers refused with `[STATE-OWNERSHIP-VIOLATION]`.
- **Audit trail append-only**: every mutation records `{ts, op, actor: {construct, skill}}`. Optional read auditing via env var (off by default — read traffic is high-frequency).
- **GC race coordination**: pre-lock check + acquire flock with 0-timeout + re-read ttl_expires + re-check mtime. The re-read-under-lock is the load-bearing pattern — catches concurrent extensions between directory walk and lock acquisition.
- **mtime grace window** (4h default): heuristic protection against long-running compositions matching L3's `max_cycle_seconds` default. Sentinel test exercises real flock contention.
- **Slug regex**: validates each key component against `^[A-Za-z0-9][A-Za-z0-9_./@:-]{0,255}$` BEFORE path join. Rejects `..` traversal explicitly. Composition_ids carry `@:` (SHA suffix) which is the broader pattern.

## Threat Model Status

| Threat | Status | Note |
|---|---|---|
| State poisoning via foreign-construct TTL extension | ✓ Mitigated | Ownership check at extend; tests 5+6 |
| Torn read on concurrent write | ✓ Mitigated | Atomic-rename pattern; flock |
| Lost update on concurrent writer | ✓ Mitigated | Exclusive flock during set |
| GC reaps live state mid-write | ✓ Mitigated | flock 0-timeout skip + re-read under lock |
| GC reaps state extended just before sweep | ✓ Mitigated | Re-read ttl_expires under lock |
| Path traversal via composite-key components | ✓ Mitigated | Slug regex + `..` rejection |
| Schema migration silently corrupts payload | ✓ Mitigated | Schema-version mismatch returns `[STATE-SCHEMA-MIGRATION]` (no auto-migrate) |
| Carry-forward F1-F4 + B-001/B-002/B-004 | ⚠ Sprint 6 | All deferred to Sprint 6 hardening bundle |
| `--ttl-clock-skew-seconds` operator misuse | ⚠ Lint | Finding #5 NEW (LOW) |

## Findings

### Findings #1-#4 (UNCHANGED) — Carry-forward from Sprint 1+2 + Bridgebuilder B-001/B-002/B-004

All 4 carry-forward findings remain. Sprint 5 does NOT introduce new vectors of these classes:
- **F1 slug path traversal**: Sprint 5's `_validate_slug` adds DEFENSE-IN-DEPTH at the persistent-state boundary (rejects `..`, length-bounds, charset-bounds). The path-safety bundle in Sprint 6 should adopt this pattern across all 4 callers.
- **F2 schema_id absolute-path traversal**: Sprint 5 doesn't touch output-gate; surface unchanged.
- **F3 JCS fallback breadth**: Sprint 5 doesn't introduce new JCS sites — state envelope is jq-merged, not hash-recomputed. Surface stays at 4 sites.
- **B-001 tier-cap not enforced at runner boundary**: Sprint 5's persistent-state inherits whatever tier the caller is in. Runner-level tier-cap remains the correct gate; this layer doesn't open new bypass.
- **B-002 JCS dup**: same as F3.
- **B-004 schema_id semantic intent**: Sprint 5 doesn't validate schema content; pure storage.

### Finding #5 — LOW (NEW) — `--ttl-clock-skew-seconds` exposes destructive operational potential

**Location**: `.claude/scripts/lib/compose-state-gc.sh:33`.

**Vector**: `--ttl-clock-skew-seconds N` advances the GC's effective NOW by N seconds. Tests use small positive values (e.g., 120) to expire just-created state. An operator could run `compose-state-gc.sh --ttl-clock-skew-seconds 31536000` (1 year) and destroy all persistent state in one pass.

**Why LOW (not blocking)**:
- The flag is publicly documented in the usage block.
- The default (0) preserves correct semantics.
- Operators with destructive intent could use `find ... -delete` directly anyway; the flag is convenience, not unique attack surface.

**Recommendation**: Either (a) split the test-mode flag from operational use (e.g., `LOA_GC_TEST_CLOCK_SKEW=N` env var, ONLY honored when `LOA_GC_TEST_MODE=1`), OR (b) add a confirmation prompt for `--ttl-clock-skew-seconds > 3600` with operator override flag (`--yes`). Option (a) is more conservative; closes the test/operational seam properly.

### Verification That Sprint 5 Doesn't Open NEW Vectors Beyond Findings

- ✓ `_validate_slug` rejects `..`, charset-bounds, length-bounds before path join.
- ✓ flock acquisition uses `exec 9>file` pattern (NOT `( flock ; cmd ) 9>file` subshell).
- ✓ `set`'s ownership check happens BEFORE the merge; rejected callers can't observe internal state via error messages (rejection message includes only path + construct slug).
- ✓ Audit trail is append-only at the JSON layer; no tampering surface beyond the file itself (which is flock-protected).
- ✓ Iteration auditor's `--phase dual-run` STUB doesn't actually execute anything — it delegates to compose-dry-run for the legacy-baseline preview.
- ✓ Empty-array expansion uses `${arr[@]+"${arr[@]}"}` style under set -u.
- ✓ jq invocations use `--arg / --argjson` consistently.
- ✓ JSON validation before `--argjson` insertion (closes the empty-string-as-JSON gotcha).
- ✓ `python3 -c` heredocs use `<<'PY'` quoted delimiter (prevents `${...}` expansion).

## Sprint 5 vs. Sprint 1+2+3 Audit Continuity

Sprint 1: 2 MEDIUM closed for tracking. Sprint 2: 1 MEDIUM new (JCS breadth). Sprint 3: 0 new MEDIUM, 1 NEW LOW (dead-code arrays). Sprint 5: 0 new MEDIUM, 1 NEW LOW (test-flag operational risk).

Cycle's accumulated finding count: 3 MEDIUM (F1+F2+F3) + Bridgebuilder's 3 MEDIUM (B-001+B-002+B-004; B-003 ✓ closed) + 2 LOW (F4 dead-code + Finding #5 GC test flag).

Sprint 6 hardening bundle now sized at **~120 LOC across 5 areas**:
1. `lib/path-safety.py` — slug regex + realpath containment + parameterized by call site (pack-slug vs composition-id vs schema-id).
2. `lib/jcs-fallback.py` — shared canonicalizer with `audit_signed: true` fail-closed guard.
3. `output-gate._stream_schema_path` — schema_id regex enforcement.
4. `stage-runner-advisory.sh` — wire canonicalized writes through OR remove dead arrays.
5. `lib/locks.sh` — shared `with_lock` helper using `exec 9>file` pattern (CONCERN-1 from review).
6. `compose-state-gc.sh` — gate `--ttl-clock-skew-seconds` behind LOA_GC_TEST_MODE env (NEW LOW).

## Test Coverage of Security-Adjacent Paths

| Path | Test | Status |
|---|---|---|
| Composite-key collision avoidance | `tests/composition/state/run.bats:96-114` | ✓ Passes |
| Foreign-construct extension rejection | `tests/composition/state/run.bats:53-58` | ✓ Passes ([STATE-OWNERSHIP-VIOLATION]) |
| TTL policy: write does not extend | `tests/composition/state/run.bats:75-83` | ✓ Passes |
| TTL policy: access extends | `tests/composition/state/run.bats:85-93` | ✓ Passes |
| GC race: state survives concurrent flock | `tests/composition/state/run.bats:115-149` | ✓ Passes |
| GC mtime grace window | `tests/composition/state/run.bats:160-167` | ✓ Passes |
| Iteration FR-7.2 mandate enforcement | `tests/composition/iteration/run.bats:65-79` | ✓ Passes |

Adversarial patterns absent (out of scope; tracked):
- Concurrent writer race (multi-process write contention) — covered by flock semantics; no explicit multi-process test (expensive in bats).
- Rapid TTL extension flood — would be caught by audit-trail review; no rate-limit at this layer.
- Symlink swap on persistent state path — slug regex blocks `..`; production would use realpath via Sprint 6's `lib/path-safety.py`.

## Beads Integration

```
br comments add bd-nobi.6 "AUDIT APPROVED 2026-05-08 (PARTIAL — 5 of 8 + 1 stub). Verdict: LETS FUCKING GO. 4 carry-forward findings (F1-F4 + B-001/B-002/B-004) — none introduced this sprint. 1 NEW LOW (Finding #5: --ttl-clock-skew-seconds operational risk; gate behind LOA_GC_TEST_MODE in Sprint 6). Sprint 6 hardening bundle now ~120 LOC across 6 areas. Persistent-state surface defends against state poisoning, GC race, composite-key collision, schema migration, slug traversal."
br label add bd-nobi.6 security-approved
```

## Recommendation Forward

1. **Sprint 6 hardening bundle** (~120 LOC, 6 areas): closes F1-F4 + B-001/B-002/B-004 + Finding #5. Add CONCERN-1 (shared `lib/locks.sh`) + CONCERN-2 (NOTES.md gotchas section).
2. **Sprint 5b**: dual-run + iteration_mode runtime enforcement once Sprint 3+4 executors are mature.
3. **Operator runbook for `compose-state-gc.sh`** — document that `--ttl-clock-skew-seconds` is a test-mode flag; operational state migrations use explicit invalidation, not clock-skew.

Sprint 5 (PARTIAL) is **APPROVED** for landing. The 5 shipped tasks are high-quality, well-tested, and close 4 distinct Flatline/Bridgebuilder concerns (state poisoning, GC race, composite-key collision, FR-7.2 mandate enforcement at corpus level). The 3 deferrals + 5 carry-forward findings + 1 new LOW all have a single Sprint 6 hardening bundle as remediation.
