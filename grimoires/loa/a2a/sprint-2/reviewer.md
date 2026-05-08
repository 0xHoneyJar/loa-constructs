# Sprint 2 Implementation Report

**Sprint**: Sprint 2 — Envelope Builder + Hash Chain + Dry-Run (RUNNER + CONTRACT layers)
**Cycle**: cycle-construct-bounded-context (simstim-20260508-96627a1c)
**Branch**: `cycle/construct-bounded-context`
**Plan ID**: `plan-20260508-96627a1c`
**Beads**: `bd-nobi.3`
**Date**: 2026-05-08
**Commit**: `5fcd5c96`

> Stale prior-cycle artifacts (Explorer UX Enhancements, 2026-01-31; cycle-098 Sprint 2 progress 2A-2D) have been superseded.

---

## Executive Summary

Sprint 2 lands the envelope substrate: content-addressed, hash-chained, JCS-canonical envelopes that turn Sprint 0's schemas + Sprint 1's validators into a real runtime contract. Schemas (S0) → validators (S1) → envelopes (S2) — the entire **strong contract layer** is now in place. Sprint 3 will execute against this surface.

Ships in one commit (`5fcd5c96`): 6 new library files (3 Python cores + 3 bash wrappers), 1 new bats suite (14 tests, 100% pass), +1740 lines, zero modifications to existing code (additive only).

No execution code yet — pure data assembly + validation. Stage executor lands in Sprint 3 (advisory tier) and Sprint 4 (strict tier + adversarial suite).

**Test status**: 14/14 Sprint 2 tests pass. Sprint 1 + 2 combined: 32/32. Sprint 0 schema gate: regression-clean.

The deferred `[ENVELOPE-CHAIN-BROKEN]` from Sprint 1's AC-1.A is now CLOSED.

---

## AC Verification

### Sprint 2 acceptance gate

> **AC-2.A**: Dry-run on `audit-feel` produces full envelope chain preview.

✓ Met (with caveat). Implemented at `.claude/scripts/lib/compose-dry-run.{sh,py}`. Output validates against `.claude/data/dry-run-fixture.schema.json`. Verified empirically + by `tests/composition/envelopes/run.bats:208-220`. Caveat: `audit-feel` not installed at canonical path; golden-path equivalent fixture exercises identical code paths. Same deferral as Sprint 1's AC-1.C.

> **AC-2.B**: Chain-break detection catches single-byte tampering.

✓ Met. Two distinct vectors covered:
- Body tamper: `tests/composition/envelopes/run.bats:144-160` — mutate `.summary.text` without re-hashing → `[ENVELOPE-CHAIN-BROKEN]`/self-hash mismatch.
- Linkage tamper: `tests/composition/envelopes/run.bats:162-186` — mutate `prev_hash` AND re-hash to bypass self-hash check → `[ENVELOPE-CHAIN-BROKEN]`/prev_hash mismatch.

Both pass; validator distinguishes integrity vs linkage tampering.

> **AC-2.C**: `composition_id` is deterministic and stable.

✓ Met. Three tests cover the IMP-001 contract (`tests/composition/envelopes/run.bats:36-58`):
- Same content → same id (test 1)
- Different content → different id (test 2)
- Format matches schema regex `^[A-Za-z0-9_./-]+@sha256:[0-9a-f]{12,64}$` (test 3)

Implementation: `envelope-chain.py:composition_id` parses YAML → JCS-canonical → sha256 → first-12 hex. Stable across whitespace/key-order; unstable across semantic mutations.

> **AC-2.D**: No actual execution yet — envelopes built, no subprocess spawned.

✓ Met. Greppable: zero `subprocess.run`/`subprocess.Popen`/`os.execv*`/`os.popen` in any Sprint 2 file. The only `exec` is `exec python3` in bash wrappers (process replacement, not stage execution).

### Sprint 1 deferral closure

> **AC-1.A residual**: `[ENVELOPE-CHAIN-BROKEN]` reproducible.

✓ Closed. `envelope-chain.py:validate_chain` (lines 230-360) walks chain + emits `[ENVELOPE-CHAIN-BROKEN]` on 5 distinct failure modes. Tests at `tests/composition/envelopes/run.bats:144-186` cover body + linkage tamper.

Sprint 1's AC-1.A "5 of 6, 1 deferred" → "6 of 6 closed" cycle-wide. The matching NOTES.md decision-log entry remains as-is (entry documented the deferral; closure is implicit in this report).

---

## Tasks Completed

### S2-T2 — `lib/envelope-chain.{sh,py}` (~530 + ~50 lines)

API:
- `compute_self_hash(envelope, hash_field?)` — strips field, JCS, sha256.
- `populate_self_hash(envelope)` — convenience wrapper.
- `compute_prev_hash(prior_envelope)` — sha256(jcs(prior with hash populated)).
- `composition_id(yaml_path)` — IMP-001 deterministic id (S2-T3).
- `validate_chain(envelopes)` — full-chain walk + integrity verification.

