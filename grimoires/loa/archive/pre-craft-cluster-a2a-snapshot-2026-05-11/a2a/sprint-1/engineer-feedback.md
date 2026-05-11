# Senior Tech Lead Review: Sprint 1

**Sprint**: Sprint 1 — Validators (pre/post-exec, prereq) (CONTRACT layer)
**Cycle**: cycle-construct-bounded-context (simstim-20260508-96627a1c)
**Branch**: `cycle/construct-bounded-context`
**Reviewer**: senior-tech-lead (rival mode)
**Date**: 2026-05-08
**Verdict**: **All good (with noted concerns)**

> Stale prior-cycle review (2025-12-30, Sprint 1 Project Foundation) has been superseded by this file.

---

## Overall Assessment

Sprint 1 is approved with non-blocking concerns documented below. All 18 bats tests pass across the three new suites; Sprint 0 schema-validation gate is regression-clean (`pass=9 fail=0 skip=0`). The reviewer report's `## AC Verification` section is comprehensive and walks every acceptance criterion verbatim with file:line evidence (cycle-057 / Issue #475 gate satisfied).

The work decomposes cleanly along the SDD seams: contract layer (validators) lands without execution code, tier-conditional severity escalation in `construct-validate.sh` honours §3.4, the post-exec output validator implements the §4.4 5-clause contract correctly, and the two preflight gates (`strict-tier-prereq`, `audit-keys-preflight`) fire at flag-set time per the SDD's "fail early" guidance.

The deferral of `[ENVELOPE-CHAIN-BROKEN]` to Sprint 2 is well-justified — the chain semantics live with `envelope-chain.sh` per the sprint plan §107-115, and pulling the check into the stream-graph validator before that library exists would mean owning the walk logic twice.

---

## Adversarial Analysis

Per the senior-tech-lead protocol, the reviewer is a rival, not a rubber stamp.

### Concerns Identified (3)

**CONCERN-1 (medium severity, non-blocking)** — Cheval memory-disable probe targets attributes that don't exist yet.

`strict-tier-prereq.sh:98-141` probes for `SUPPORTS_MEMORY_DISABLE` attribute on the cheval `BaseAdapter` or `provider_memory_disable` keyword on `BaseAdapter.__init__`. Verified empirically: neither symbol exists in `.claude/adapters/loa_cheval/providers/base.py`. The probe will universally return `"missing"` on every system today.

**Effect**: Strict tier is *unreachable* on every machine until cheval is extended. `strict-tier-prereq.sh` will exit 78 even on a fully-equipped Linux+bwrap+CAP_NET_ADMIN runner, blocking any composition with `isolation_tier: strict`.

**Why non-blocking for Sprint 1**: The probe correctly fails-closed (the design intent), and Sprint 1's S1-T3 acceptance language is "Detects bwrap, CAP_NET_ADMIN, provider memory-disable flag support" — the probe DOES detect (and reports `missing`). The cheval extension is downstream work (cycle-098 Sprint 1A or later, per the comment at line 100). Strict tier is also opt-in per composition, so compositions that don't request strict tier are unaffected.

**Recommendation**: Track in NOTES.md. When cheval gains the memory-disable API, update the probe and verify it transitions to `"supported"` on the strict-tier CI runner. Consider adding a dedicated bats test that fails until cheval ships the API — would close the loop instead of leaving it on faith.

**CONCERN-2 (low severity, non-blocking)** — JCS fallback fails-open when `rfc8785` is missing.

`output-gate.py:140-160` (`_jcs_canonical_bytes`) catches `ImportError` on `rfc8785` and falls back to `json.dumps(sort_keys=True, separators=(",",":"))`. Verified: rfc8785 is NOT installed locally and is not pinned in any `requirements*.txt` or `pyproject.toml`.

**Risk**: The fallback is byte-equivalent to RFC 8785 only for objects/arrays/strings/booleans/null/integers. If a future construct emits a payload with a JSON `number` whose magnitude requires ECMAScript ToNumber semantics (floats, large integers), the fallback hash diverges from rfc8785's hash silently. cycle-098's `audit_emit_signed` uses rfc8785; chain replay would then false-negative.

**Why non-blocking**: Substrate's typed-streams protocol (Signal/Verdict/Artifact/Intent/OperatorModel) doesn't carry floats anywhere in current schemas. Reviewer.md acknowledges the divergence in Technical Highlights §4.

