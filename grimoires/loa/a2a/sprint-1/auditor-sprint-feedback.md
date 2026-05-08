# Sprint 1 Security Audit — Paranoid Cypherpunk Auditor

**Sprint**: Sprint 1 — Validators (pre/post-exec, prereq) (CONTRACT layer)
**Cycle**: cycle-construct-bounded-context (`simstim-20260508-96627a1c`)
**Branch**: `cycle/construct-bounded-context`
**Date**: 2026-05-08
**Verdict**: **APPROVED - LETS FUCKING GO**
**Risk Level**: MEDIUM (2 findings tracked forward, none blocking for validators-only landing)

> Stale prior-cycle audit (2025-12-30, Sprint 1 Project Foundation) has been superseded by this file.

---

## Verdict

**APPROVED - LETS FUCKING GO** ⚠

Sprint 1 ships the strong-contract-layer enforcement skin. The validators correctly perform their primary function: rejecting malformed compositions before any stage executes. All 18 bats tests pass; Sprint 0 schema-validation gate regression-clean.

Findings: 2 MEDIUM (defense-in-depth on validator-boundary input handling), all non-blocking for Sprint 1 landing but **MUST be remediated before composition runs accept untrusted compositions** (e.g., from a public registry). Both findings are mitigated by upstream `composition.schema.json` validation — the validators trust their input. In production paths (cycle-098 / future loom-driven runs) compositions will be schema-validated before reaching the validators, closing the surface. The defense-in-depth gap is the validators not enforcing their own input contract.

## Defense Layers Validated ✓

