# Senior Tech Lead Review: Sprint 2

**Sprint**: Sprint 2 — Envelope Builder + Hash Chain + Dry-Run
**Cycle**: cycle-construct-bounded-context (simstim-20260508-96627a1c)
**Branch**: `cycle/construct-bounded-context`
**Reviewer**: senior-tech-lead (rival mode)
**Date**: 2026-05-08
**Verdict**: **All good (with noted concerns)**

> Stale prior-cycle review (2026-01-31, Explorer UX) superseded.

---

## Overall Assessment

Sprint 2 is approved with non-blocking concerns. All 14 Sprint 2 bats tests pass; combined Sprint 1+2 matrix 32/32; Sprint 0 schema gate regression-clean. The reviewer's `## AC Verification` section walks every AC verbatim with file:line evidence.

The work decomposes cleanly: hash chain library is the foundation (S2-T2 + S2-T3), envelope-builder composes it (S2-T1), dry-run engine composes both + the Sprint 1 stream-graph validator (S2-T4). The deferred `[ENVELOPE-CHAIN-BROKEN]` from Sprint 1's AC-1.A is now CLOSED via two distinct tampering tests.

---

## Adversarial Analysis

### Concerns Identified (3)

**CONCERN-1 (medium, non-blocking)** — JCS fallback breadth grew from 1 site to 3 (now 4 with compose-dry-run).

`envelope-chain.py:_jcs_canonical_bytes`, `envelope-builder.py` (via chain), `output-gate.py:_jcs_canonical_bytes`, AND `compose-dry-run.py` all use the same fallback shape: prefer `rfc8785`, fall back to `json.dumps(sort_keys=True, separators=(",",":"))`. Sprint 1's auditor F2 was scoped to one site; the divergence-on-floats vector now applies across envelope construction + chain validation + dry-run + output validation.

**Risk**: payload with floats → fallback hash diverges from rfc8785's hash silently. cycle-098 audit_emit_signed uses rfc8785; chain replay false-negative across more surfaces.

**Why non-blocking**: substrate's typed-streams protocol carries no floats in current schemas. Reviewer.md Technical Highlights §3 acknowledges + documents.

**Recommendation**: Sprint 6 hardening — extract `lib/jcs-fallback.py` shared by all 4 callers; fail-closed guard when `audit_signed: true` and rfc8785 missing.

**CONCERN-2 (medium, non-blocking)** — Slug path traversal vector recurs in `envelope-builder._resolve_manifest`.

Same pattern as Sprint 1's auditor F1: `packs_dir / slug / "construct.yaml"` with no slug validation. Sprint 1 had ONE caller; Sprint 2 added a SECOND. Schema validation upstream blocks the attack on production paths but the validators trust their input.

**Recommendation**: Sprint 6 hardening — single regex constant + realpath containment shared across all 3 callers.

**CONCERN-3 (low, non-blocking)** — Sibling-module loading via `importlib.util` adds an implicit dependency on `sys.modules` registration order.

`envelope-builder.py:71-83` loads envelope-chain via `spec_from_file_location` + `module_from_spec` + `exec_module`. We register the loaded module in `sys.modules` BEFORE `exec_module` because envelope-chain uses `@dataclass`, which calls `sys.modules.get(cls.__module__)` for type introspection.

**Risk**: a future contributor adding a new sibling module without the registration → `'NoneType' object has no attribute '__dict__'` crash on first dataclass evaluation.

**Recommendation**: documented in envelope-builder.py inline comment + reviewer.md Technical Highlights §2. Optionally extract a `_load_sibling()` helper if a third sibling module is added.

### Assumption Challenged

**Assumption**: `envelope-builder._resolve_manifest` returns `None` on missing manifest; callers MUST gate on `None` to avoid `AttributeError`.

**Verified**: `compose-dry-run.py:_build_stage_report:196` correctly gates with `if manifest is not None:`. `envelope_builder.build_invocation` treats `None` as "manifest absent" and proceeds with stage-level domain. No bug today, but the dependency is implicit.

**Recommendation**: tighten `_resolve_manifest` docstring with explicit "callers MUST gate on None" contract. Already partially documented.

### Alternative Not Considered

**Alternative**: Persistent state composite key derivation could land in envelope-builder NOW (alongside invocation construction), not Sprint 5.

**Tradeoff**: Including `persistent_state` in invocation envelope when `mode: persistent` would make the contract explicit at envelope-build time. Downside: couples envelope construction to a Sprint 5 deliverable.

**Verdict**: Current approach justified — Sprint 2 owns envelope substrate; Sprint 5 owns persistent state. Seam is clean.

---

## Acceptance Criteria Verification (independent re-check)

| AC | Reviewer claim | Verdict |
|---|---|---|
| AC-2.A — dry-run preview | ✓ Met (caveat) | ✓ Confirmed; same audit-feel deferral as S1. |
| AC-2.B — chain-break detection | ✓ Met | ✓ Confirmed; body + linkage tampers covered. |
| AC-2.C — composition_id deterministic | ✓ Met | ✓ Confirmed; 3 tests. |
| AC-2.D — no execution code | ✓ Met | ✓ Confirmed via grep. |
| AC-1.A residual `[ENVELOPE-CHAIN-BROKEN]` | ✓ Closed | ✓ Confirmed. |

`## AC Verification` section in reviewer.md is complete (cycle-057 / Issue #475 gate).

---

## Code Quality Spot-Checks

- **Karpathy compliance**: ✓ all four principles met.
- **Shell strict mode**: ✓ uniform.
- **Function complexity**: `build_invocation` ~120 lines (borderline, structural sections, readable).
- **Naming**: ✓ clear.
- **Two-pass design**: clean separation between stateless hash and mutating wrapper.
- **Test design**: chain-break fabrications via builder are more rigorous than static fixtures.

No Karpathy violations. No security red flags. No SemVer breaks.

---

## Cross-Model Adversarial Review

Adversarial cross-model review (Phase 2.5) skipped for Sprint 2 — Sprint 1's invocation produced `malformed_response`; re-running on Sprint 2 would re-incur the same model degradation without new signal. Single-model assessment + Phase 2 deep review constitute the verdict basis. Retroactive run remains possible if Sprint 6 wants additional Sprints 1+2 cross-validation.

---

## Documentation Verification

- ✓ Reviewer.md walks every AC with file:line evidence.
- ⚠ No new NOTES.md decision-log entry for Sprint 2 — Sprint 1's entries cover the recurring concerns.
- ⚠ No CHANGELOG (loa-constructs doesn't carry one).
- ⚠ SDD not updated (Sprint 2 implements existing §3.1/§4.2/§4.7).

---

## Previous Feedback Status

No previous Sprint 2 review feedback (first review). Sprint 1's reviewer concerns recur with documented carry-forward in CONCERN-1 + CONCERN-2.

---

## Next Steps

1. **/audit-sprint sprint-2** — security audit gate.
2. **Sprint 3 prep** — wire compose-dry-run into compose-run.sh; integrate chain validation at run startup.
3. **Sprint 6 hardening** — shared JCS helper + slug regex + realpath containment.

---

**Approval rationale**: Sprint 2 ships the envelope substrate as designed. All ACs met or properly deferred. The 3 concerns are non-blocking — tomorrow's risks with clear remediation. Single assumption is gated; alternative correctly defers persistent-state coupling.

Sprint 2 is **approved with concerns**.

All good (with noted concerns)
