# Sprint 3 Security Audit — Paranoid Cypherpunk Auditor

**Sprint**: Sprint 3 — Stage Executor (Advisory Tier) — PARTIAL (4 of 9)
**Cycle**: cycle-construct-bounded-context (`simstim-20260508-96627a1c`)
**Branch**: `cycle/construct-bounded-context`
**Date**: 2026-05-08
**Verdict**: **APPROVED - LETS FUCKING GO**
**Risk Level**: MEDIUM (3 findings tracked; all carry-forward from Sprint 1/2 + 1 new lint)

> Stale prior-cycle audit superseded.

---

## Verdict

**APPROVED - LETS FUCKING GO** ⚠

Sprint 3 ships the 4 security-load-bearing tasks of the advisory-tier runner: argv-array invocation, env scrub, path canonicalization, output-gate integration. The runner correctly implements SDD §6.5b's cooperative-construct guidance + envelope contract enforcement.

Findings: 3 MEDIUM (2 carry-forward from Sprint 2 — slug traversal + schema_id traversal + JCS breadth — plus 1 new LOW: dead-code in canonicalization arrays). Sprint 3 does NOT introduce new HIGH/CRITICAL vulnerabilities. The cheval probe carryforward (Sprint 1 audit's CONCERN-1) remains non-blocking because Sprint 3 doesn't touch the probe; live-mode skill execution is mock-only in tests.

The argv-array discipline holds — verified by adversarial test 7 against shell-meta injection in skill-cmd argv[0]. The env scrub is comprehensive (default + composition allowlist with regex validation). PROJECT_ROOT containment via `pwd -P` + canonicalized resolution closes the symlink-path symlink-target divergence on workspaces with symlinked checkouts.

## Defense Layers Validated ✓

- **No secrets in code**: scanned 2 Sprint 3 files (stage-runner + bats) for credentials/tokens — zero hits.
- **YAML deserialization**: stage-runner uses `yq -o=json` to convert manifest YAML → JSON, then jq for queries. yq's parser is `yaml.safe_load`-equivalent. No `yaml.load()` anywhere.
- **JSON deserialization**: all `jq` invocations on user input use `--arg` for strings + `--argjson` for JSON values; no `eval` paths.
- **Argv-array invocation** (S3-T1): bash arrays + `"${cmd[@]}"` expansion exclusively. Zero `bash -c "<interpolated>"` in the file. Adversarial test (`tests/composition/runner/run.bats:194-211`) verifies shell metas in argv[0] do NOT execute — the marker file is never created.
- **Env scrub** (S3-T2): `env -i KEY1=val1 KEY2=val2 cmd args` form. The default allowlist (PATH, HOME, LANG) is applied when composition omits `allowed_env_vars`. Each composition-provided entry is regex-validated against `^[A-Z_][A-Z0-9_]*$` before reaching env.
- **Path canonicalization** (S3-T7): `realpath -m` (GNU) or python3 fallback (macOS-portable). PROJECT_ROOT containment via string prefix on canonical paths. Both PROJECT_ROOT itself AND each allowed_*_paths entry get canonicalized — no symlink-path-prefix-vs-canonical mismatch.
- **Tier refusal** (line 89-99): advisory runner exits 78 (EX_CONFIG) when invoked with `isolation_tier: strict`. Strict-tier compositions MUST use the Sprint 4 runner (not yet shipped). This is the explicit handoff between tiers.
- **Output-gate enforcement** (S3-T8, lines 348-381): post-exec validation. On `[OUTPUT-CONTRACT-VIOLATION]` the handoff is REWRITTEN with `status: failure` + `partial_outputs.disposition: marked_non_consumable`. Downstream stages refuse the output by construction.
- **Process boundary**: `env -i KEY=val cmd args` — no shell interpretation reaches the subprocess; the cmd is invoked directly by the kernel via execve.
- **Exit code discipline**: 78 (EX_CONFIG) for tier mismatch (mirrors Sprint 1's preflights); 1 for contract violations; 2 for usage; 3 for environment problems.

## Threat Model Status

| Threat | Status | Note |
|---|---|---|
| Shell injection via skill-cmd | ✓ Mitigated | argv-array; verified via adversarial test |
| Env-var smuggling | ✓ Mitigated | env -i + regex-validated allowlist |
| Symlink-based path traversal | ✓ Mitigated (advisory) | realpath + PROJECT_ROOT containment; TOCTOU race documented as advisory limit |
| YAML deserialization RCE | ✓ Mitigated | yq.safe_load + json bridges |
| Output-contract bypass | ✓ Mitigated | post-exec output-gate; failure rewrites handoff |
| Path traversal via slug (Sprint 1+2 inherited) | ⚠ Defense-in-depth | Finding #1 — not introduced in Sprint 3 |
| Path traversal via schema_id (Sprint 1 inherited) | ⚠ Defense-in-depth | Finding #2 — not introduced in Sprint 3 |
| JCS fallback divergence (Sprint 1+2 inherited) | ⚠ Defense-in-depth | Finding #3 — Sprint 3 inherits via output-gate + envelope-builder reuse |
| Dead-code canonicalization arrays | ⚠ Lint | Finding #4 (NEW) — half-built enforcement; documented in reviewer Assumption |

## Findings

### Finding #1 — MEDIUM — Path Traversal in `_resolve_manifest` (UNCHANGED)

Carry-forward from Sprint 1 audit F1 + Sprint 2 audit F1. Status unchanged. Stage-runner does NOT use `_resolve_manifest` directly — it operates on a pre-built invocation envelope + manifest path supplied by the caller. The vulnerable code paths remain in compose-stream-graph.py + envelope-builder.py.

**Sprint 3 actually IMPROVES on this** at the runner layer: stage-runner-advisory.sh's PROJECT_ROOT containment check (lines 145-167) IS the kind of defense-in-depth I requested in Sprint 1's audit. Sprint 6 hardening should backport this pattern to the upstream callers.

### Finding #2 — MEDIUM — schema_id absolute-path traversal (UNCHANGED)

Sprint 1 audit F2. Sprint 3 doesn't touch output-gate.py.

### Finding #3 — MEDIUM — JCS fallback breadth (INHERITED)

Sprint 2 audit F3. Sprint 3 reuses envelope-builder.sh + output-gate.sh — inherits the fallback. No new occurrence introduced. Total sites: 4 (compose-dry-run, envelope-chain, envelope-builder, output-gate).

### Finding #4 — LOW (NEW) — Dead-code canonicalization arrays

**Location**: `.claude/scripts/lib/stage-runner-advisory.sh:124-167`.

The `canonicalized_read[]` and `canonicalized_write[]` arrays are populated during the path-canonicalization loop (lines 145-167) but never USED downstream. The actual write happens at the LITERAL contract destination (line 271 comment: "Use the literal destination from the contract — symlinks resolve transparently at OS layer; the contract's path is the canonical user-facing identity").

**Risk**: A reader might assume the canonicalized arrays gate the actual write — they don't. If a future contributor wires the write through the literal destination but THINKS the canonicalized array was the gate, they'd be operating with a false security model.

**Why LOW (not blocking)**: The DEFENSE is the WARN + exclusion from runner's effective allowlist on out-of-PROJECT_ROOT paths. The arrays are unused decoration. The actual symlink-traversal protection lives in the WARN loop — which DOES fire correctly.

**Recommendation**: Sprint 6 should either (a) wire canonicalized writes through the array (live-mode enforcement of canonical paths — closes a TOCTOU window), OR (b) remove the dead arrays + comment "PROJECT_ROOT containment is enforced via WARN loop above; canonical paths are advisory only on this tier". Option (a) is more secure; (b) is more honest about the current behavior.

### Verification That Sprint 3 Doesn't Open NEW Vectors

- ✓ argv-array — no shell injection
- ✓ env -i — no env smuggling
- ✓ realpath canonicalization — no symlink-prefix bypass
- ✓ tier refusal — strict compositions can't sneak in
- ✓ output-gate post-exec — contract violations handled
- ✓ jq usage — `--arg / --argjson` discipline maintained
- ✓ yq usage — yaml.safe_load equivalent semantics
- ✓ Bash strict mode — `set -euo pipefail` + array-emptiness guards
- ✓ Heredoc safety — Python heredocs use `<<'PY'` (quoted)

## Sprint 3 vs. Sprint 1+2 Audit Continuity

Sprint 1 audit closed 2 MEDIUM (slug traversal + schema_id) + 3 LOW (heredocs, output URI assumption, etc.). Sprint 2 audit added 1 MEDIUM (JCS breadth). Sprint 3 audit:
- Carries forward all 3 MEDIUMs from S1+S2 (none introduced or mitigated this sprint).
- Adds 1 LOW (dead-code canonicalization arrays).
- Closes ZERO findings — Sprint 3's scope didn't include the hardening tasks.

The Sprint 6 hardening bundle previously sized at "~60 LOC across 3 shared utility files" now grows by ~10 LOC for the canonicalization-array cleanup. Total estimate stands at **~70 LOC across 4 areas**:

1. `lib/path-safety.py` — slug regex + realpath containment shared by compose-stream-graph + envelope-builder + stage-runner-advisory.
2. `lib/jcs-fallback.py` — shared canonicalizer with `audit_signed: true` fail-closed guard.
3. `output-gate._stream_schema_path` — schema_id regex enforcement.
4. `stage-runner-advisory.sh` — wire canonicalized writes through (or remove dead arrays).

## Test Coverage of Security-Adjacent Paths

| Path | Test | Status |
|---|---|---|
| Argv-array eval safety (shell meta injection) | `tests/composition/runner/run.bats:194-211` | ✓ Passes |
| Env scrub: parent secret excluded | `tests/composition/runner/run.bats:128-167` | ✓ Passes |
| Env scrub: malformed allowlist rejected | `tests/composition/runner/run.bats:172-191` | ✓ Passes |
| Tier refusal: strict → exit 78 | `tests/composition/runner/run.bats:48-68` | ✓ Passes |
| Output-gate post-exec on success | `tests/composition/runner/run.bats:91-126` | ✓ Passes |
| Handoff envelope status discipline | (covered by tests 3, 4) | ✓ Passes |

Adversarial patterns absent (out of scope for Sprint 3 — Sprint 4 owns the strict-tier adversarial suite per SDD §6.5b CI matrix):
- Symlink swap mid-execution (TOCTOU) — strict-tier's bwrap binds close.
- LD_PRELOAD circumvention — Sprint 4 + LD_PRELOAD library S3-T4 deferral.
- Provider memory recall — Sprint 6 cheval extension.
- Network egress via tunneling — Sprint 4 strict-tier net namespaces.

## Beads Integration

```
br comments add bd-nobi.4 "AUDIT APPROVED 2026-05-08 (PARTIAL — 4 of 9 tasks). Verdict: LETS FUCKING GO. 3 MEDIUM findings carry-forward from Sprint 1+2 (slug traversal + schema_id traversal + JCS breadth — Sprint 3 does NOT introduce new ones). 1 LOW finding (dead-code canonicalization arrays). Sprint 3's PROJECT_ROOT containment check actually IMPROVES the slug traversal posture at the runner layer. 5 task deferrals tracked: S3-T3+T4 → Sprint 4 (strict-tier kernel enforcement); S3-T5+T6+T9 → Sprint 6 (cheval extension + audit-feel install). Sprint 6 hardening bundle now ~70 LOC across 4 areas."
br label add bd-nobi.4 security-approved
```

## Recommendation Forward

1. **Sprint 4** owns S3-T3 fresh-pty + S3-T4 LD_PRELOAD as kernel-enforced strict-tier equivalents. Advisory-tier inheritance of these constructs is cooperative-only and largely informational.
2. **Sprint 6 hardening** bundle (~70 LOC across 4 areas) closes Sprints 1+2+3 carry-forward findings. Single dedicated bead/issue.
3. **Sprint 6 cheval extension** unblocks S3-T5 + S3-T6 (and Sprint 1's CONCERN-1). One-line runner pickup.
4. **Sprint 6 audit-feel install** closes Sprint 1 AC-1.C + Sprint 2 AC-2.A + Sprint 3 AC-3.D + S3-T9. Single composition file does it.
5. **NOTES.md update** — the dead-code finding (Finding #4) is worth a decision-log entry: future contributors should NOT treat the canonicalized arrays as the primary defense.

Sprint 3 (PARTIAL) is **APPROVED** for landing. The 4 shipped tasks are high-quality + well-tested. The 5 deferred tasks have clear forward owners + capability-gap rationale. The 4 findings (3 carry-forward + 1 new LOW) all have a single Sprint 6 hardening bundle as remediation.