- **No secrets in code**: scanned 8 Sprint 1 files for `api[_-]?key|secret|password|token|bearer|aws_access` — zero hits in code (excluding comments).
- **YAML deserialization**: all yaml.* calls use `yaml.safe_load` (compose-stream-graph.py:118, :226; output-gate.py:128). No `yaml.load()` or `yaml.unsafe_load()` anywhere.
- **JSON deserialization**: all json.loads on user input handled with try/except + structured error reporting; no `eval()` or `exec()`.
- **Shell strict mode**: every shell script ships with `set -euo pipefail`.
- **JSON construction**: all jq invocations use `--arg` for strings + `--argjson` for JSON values (verified via grep on `jq -n` calls).
- **Heredoc safety in production**: Python heredocs in shell scripts use `<<'PY'` (quoted delimiter) — prevents `${...}` expansion injection (verified at strict-tier-prereq.sh:106 and audit-keys-preflight.sh probes).
- **Privilege drop in cheval probe**: probe uses `importlib.import_module` for introspection only — no provider-call invocation, no LLM session opened during probe.
- **Path containment in audit-keys-preflight**: sentinel + private key + public registry checks restricted to `<repo>/.run/audit-keys/` and `<repo>/.claude/data/audit-keys/`. No traversal vectors via env-controlled paths (LOA_AUDIT_PRIVATE_KEY_PATH is checked for readability but not used to escape; the file's content is never parsed beyond existence/readability).
- **Exit-code discipline**: 78 (EX_CONFIG) used uniformly for "operator-fixable misconfiguration" per cycle-098 conventions; distinguishes from 1 (validation failure) and 2 (usage error) and 3 (env problem).
- **Hash chain integrity attempt**: output-gate.py:341-358 recomputes JCS-canonical sha256 and compares to handoff's reported hash. Tamper detection works (verified by `output-gate: hash mismatch` test case).

## Threat Model Status

| Threat | Mitigation Status | Note |
|---|---|---|
| Hardcoded credentials | ✓ Mitigated | Zero hits across 8 Sprint 1 files |
| YAML deserialization RCE | ✓ Mitigated | yaml.safe_load uniformly |
| JSON deserialization | ✓ Mitigated | json.loads + structured exception handling, no eval |
| Path traversal via slug | ⚠ Defense-in-depth gap | Finding #1 — schema enforces `^[a-z0-9][a-z0-9-/]*[a-z0-9]$`, validator does not re-check |
| Path traversal via schema_id type | ⚠ Defense-in-depth gap | Finding #2 — schema enforces `^loa\.stream\.[A-Za-z]+\.v[0-9]+$`, validator only checks structural shape |
| Shell command injection | ✓ Mitigated | All shell args quoted, no eval/exec, jq/yq queries use string-interpolation only on schema-validated data |
| Hash chain tampering | ✓ Mitigated | JCS-recompute + compare on every output |
| Subprocess injection | ✓ Mitigated | exec python3 with $@ pass-through; no shell metas reach python args |
| Information disclosure via diagnostics | ⚠ Acceptable | Error messages include file paths (operator's own tree, not secret material). Not a leak vector against external attackers. |
| Resource exhaustion via large composition | ⚠ Out of scope | yaml.safe_load is unbounded; relies on operator-controlled input + filesystem disk-space limits. Not a Sprint 1 deliverable. |

## Findings

### Finding #1 — MEDIUM — Path Traversal in `_resolve_manifest` slug join

**Location**: `.claude/scripts/lib/compose-stream-graph.py:218`

```python
candidate = packs_dir / slug / "construct.yaml"
```

**Vector**: When the validator processes a composition without prior schema validation, an attacker-controlled `chain[].construct` slug is joined directly to `packs_dir` without traversal containment. Slugs containing `..` traverse out of the packs directory; absolute-path slugs (e.g. `/etc/passwd`) override the prefix entirely (Python's `Path.__truediv__` returns the right operand when it's absolute).

**Exploit conditions**:
- Composition file reaches the validator without being schema-validated against `composition.schema.json` (which enforces `construct: ^[a-z0-9][a-z0-9-/]*[a-z0-9]$`).
- An attacker-controlled YAML file at the traversed location.

**Impact**:
- The validator reads the file as a construct manifest and uses its `domain` block for `[STAGE-OUT-OF-DOMAIN]` attribution checks. False-negative validation (marks an out-of-domain stage as in-domain) becomes possible.
- Information disclosure: error messages include the resolved path (`grimoires/loa/runbooks/...` style), but the path is operator-side, not external secret material.

**Why not blocking**:
- composition.schema.json regex blocks the attack on schema-validated input.
- Substrate's threat model (SDD §6.5b) treats compositions as eventually trusted; strict-tier compositions are operator-authored.
- Validator runs in the trusted zone (operator's machine), not on attacker input by default.

**Why must remediate before public-registry compositions**:
- Sprint 6's manifest migration + the loom skill's "fire arbitrary composition" path makes `compose-stream-graph` an Internet-attack-surface eventually.
- A defense-in-depth fix at the validator boundary is straightforward.

**Recommended remediation** (Sprint 6 or earlier):
```python
# In _resolve_manifest, before constructing candidate:
import re
SLUG_RE = re.compile(r'^[a-z0-9][a-z0-9-/]*[a-z0-9]$')
if not SLUG_RE.match(slug):
    return None
# Plus: realpath containment
candidate = (packs_dir / slug / "construct.yaml").resolve()
if not candidate.is_relative_to(packs_dir.resolve()):
    return None
```

### Finding #2 — MEDIUM — Path Traversal in `_stream_schema_path` Type component

**Location**: `.claude/scripts/lib/output-gate.py:168-191`

```python
parts = schema_id.split(".")
if len(parts) != 4 or parts[0] != "loa" or parts[1] != "stream" or not parts[3].startswith("v"):
    raise _err_usage(f"unrecognized schema_id format '{schema_id}'")
type_name = parts[2]
# ... lowercase + kebab conversion ...
candidate = schemas_dir / f"{file_stem}.schema.json"
```

**Vector**: `parts[2]` (the Type component) is structurally checked (no dot allowed) but not regex-validated against `^[A-Za-z]+$` per the schema. A schema_id with an absolute Type (e.g. `loa.stream./etc/passwd.v1`) bypasses the prefix join because `Path("/some/dir") / "/abs/path"` returns `Path("/abs/path")` (Python pathlib quirk: absolute right operand replaces the left).

**Verified empirically**:
```python
>>> from pathlib import Path
>>> Path("/repo/.claude/schemas") / "/etc/passwd.schema.json"
PosixPath('/etc/passwd.schema.json')
```

**Impact**:
- Validator attempts to read `/etc/passwd.schema.json` (or any absolute path the attacker chooses). On most systems the file doesn't exist, but if the attacker can plant `/tmp/evil.schema.json` or similar, they substitute their own permissive schema, allowing malformed payloads to pass validation.
- False-negative output validation → downstream stages consume malformed payloads.

**Why not blocking**:
- handoff envelope's `schema_id` field is regex-constrained at the schema layer (`^loa\.stream\.[A-Za-z]+\.v[0-9]+$`).
- Production handoff envelopes come from the runtime, not operator input.

**Why must remediate before runtime emits handoff envelopes** (Sprint 2/3):
- The output-gate is the final word on whether a stage's outputs are consumable. Defense-in-depth here is load-bearing.

**Recommended remediation** (Sprint 6 or earlier):
```python
import re
SCHEMA_ID_RE = re.compile(r'^loa\.stream\.[A-Za-z]+\.v[0-9]+$')
if not SCHEMA_ID_RE.match(schema_id):
    raise _err_usage(f"unrecognized schema_id format '{schema_id}'")
```

This single regex line closes both the absolute-path traversal AND any future weird-character injection.

---

## Sprint 1 vs. Sprint 0 Audit Continuity

Sprint 0 audit closed 3 findings (1 HIGH + 2 MEDIUM, all non-blocking for the contract-only landing). Sprint 1's findings inherit the same shape: defense-in-depth gaps where the validators trust their input, with upstream schema validation as the load-bearing mitigation. None of Sprint 0's findings re-surface in Sprint 1 code (composition_id regex, iteration constraint fixture, strict-tier conditional fixture were each addressed or tracked elsewhere per Sprint 0 audit notes).

Sprint 0's Finding #1 (composition_id regex over-permissive vs SDD `first_12_chars`) remains tracked forward to Sprint 2 (envelope builder must clamp the regex). This audit confirms no Sprint 1 code emits or compares composition_ids — the surface stays sealed for Sprint 1.

---

## Test Coverage of Security-Adjacent Paths

| Path | Test | Status |
|---|---|---|
| Hash mismatch detection (tampered output) | `tests/composition/output-gate/run.bats:75-87` | ✓ Passes; verifies tamper triggers `[OUTPUT-CONTRACT-VIOLATION]/hash_mismatch` |
| Required output missing | `tests/composition/output-gate/run.bats:62-73` | ✓ Passes; verifies `[OUTPUT-MISSING]` |
| Orphan output (rogue handoff entry) | `tests/composition/output-gate/run.bats:89-127` | ✓ Passes; verifies `[ORPHAN-OUTPUT]` |
| Strict-tier prereq exit 78 | `tests/composition/preflight/run.bats:51-65` | ✓ Passes |
| Audit-keys missing exit 78 | `tests/composition/preflight/run.bats:106-124` | ✓ Passes |
| Out-of-domain stage rejection | `tests/composition/validators/run.bats:37-41` | ✓ Passes |
| Iteration mandate | `tests/composition/validators/run.bats:51-62` | ✓ Passes (both ITERATION errors) |

Adversarial test patterns absent (out of scope for Sprint 1 — would require Sprint 4's adversarial suite per SDD §6.5b CI matrix):
- Path traversal via crafted slug (Finding #1) — should land as a unit test in Sprint 6 hardening.
- Absolute-path schema_id injection (Finding #2) — same.
- Symlink resolution — out-of-scope until Sprint 3+ stage executor.
- TOCTOU on hash recompute — hard to test deterministically; documented risk.

---

## Beads Integration

```
br comments add bd-nobi.2 "AUDIT APPROVED 2026-05-08. Verdict: LETS FUCKING GO with 2 MEDIUM findings tracked forward to Sprint 6 hardening. See grimoires/loa/a2a/sprint-1/auditor-sprint-feedback.md. Both findings are defense-in-depth gaps where validator trusts schema-validated input; upstream composition.schema.json blocks the attack on production paths. Remediation: slug regex check at validator boundary + realpath containment + schema_id regex enforcement."
br label add bd-nobi.2 security-approved
```

---

## Recommendation Forward

1. **Sprint 6 hardening track** — open a single issue covering both findings: slug regex + schema_id regex + realpath containment. ~30 lines of code, 2 new bats tests. Touches output-gate.py and compose-stream-graph.py only.
2. **Sprint 2 carry** — when envelope builder lands, ensure it ALWAYS schema-validates incoming compositions before invoking compose-stream-graph (the production caller should never pass unschema-validated input to the validator).
3. **Sprint 4 adversarial suite** — add path-traversal-via-slug AND absolute-schema_id as fixtures in the strict-tier adversarial test matrix per SDD §6.5b.
4. **Track in NOTES.md** — defense-in-depth as a recurring theme: "validators must enforce their own input contract, even when upstream is expected to."

Sprint 1 is **APPROVED** for landing. The two MEDIUM findings are tracked forward, non-blocking for the validators-only landing, and remediation is straightforward when the operator schedules Sprint 6 or addresses them inline.