**Recommendation**: Either (a) fail-closed when rfc8785 is missing AND `composition.audit_signed: true`, or (b) add a stderr warning + payload-shape validation that confirms no floats in the JSON. Sprint 6's docs roundup should include rfc8785 in any `requirements*.txt` it ships.

**CONCERN-3 (low severity, non-blocking)** — Test fixtures use unquoted heredocs.

`tests/composition/preflight/run.bats:34-50` and `:71-79` use `cat > "$TMPDIR_FIX/no-strict.yaml" <<EOF` (unquoted delimiter). Per `.claude/rules/shell-conventions.md`, source-file heredocs should use `<<'EOF'` to prevent unintended `${...}` expansion.

**Risk today**: None — current fixtures don't contain `${...}` template literals.

**Risk tomorrow**: A test author who adds a fixture with `${variable}` syntax (e.g., a bash-variable example in a YAML schema, or a stage description that mentions `${ENV_VAR}`) will silently get an empty expansion at heredoc-write time, and the test will fail in confusing ways.

**Recommendation**: Switch to `<<'EOF'` in both files. One-line change per heredoc, no functional impact today, prevents tomorrow's foot-gun.

### Assumption Challenged

**Assumption**: `output-gate.py` assumes that handoff envelope's `outputs[].uri` is always a filesystem path resolvable from CWD.

**Where**: `output-gate.py:262` — `path = Path(destination); if not path.exists()`.