CLI: `self-hash`, `prev-hash`, `validate`, `compose-id`. Exit 0/1/2/3 per project convention.

Two-pass design closes self-reference paradox (FR-1.6): hash is sha256 of envelope WITHOUT the hash field; result then written into the field.

### S2-T3 — composition_id derivation

Inside `envelope-chain.py:composition_id`. Format: `{basename}@sha256:{first_12_hex(sha256(jcs(yaml)))}`. Stable across formatting, unstable across semantics.

### S2-T1 — `lib/envelope-builder.{sh,py}` (~465 + ~40 lines)

`build_invocation`: composition + stage + run_id + prior_handoff? → invocation envelope with all SDD §3.1 fields. Computes prev_hash from prior handoff (or null), populates self-hash via two-pass.

`build_handoff`: invocation + status + outputs + summary → handoff envelope. prev_hash = paired invocation_hash. Contract guards (status=success ⇒ error=null; status≠success ⇒ error populated) raise `[CONTRACT]` exit 1.

Imports envelope-chain via `importlib.util` with `sys.modules` registration (required for dataclass `cls.__module__` lookup).

### S2-T4 — `lib/compose-dry-run.{sh,py}` (~360 + ~38 lines)

Output conforms to `.claude/data/dry-run-fixture.schema.json`. Per stage:
- `invocation_envelope_preview` (hashes elided as `<computed-at-run-time>`)
- `allowed_files`, `missing_schemas`, `domain_conflicts`, `isolation_assessment`

CI gate (IMP-007): `errors[] == []` blocks merge. Standalone — Sprint 3 wires into compose-run.sh's flag path.

### S2-T5 — chain validation at startup + per-stage + replay

`envelope-chain.sh validate` is the entry point. Walks envelopes in order, emits `[ENVELOPE-CHAIN-BROKEN]` on:
- Self-hash mismatch
- First envelope with non-null prev_hash
- Subsequent invocation prev_hash != prior handoff_hash
- Handoff with no paired invocation (stage_id, stage_pass)
- Handoff prev_hash != paired invocation_hash

Library is integration-ready; compose-run.sh wiring is Sprint 3's responsibility.

### S2-T6 — fixtures + tampering sentinel (`tests/composition/envelopes/run.bats`, 14 tests, ~260 lines)

| # | Test | Coverage |
|---|---|---|
| 1-3 | composition_id determinism | S2-T3 |
| 4 | self-hash idempotence | S2-T2 |
| 5-8 | envelope construction + contract guards | S2-T1 |
| 9 | chain validation acceptance | S2-T5 |
| 10-11 | `[ENVELOPE-CHAIN-BROKEN]` body+linkage tamper | S2-T6 + Sprint 1 closure |
| 12-14 | dry-run schema validation + CI gate | S2-T4 |

No static fixture for chain-break (chain-break is a multi-envelope property; the test fabricates the chain at runtime via the builder, then mutates — more rigorous than static fixture).

---

## Technical Highlights

**1. Two-pass self-hash idempotence**. Verified: hashing an envelope without the hash field and an envelope with the field both yield the same digest. The `_self_hash_field` resolver looks up which field name to strip based on `schema_version` (loa.construct.invocation.v0 → `invocation_hash`, etc.), with a `output_contract`/`outputs`-presence fallback for malformed schemas.

**2. Sibling-module loading workaround**. envelope-builder.py loads envelope-chain.py via `importlib.util.spec_from_file_location` (the hyphen in the filename prevents standard import). We register the module in `sys.modules` BEFORE `exec_module` because envelope-chain.py uses `@dataclass`, which needs `sys.modules.get(cls.__module__)` for type introspection — without registration, `@dataclass` raises `'NoneType' object has no attribute '__dict__'`.

**3. JCS fallback shared across substrate**. envelope-chain, envelope-builder, output-gate all use the same shape: prefer rfc8785, fall back to `json.dumps(sort_keys=True, separators=(",",":"))`. Byte-equivalent for the substrate's no-float payload contract. Sprint 1 auditor's F2 (JCS fails-open) breadth grew from 1 site to 3; remediation strategy unchanged (Sprint 6 hardening, single shared helper, fail-closed when audit_signed=true).

**4. Stage_id regex compliance**. The dry-run schema's stage_id regex permits exactly ONE dot. Multi-dot fixture filenames (`golden-path.valid.yaml`) get normalized via `composition.name`-preference + dot-replacement fallback (`golden-path-valid.stage-1`).

**5. Contract guards at construction time**. `build_handoff` enforces SDD §3.2 invariants at envelope build (not at runtime). Two bats tests verify both contract violations are caught at exit 1 with `[CONTRACT]` prefix.

**6. dry-run is the merge gate**. IMP-007 framing: `compose-dry-run.sh <yaml> | jq -e '.errors == []'` is the CI signal. Test #14 verifies a known-bad fixture produces non-empty errors.

---

## Testing Summary

