# Senior Tech Lead Review: Sprint 5 (PARTIAL)

**Sprint**: Sprint 5 — Persistent State + Iteration Auditor — PARTIAL (5 of 8 + 1 stub)
**Cycle**: cycle-construct-bounded-context (simstim-20260508-96627a1c)
**Reviewer**: senior-tech-lead (rival mode)
**Date**: 2026-05-08
**Verdict**: **All good (with noted concerns) — partial-sprint approval**

> Stale prior-cycle review superseded.

---

## Overall Assessment

Sprint 5 partial — 5 of 8 tasks shipped + 1 STUB. The 5 shipped tasks are the security-load-bearing ones: composite-key persistent state with state-poisoning safeguard, race-coordinated GC, iteration auditor enumerate phase. The 2 deferrals (S5-T6 dual-run, S5-T7 runtime enforcement) are honest capability deferrals — both depend on Sprint 3+4 executor maturity to actually run BOTH `persistent_leak` AND `stream_edge` semantics.

Reviewer.md walks every AC verbatim with file:line evidence + explicit `⏸ Deferred` markers tied to Sprint 5b forward owner. cycle-057 / Issue #475 gate satisfied.

---

## Adversarial Analysis

### Concerns Identified (3)

**CONCERN-1 (medium, non-blocking)** — Subshell-vs-array gotcha is now repeated technical debt across the substrate.

`compose-state-gc.sh:97-115` documents the `( flock ; cmd ) 9>file` subshell trap. Earlier sprints likely have the same anti-pattern lurking — Sprint 1's `output-gate.py` doesn't use flock, but `audit-keys-preflight.sh` and `strict-tier-prereq.sh` use compose patterns with subshells too. If a future contributor copies the textbook `( flock ; ... ) 9>file` form into a new helper, they re-encounter the bug.

**Recommendation**: Sprint 6 hardening should extract a shared `lib/locks.sh` with a `with_lock <file> <mode> -- <cmd...>` helper that uses the `exec 9>file` pattern. ALL future flock callers import it. ~30 lines + 3 bats tests.

**CONCERN-2 (low, non-blocking)** — `${VAR:-{}}` default-value gotcha is a third gotcha class added inline only.

Sprint 5 documents the bash-parses-`{}`-weirdly issue at persistent-state.sh:248. Earlier sprints don't have this surface (no JSON defaults), but the cycle's NOTES.md should accumulate THESE gotchas as a single section operators can scan before they trip. Currently the gotchas are scattered across reviewer.md files (Sprint 1's `select(length>0)`, Sprint 2's sibling-module loading, Sprint 3's pwd -P, Sprint 5's two new ones).

**Recommendation**: Sprint 6 NOTES.md update — single section "Bash + jq gotchas in this substrate (don't recreate)" with ~5 entries. Doesn't change code; reduces re-discovery risk.

**CONCERN-3 (medium, non-blocking)** — Sprint 5 introduces a 4th caller of slug-as-path-component without yet having `lib/path-safety.py`.

`persistent-state.sh:113-128` validates slugs inline against `^[A-Za-z0-9][A-Za-z0-9_./@:-]{0,255}$` — broader than Sprint 1's pattern (allows `@:` for composition_id). The cycle now has FOUR callers needing slug-as-path validation:
1. `compose-stream-graph._resolve_manifest` (Sprint 1)
2. `envelope-builder._resolve_manifest` (Sprint 2)
3. `output-gate._stream_schema_path` (Sprint 1)
4. `persistent-state._validate_slug` + composite path join (Sprint 5)

Sprint 6 hardening's `lib/path-safety.py` MUST accommodate the broader `@:` pattern (composition_ids are SHA-suffixed). The state path's composite-key join is a NEW shape (multi-component path build) the safety helper must support.

**Recommendation**: When Sprint 6 designs `lib/path-safety.py`, parameterize the slug regex by call site (one of: `pack-slug`, `composition-id`, `schema-id`). Don't conflate the patterns into one over-permissive regex.

### Assumption Challenged

**Assumption**: GC's `--ttl-clock-skew-seconds` is a TEST-MODE knob, not an operational one.

**Where**: `compose-state-gc.sh:33` exposes `--ttl-clock-skew-seconds N` as a public CLI flag. Tests use it to bypass mtime grace (e.g., `--ttl-clock-skew-seconds 120` with `--mtime-grace-hours 0` to delete a state with 60s TTL just-created). An operator could legitimately use it to advance the clock for migration scenarios (e.g., "force-expire all state older than 7d" by setting skew = -7d).

