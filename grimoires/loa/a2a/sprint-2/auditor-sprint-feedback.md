# Sprint 2 Security Audit — Paranoid Cypherpunk Auditor

**Sprint**: Sprint 2 — Envelope Builder + Hash Chain + Dry-Run
**Cycle**: cycle-construct-bounded-context (`simstim-20260508-96627a1c`)
**Branch**: `cycle/construct-bounded-context`
**Date**: 2026-05-08
**Verdict**: **APPROVED - LETS FUCKING GO**
**Risk Level**: MEDIUM (3 findings tracked forward — 2 inherited from Sprint 1, 1 new)

> Stale prior-cycle audit superseded.

---

## Verdict

**APPROVED - LETS FUCKING GO** ⚠

Sprint 2 ships the envelope substrate. The two-pass self-hash algorithm closes the FR-1.6 self-reference paradox; the chain validator catches both integrity tampering (self-hash) and linkage tampering (prev_hash topology). All 14 envelope tests pass; combined Sprint 1+2 matrix 32/32; Sprint 0 schema gate regression-clean.

Findings: 3 MEDIUM (2 inherited from Sprint 1's audit + 1 new), all non-blocking for Sprint 2 landing. The inherited findings ARE more visible now — slug traversal hits a SECOND caller, JCS fallback breadth grew from 1 site to 4. The shape of the fix doesn't change; the urgency increases.

## Defense Layers Validated ✓

- **No secrets in code**: scanned 7 Sprint 2 files for credentials/tokens — zero hits.
- **YAML deserialization**: all `yaml.*` calls use `yaml.safe_load`. No `yaml.load()`.
- **JSON deserialization**: all `json.loads` user-input paths handled with try/except. No `eval()` or `exec()` calls.
- **Two-pass self-hash**: closes the SDD §3.1 self-reference paradox via field-strip + canonicalize + sha256. Verified idempotent (test 4).
- **Chain integrity vs linkage** distinguished: validator catches body tamper (self-hash mismatch) AND prev_hash divergence (linkage broken) as DIFFERENT failure modes with the SAME error code `[ENVELOPE-CHAIN-BROKEN]`. Tests 10 + 11 cover both.
- **Contract guards at construction time**: `build_handoff` enforces SDD §3.2 invariants (status=success ⇒ error null; status≠success ⇒ error block populated) at envelope build. Two bats tests verify both paths.
- **JCS canonicalization**: shared shape across the substrate (envelope-chain, envelope-builder, output-gate, compose-dry-run). Determinism is the foundation for hash chain correctness.
- **Process boundary**: `exec python3 "$PY_HELPER" "$@"` in bash wrappers is a process replacement, not stage execution. The python helpers are in the same controlled directory.
- **Sibling-module loading**: `importlib.util.spec_from_file_location` uses a HARDCODED path relative to the script (`_THIS_DIR / "envelope-chain.py"`), not user-controlled — no module injection vector.
- **Exit code discipline**: 78 (EX_CONFIG) reserved for operator-fixable misconfig (consistent with Sprint 1's preflights); 1 used for chain-broken / contract violation; 2 for usage; 3 for environment problems.

## Threat Model Status

| Threat | Status | Note |
|---|---|---|
| Hardcoded credentials | ✓ Mitigated | Zero hits across 7 files |
| YAML deserialization RCE | ✓ Mitigated | yaml.safe_load uniformly |
| JSON deserialization | ✓ Mitigated | json.loads + structured exception handling |
| Path traversal via slug | ⚠ Defense-in-depth | Finding #1 — recurs in envelope-builder |
| Path traversal via schema_id | ⚠ Defense-in-depth | Finding #2 — same as Sprint 1, scope unchanged |
| Hash chain tampering | ✓ Mitigated | Two-pass algorithm + chain validator |
| Hash chain linkage tampering | ✓ Mitigated | Validator distinguishes self-hash vs prev_hash |
| JCS fallback divergence | ⚠ Defense-in-depth | Finding #3 (NEW — breadth grew 1→4 sites) |
| Module loading injection | ✓ Mitigated | importlib spec uses hardcoded path |
| Information disclosure via diagnostics | ⚠ Acceptable | Same as Sprint 1 (operator's own paths) |

## Findings

### Finding #1 — MEDIUM — Path Traversal in envelope-builder._resolve_manifest (RECURRENT)

**Location**: `.claude/scripts/lib/envelope-builder.py:106` — `candidate = packs_dir / slug / "construct.yaml"`.

**Vector**: Same shape as Sprint 1's audit Finding #1 (compose-stream-graph._resolve_manifest line 218). slug joined to packs_dir without traversal containment. Sprint 2 added a second caller; the fix from Sprint 1's audit now needs to apply to BOTH callers.

**Why not blocking**: composition.schema.json regex blocks the attack on schema-validated input; the validators trust their input.

**Recommended remediation** (Sprint 6 hardening):
```python
# Shared utility in lib/path-safety.py:
import re
SLUG_RE = re.compile(r'^[a-z0-9][a-z0-9-/]*[a-z0-9]$')

def safe_pack_path(packs_dir: Path, slug: str) -> Path | None:
    if not SLUG_RE.match(slug):
        return None
    candidate = (packs_dir / slug / "construct.yaml").resolve()
    if not candidate.is_relative_to(packs_dir.resolve()):
        return None
    return candidate
```
Apply to BOTH compose-stream-graph._resolve_manifest AND envelope-builder._resolve_manifest. Single code change, two callers.

### Finding #2 — MEDIUM — Path Traversal via schema_id Type (UNCHANGED)

**Location**: `.claude/scripts/lib/output-gate.py:168-191` (Sprint 1 audit).

**Status**: unchanged in Sprint 2. The output-gate isn't modified. The same recommendation applies: regex constrain `parts[2]` to `^[A-Za-z]+$` per the handoff schema's pattern.

### Finding #3 — MEDIUM — JCS Fallback Breadth Grew (NEW)

**Location**: 4 sites now use the same fallback shape:
1. `.claude/scripts/lib/envelope-chain.py:_jcs_canonical_bytes` (NEW)
2. `.claude/scripts/lib/envelope-builder.py` (via chain library import)
3. `.claude/scripts/lib/output-gate.py:_jcs_canonical_bytes` (Sprint 1)
4. `.claude/scripts/lib/compose-dry-run.py` (via envelope-builder import)

**Vector**: When `rfc8785` Python package is missing, all 4 sites fall back to `json.dumps(sort_keys=True, separators=(",",":"))`. Sprint 1 audit's F2 (CONCERN-2 in reviewer) was scoped to one site.

**Risk**: If a payload field includes a JSON `number` requiring ECMAScript ToNumber semantics (floats, magnitude > 2^53), the fallback hash diverges from rfc8785's. The substrate's audit chain (cycle-098 `audit_emit_signed`) uses rfc8785; chain replay would false-negative across MORE surfaces now.

**Why not blocking**: substrate's typed-streams protocol (Signal/Verdict/Artifact/Intent/OperatorModel) carries no floats in current schemas. Reviewer documents the divergence in reviewer.md Technical Highlights §3.

**Recommended remediation** (Sprint 6 hardening):
```python
# lib/jcs-fallback.py — shared module
import json, hashlib

def jcs_canonical_bytes(value, *, audit_signed: bool = False) -> bytes:
    """Strict-mode (audit_signed=True) requires rfc8785; fails closed if missing."""
    try:
        import rfc8785
        return rfc8785.dumps(value)
    except ImportError:
        if audit_signed:
            raise RuntimeError(
                "rfc8785 required when audit_signed=True; install via `pip install rfc8785`"
            )
        return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
```
All 4 sites import from `lib/jcs-fallback.py`. The audit-keys preflight already gates `audit_signed: true` on bootstrap state; this addition closes the loop on canonicalization too.

### Verification That Sprint 2 Doesn't Open NEW Vectors Beyond Findings #1-3

- `importlib.util.spec_from_file_location("envelope_chain", _THIS_DIR / "envelope-chain.py")` uses a HARDCODED relative path. The "envelope_chain" module name is a string constant. No user input reaches the loader.
- `_load_yaml(path, label)` validates path-is-file before reading; uses `yaml.safe_load`. Same shape as compose-stream-graph + output-gate.
- `_load_json(path, label)` uses `json.loads` with structured exception handling. No `eval`.
- `composition_id(yaml_path)` does NOT use the YAML content for path construction — only for hashing. No path traversal vector via YAML content.
- `_default_packs_dir()` walks UP from `__file__` looking for `.claude/constructs/packs`. Bounded walk; hits filesystem root and returns None. No traversal vector.

## Sprint 2 vs. Sprint 1 Audit Continuity

Sprint 1 closed 2 MEDIUM findings + 1 LOW (heredocs). Sprint 2 inherits both MEDIUMs and adds 1 new (JCS fallback breadth). All three remain non-blocking. The remediation pathway converges: **Sprint 6 hardening track** should land:
1. Shared `lib/path-safety.py` with `safe_pack_path` (closes F1 across compose-stream-graph + envelope-builder).
2. Schema_id regex in `output-gate._stream_schema_path` (closes F2).
3. Shared `lib/jcs-fallback.py` with `audit_signed` fail-closed guard (closes F3 across 4 sites).

Three small files; ~60 LOC total; closes all current findings AND prevents recurrence in Sprint 3-5 work.

## Test Coverage of Security-Adjacent Paths

| Path | Test | Status |
|---|---|---|
| Two-pass self-hash idempotence | `tests/composition/envelopes/run.bats:60-78` | ✓ Passes |
| Chain validation accepts valid 2-envelope chain | `tests/composition/envelopes/run.bats:130-142` | ✓ Passes |
| `[ENVELOPE-CHAIN-BROKEN]` on body tamper | `tests/composition/envelopes/run.bats:144-160` | ✓ Passes (single-byte) |
| `[ENVELOPE-CHAIN-BROKEN]` on linkage tamper | `tests/composition/envelopes/run.bats:162-186` | ✓ Passes (prev_hash mismatch) |
| Contract violation: success+error | `tests/composition/envelopes/run.bats:108-119` | ✓ Passes (exit 1) |
| Contract violation: failure-error | `tests/composition/envelopes/run.bats:121-128` | ✓ Passes (exit 1) |
| dry-run schema validation | `tests/composition/envelopes/run.bats:208-220` | ✓ Passes |
| dry-run errors[] empty for valid | `tests/composition/envelopes/run.bats:222-230` | ✓ Passes |
| dry-run errors[] non-empty for bad | `tests/composition/envelopes/run.bats:232-243` | ✓ Passes |

Adversarial test patterns absent (out of scope for Sprint 2 — Sprint 4 owns the strict-tier adversarial suite per SDD §6.5b CI matrix):
- Path traversal via crafted slug (Finding #1) — Sprint 6 hardening test.
- Schema_id regex bypass (Finding #2) — Sprint 6 hardening test.
- JCS fallback divergence on float payload (Finding #3) — Sprint 6 hardening test.
- Symlink resolution — out-of-scope until Sprint 3+ stage executor.

## Beads Integration

```
br comments add bd-nobi.3 "AUDIT APPROVED 2026-05-08. Verdict: LETS FUCKING GO with 3 MEDIUM findings tracked. F1 (slug traversal — Sprint 1 inherited, NOW IN 2 CALLERS) + F2 (schema_id traversal — unchanged) + F3 (JCS fallback breadth — 1→4 sites). All defense-in-depth, mitigated by composition.schema.json + handoff schema regex. Sprint 6 hardening track closes all three with ~60 LOC across 3 shared utility files."
br label add bd-nobi.3 security-approved
```

## Recommendation Forward

1. **Sprint 6 hardening track** — single dedicated bead/issue covering F1+F2+F3. Three new shared utility files (~60 LOC); applied to existing callers via grep-and-replace + 3 new bats tests.
2. **Sprint 3 carry**: when stage executor lands, ensure it ALWAYS schema-validates incoming compositions before invoking compose-stream-graph or envelope-builder. The validators trust their input; the gate must be upstream.
3. **Sprint 4 adversarial suite** — add path-traversal-via-slug + absolute-schema_id + JCS-fallback-on-float as fixtures.
4. **NOTES.md update** — add a new decision-log entry for Sprint 2 noting the JCS fallback breadth growth and the three-finding hardening bundle for Sprint 6.

Sprint 2 is **APPROVED** for landing. The three MEDIUM findings are tracked forward, non-blocking for the envelope-substrate landing, with a clear single Sprint 6 hardening bundle as remediation.