**Risk if wrong**: Runtime that emits relative URIs (e.g., `outputs/verdict.json` relative to the run's `.run/compose/<run_id>/` directory) will produce `[OUTPUT-MISSING]` false positives if the validator runs from a different CWD. Similarly, runtime that uses URIs like `file://` or `s3://` would crash on `Path.exists()`.

**Recommendation**: Make explicit. Either (a) document that handoff URIs MUST be absolute filesystem paths (and add a stream-graph-style validator check at the schema layer), or (b) accept a `--run-dir` flag for relative-path resolution. Sprint 2's envelope builder will produce these URIs; the convention should be locked in then.

### Alternative Not Considered

**Alternative**: Tier resolution and stage-domain resolution could compose with `construct-resolve.sh resolve <slug>` instead of hardcoding `.claude/constructs/packs/<slug>/construct.yaml`.

**Where**: `compose-stream-graph.py:_resolve_manifest` (line 197-211) reads `<packs-dir>/<slug>/construct.yaml`. The default `--packs-dir` auto-locates `.claude/constructs/packs`.

**Tradeoff**: Hardcoding the path is faster (no shell-out) and self-contained (no dependency on construct-resolve). But the reference install convention is specific — it breaks for workspace overrides, alternative pack roots (e.g., `~/.loa/constructs/packs/` per the global-sync architecture), and symlink-resolved paths.

**Verdict**: Current approach is acceptable for Sprint 1 because the auto-locate falls through gracefully (returns `None` → check skipped via `--no-domain-check` semantics). But Sprint 6's manifest-migration work should add a `LOA_CONSTRUCTS_PACK_ROOT` env override or compose with construct-resolve to handle the `~/.loa/constructs/packs/` symlink farm. Track in NOTES.md.

---

## Acceptance Criteria Verification (independent re-check)

| AC | Status (engineer claim) | Reviewer verdict |
|---|---|---|
| AC-1.A — 6 typed errors reproducible | ⚠ Partial (5/6, 1 deferred) | ✓ Confirmed. 5 closed, `[ENVELOPE-CHAIN-BROKEN]` deferral has matching NOTES.md entry. |
| AC-1.B — Top-12 strict, others advisory | ✓ Met | ✓ Confirmed empirically: artisan→strict, archivist→advisory. Tier escalation works. |
| AC-1.C — `audit-feel` passes pre-exec validation | ⏸ Deferred | ⚠ Acknowledge — golden-path-equivalent fixture exercises the validator surface. Tracked. |
| AC-1.D — No execution code | ✓ Met | ✓ Confirmed. The cheval probe uses `importlib.import_module` for introspection — pure read, no provider invocation. |

`## AC Verification` section in reviewer.md is present, complete, and uses the cycle-057 / Issue #475 schema (verbatim AC quotes, status markers, file:line evidence, deferral rationale tied to NOTES.md).

---

## Code Quality Spot-Checks

- **Karpathy compliance**: Think-Before-Coding (assumptions surfaced in reviewer.md); Simplicity (no speculative features — output-gate's domain check splits into two when the schema says split, not one-size-fits-all); Surgical (diff is concentrated in 8 files, no drive-by reformatting); Goal-Driven (each test has a clear AC mapping). ✓
- **Shell strict mode**: `set -euo pipefail` everywhere; no empty-array under set-u (uses `${arr[@]+"${arr[@]}"}` style implicitly via printf '%s\n' guards). ✓
- **JSON construction safety**: Uses `--arg` for strings + `--argjson` for JSON values, with prior validation. ✓
- **Heredoc safety**: Production scripts use `<<'PY'` for Python heredocs (correct). Test fixtures use unquoted `<<EOF` (Concern-3). ⚠
- **Function complexity**: `output-gate.py:validate` is 154 lines — borderline. Could split into per-clause helpers (file_check, json_check, schema_check, hash_check, domain_check). Non-blocking — readable as-is, well-commented.
- **Naming**: Clear (`_resolve_manifest`, `_check_stage_domain`, `escalate <check> <baseline>`). ✓
- **Dead code**: None.
- **Documentation**: Inline docstrings on Python functions; SDD references in shell script headers. ✓

No Karpathy violations. No security red flags. No SemVer breaks beyond the documented `construct-validate.sh` JSON shape change.

---

## Cross-Model Adversarial Review

`adversarial-review.sh --type review --sprint-id sprint-1` invoked per Phase 2.5 protocol with the full `git diff main...HEAD` (2962 lines) + reviewer-concerns context file. Result: `grimoires/loa/a2a/sprint-1/adversarial-review.json` written with `findings: []` and `metadata.status: "malformed_response"`.

Per the Phase 2.5 fallback protocol: malformed response → empty findings → continue to Phase 4 with single-model assessment. The malformed_response status is recorded in the audit trail (not silently skipped). No BLOCKER findings extracted from the cross-model review; the verdict remains based on this reviewer's own assessment.

---

## Documentation Verification

- ✓ `grimoires/loa/NOTES.md` decision-log entry for `[ENVELOPE-CHAIN-BROKEN]` deferral (cycle-057 / Issue #475 requirement).
- ✓ `grimoires/loa/NOTES.md` decision-log entry for `select(length > 0)` jq gotcha (Technical Debt note for future contributors).
- ✓ `grimoires/loa/NOTES.md` decision-log entry for `construct-validate.sh` JSON shape break.
- ✓ Reviewer.md walks every AC with file:line evidence (cycle-057 AC Verification gate).
- ⚠ No top-level CHANGELOG.md (verified via `ls CHANGELOG*` → no such file). Not blocking — `loa-constructs` doesn't carry one.
- ⚠ Top-level CLAUDE.md not updated — but the new validators are framework-internal lib scripts, not user-facing slash commands. Not blocking.
- ⚠ SDD not updated — but Sprint 1 implements existing SDD §3.4, §4.1, §4.4, §6.3, §6.5b, doesn't change the design. Not blocking.

---

## Previous Feedback Status

No previous feedback to verify. This is the first review for Sprint 1 in this cycle. The stale `engineer-feedback.md` from prior cycle (Sprint 1 — Project Foundation, 2025-12-30) was overwritten by this file and does not apply.

---

## Next Steps

1. **/audit-sprint sprint-1** — security-focused audit gate.
2. **Address Concerns 1-3** in a Sprint 6 follow-up (or earlier if convenient): cheval probe expectation lock, JCS fallback hardening, fixture heredoc quoting.
3. **Sprint 2 prep** — `envelope-chain.sh` will own `[ENVELOPE-CHAIN-BROKEN]` per the deferral note. Author the chain-broken fixture there.

---

**Approval rationale**: Sprint 1 ships the strong contract layer's enforcement skin as designed. All ACs met or properly deferred with NOTES.md entries. Test coverage is comprehensive and meaningful. The three concerns surfaced above are non-blocking — they document tomorrow's risks, not today's defects. The single assumption is explicit. The alternative tracks forward to Sprint 6.

Sprint 1 is **approved with concerns**.

All good (with noted concerns)