**Risk if mistaken**: an operator who runs `compose-state-gc.sh --ttl-clock-skew-seconds 31536000` (1 year) destroys all state. The flag is publicly documented but its destructive potential isn't.

**Recommendation**: Either (a) split the test-mode flag from the operational flag, OR (b) add a confirmation prompt for `--ttl-clock-skew-seconds > 3600` (1 hour). (b) is simpler.

### Alternative Not Considered

**Alternative**: TTL extension audit-trail could carry the ENVELOPE HASH of the request that triggered it, not just `{construct, skill}`.

**Tradeoff**: Current audit-trail records `{ts, op, actor: {construct, skill}}`. An attacker who compromised a legitimate construct (or a construct that's BUGGY) could trigger TTL extensions in a loop without audit visibility into WHICH composition or stage caused them. Adding `invocation_hash` to the audit record gives forensic traceability back to the chain.

**Verdict**: Current approach is justified for Sprint 5 — invocation_hash isn't always available at the persistent-state layer (state may outlive its triggering invocation). Sprint 5b OR Sprint 6 should add an OPTIONAL `--triggered-by-invocation <hash>` flag for callers that have the chain context.

---

## Acceptance Criteria Verification (independent re-check)

| AC | Reviewer claim | Verdict |
|---|---|---|
| AC-5.A — sentinel survives GC race | ✓ Met | ✓ Confirmed; test 13 holds real flock contention. |
| AC-5.B — independent state per stage_id | ✓ Met | ✓ Confirmed; test 9. |
| AC-5.C — dual-run L1+L2+L3 | ⏸ Deferred | ✓ Confirmed deferral; stub validates schema. |
| AC-5.D — opt-in iteration_mode | ⏸ Deferred | ✓ Confirmed deferral; auditor surfaces. |

`## AC Verification` section in reviewer.md uses cycle-057 / Issue #475 schema with explicit `⏸ Deferred` markers + Sprint 5b forward owner.

---

## Code Quality Spot-Checks

- **Karpathy compliance**: ✓ all four. Surgical (additive only). Simplicity (mock + stub for deferred work, no speculative dual-run code).
- **Shell strict mode**: ✓ uniform.
- **Function complexity**: persistent-state.sh's `cmd_set` ~40 lines (jq merge + ownership check + audit trail) — readable.
- **Naming**: ✓ clear (`_with_lock`, `_validate_slug`, `cmd_init/set/get/extend`).
- **Two gotchas inline-documented**: subshell-vs-array (compose-state-gc.sh:97) + `${VAR:-{}}` (persistent-state.sh:248). Both non-obvious; both will trip future contributors without the comments.

No Karpathy violations. No security red flags.

---

## Cross-Model Adversarial Review

Skipped per Sprint 1+2+3 pattern (Flatline malformed_response on Sprint 1 made re-runs uneconomical at the per-sprint level). PR-level Bridgebuilder review on PR #226 already covered Sprints 0-3; Sprint 5 carry-forward findings tracked in this report's CONCERN-3.

---

## Documentation Verification

- ✓ Reviewer.md walks every AC with file:line evidence + explicit deferrals.
- ⚠ NOTES.md not updated — Sprint 6 should consolidate the cycle's bash gotchas (CONCERN-2).
- ⚠ No CHANGELOG (loa-constructs convention).
- ⚠ SDD not updated (Sprint 5 implements existing §3.3 + §4.5 + §4.6).

---

## Previous Feedback Status

No previous Sprint 5 feedback in this cycle. Bridgebuilder PR-level findings + cycle's F1-F4 carry forward to Sprint 6 hardening; Sprint 5 expands F1's caller count from 3 to 4.

---

## Next Steps

1. **/audit-sprint sprint-5** — security audit gate.
2. **Sprint 6 hardening** — F1 path-safety + F3 jcs-fallback + B-001 tier-cap + new shared `lib/locks.sh` (CONCERN-1) + NOTES.md gotchas section (CONCERN-2).
3. **Sprint 5b** — S5-T6 dual-run + S5-T7 runtime enforcement once executors mature.

---

**Approval rationale**: Sprint 5 ships the 5 security-load-bearing tasks of persistent state + iteration audit with quality. The 2 deferrals (T6, T7) have clear capability-gap rationale. 19 new tests + 68 cumulative passing. The 3 concerns are non-blocking — they document recurring gotchas + a future operational risk. The single assumption is the test-vs-operational flag boundary; the alternative tracks forward to Sprint 5b/6.

Sprint 5 (PARTIAL) is **approved with concerns**.

All good (with noted concerns)