| Suite | Count | Status |
|---|---|---|
| envelopes (S2) | 14 | ✓ 14/14 |
| Sprint 1 carryforward | 18 | ✓ 18/18 |
| Sprint 0 schema gate | 9 | ✓ 9/9 |
| **Combined** | **41** | **✓ 41/41** |

```bash
bats tests/composition/envelopes/run.bats \
     tests/composition/validators/run.bats \
     tests/composition/preflight/run.bats \
     tests/composition/output-gate/run.bats
.claude/scripts/composition-schema-validate.sh
```

---

## Known Limitations

1. **`audit-feel` deferral persists** — same caveat as Sprint 1 AC-1.C.
2. **compose-run.sh integration deferred to Sprint 3** — canonical SDD §4.7 path; one-line dispatch when stage executor lands.
3. **JCS fallback breadth grew (1→3 sites)** — Sprint 6 hardening: shared helper + fail-closed guard.
4. **Slug path traversal vector inherits from Sprint 1** — same `packs_dir / slug / "construct.yaml"` pattern. Sprint 6 should add slug regex + realpath containment across all 3 callers.
5. **Persistent state TTL not exercised** — Sprint 5's `lib/persistent-state.sh` owns this surface.
6. **Iteration awareness minimal** — full iteration semantics (dual-run mode, L1/L2/L3 diff) land in Sprint 5.

---

## Verification Steps

```bash
# 1. All 14 Sprint 2 bats tests pass
bats tests/composition/envelopes/run.bats

# 2. Combined Sprint 1+2 regression
bats tests/composition/{envelopes,validators,preflight,output-gate}/run.bats

# 3. Sprint 0 schema gate
.claude/scripts/composition-schema-validate.sh

# 4. End-to-end demo
mkdir -p /tmp/sprint2-demo
.claude/scripts/lib/envelope-builder.sh invocation \
  --composition tests/composition/validators/fixtures/golden-path.valid.yaml \
  --stage 1 --run-id "demo" --quiet --out /tmp/sprint2-demo/stage-1.invocation.json
.claude/scripts/lib/envelope-builder.sh handoff \
  --invocation /tmp/sprint2-demo/stage-1.invocation.json --status success \
  --outputs '[{"type":"Signal","uri":"/tmp/x","schema_id":"loa.stream.Signal.v1","hash":"sha256:abc","domain":{"primary":"design","produced_by":"artisan"}}]' \
  --summary "demo" --quiet --out /tmp/sprint2-demo/stage-1.handoff.json
.claude/scripts/lib/envelope-chain.sh validate \
  --envelopes /tmp/sprint2-demo/stage-1.invocation.json /tmp/sprint2-demo/stage-1.handoff.json
# Should exit 0, ok=true

# 5. Tamper detection
jq '.summary.text = "tampered"' /tmp/sprint2-demo/stage-1.handoff.json > /tmp/x && mv /tmp/x /tmp/sprint2-demo/stage-1.handoff.json
.claude/scripts/lib/envelope-chain.sh validate \
  --envelopes /tmp/sprint2-demo/stage-1.invocation.json /tmp/sprint2-demo/stage-1.handoff.json
# Should exit 1 with [ENVELOPE-CHAIN-BROKEN]

# 6. Dry-run + schema validation
.claude/scripts/lib/compose-dry-run.sh tests/composition/validators/fixtures/golden-path.valid.yaml | \
  python3 -c "import json,jsonschema,sys;jsonschema.validate(json.loads(sys.stdin.read()),json.loads(open('.claude/data/dry-run-fixture.schema.json').read()));print('VALID')"
```

---

## Open Items / Recommendations

1. **Sprint 3**: wire `compose-dry-run.sh` into compose-run.sh's `--dry-run --explain-context` flag path (one-line dispatch). Honors SDD §4.7 canonical path.
2. **Sprint 3**: integrate `envelope-chain.sh validate` at run startup before stage executor spawns. Catches replay tampering.
3. **Sprint 6 hardening**: shared `_jcs_canonical_bytes` in a single `lib/jcs-fallback.py`; fail-closed guard when `audit_signed: true` and rfc8785 missing.
4. **Sprint 6 hardening**: slug + schema_id regex validation across all 3 callers (compose-stream-graph, output-gate, envelope-builder). Single regex constant, realpath containment, applied consistently.
5. **Persistent state spec carry to Sprint 5**: envelope-builder doesn't yet emit `persistent_state` block in the invocation envelope — Sprint 5 adds the persistent state composite key + lookup.

---

## Feedback Addressed

First reviewer.md for Sprint 2 in this cycle. No prior feedback to address. Sprint 1's auditor findings (F1 slug traversal, F2 schema_id traversal) recur in Sprint 2's `_resolve_manifest` (same pattern); tracked in Known Limitations §4 above. Sprint 1's reviewer CONCERN-2 (JCS fallback fails-open) breadth grew from 1 site to 3; documented in Technical Highlights §3.

Cheval probe (Sprint 1 CONCERN-1) is unchanged in Sprint 2 — Sprint 2 doesn't touch the probe.
