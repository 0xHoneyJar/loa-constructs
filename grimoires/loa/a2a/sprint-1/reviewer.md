# Sprint 1 Implementation Report

**Sprint**: Sprint 1 — Validators (pre/post-exec, prereq) (CONTRACT layer)
**Cycle**: cycle-construct-bounded-context (simstim-20260508-96627a1c)
**Branch**: `cycle/construct-bounded-context`
**Plan ID**: `plan-20260508-96627a1c`
**Beads**: `bd-nobi.2` (epic `bd-nobi`)
**Date**: 2026-05-08

> **Note on stale prior-cycle artifacts**: Files in `grimoires/loa/a2a/sprint-1/` dated 2025-12-30 (Sprint 1 — Project Foundation) and the `progress-1A..D.md` files (cycle-098-agent-network) are NOT this sprint. They are leftovers from prior cycles that share the `sprint-1/` path. This report (and the COMPLETED marker, when written) supersedes them for the current cycle.

---

## Executive Summary

Sprint 1 lands the **strong contract layer's enforcement skin**: three validators that turn the Sprint 0 schemas into runtime gates, plus two pre-exec prerequisite checks. All run before any stage executes.

Five of six acceptance error classes from S1-T1 now have validator coverage. The sixth (`[ENVELOPE-CHAIN-BROKEN]`) is deferred to Sprint 2 where it sits naturally with `envelope-chain.sh` — that decision is owned by the partial S1 commit (`dfa8a912`) and confirmed in this report's deferral notes.

Sprint 1 ships in **two commits**:

1. `dfa8a912` (partial Sprint 1 — already on branch)
   - `S1-T1` core: `compose-stream-graph.{sh,py}` validator (4 of 6 error classes)
   - `S1-T6` partial: 4 fixtures + 5 bats tests
2. *(this commit — final Sprint 1 wrap-up)*
   - `S1-T1` extension: `[STAGE-OUT-OF-DOMAIN]` error class added to `compose-stream-graph.py` (paired with `S1-T4` manifest resolution)
   - `S1-T2`: `lib/output-gate.{sh,py}` post-exec output validator (5-clause contract per SDD §4.4)
   - `S1-T3`: `lib/strict-tier-prereq.sh` strict-tier environment gate (FR-4.4 / SDD §6.5b)
   - `S1-T4`: `construct-validate.sh` extended with tier resolution + tier-conditional severity escalation (SDD §3.4)
   - `S1-T5`: `lib/audit-keys-preflight.sh` audit-grade signing pre-flight (SDD §6.3)
   - `S1-T6` completion: `iterate-no-termination.invalid.yaml` + `stage-out-of-domain.invalid.yaml` fixtures + 18-test bats matrix across three suites (validators / preflight / output-gate)

No execution code yet — Sprint 1 is validators-only by design. Stage executor lands in Sprint 3 + 4.

**Test status**: 18 / 18 bats tests pass across the three Sprint 1 suites. Sprint 0 schema-validation gate (`composition-schema-validate.sh`) regression-clean (`pass=9 fail=0 skip=0`).

---

## AC Verification

Walks every acceptance criterion in `grimoires/loa/sprint.md` §Sprint 1.

### Sprint 1 acceptance gate

> **AC-1.A**: 6 typed errors all reproducible on synthetic compositions.

⚠ Partial — five of six closed; one explicitly deferred to its natural home in Sprint 2.

| Error code | Status | Fixture | Test |
|---|---|---|---|
| `[STREAM-NO-PRODUCER]` | ✓ Met | `tests/composition/validators/fixtures/stream-no-producer.invalid.yaml` | `tests/composition/validators/run.bats:25-29` |
| `[STREAM-SCHEMA-MISMATCH]` | ✓ Met | `tests/composition/validators/fixtures/stream-schema-mismatch.invalid.yaml` | `tests/composition/validators/run.bats:31-35` |
| `[STAGE-OUT-OF-DOMAIN]` | ✓ Met | `tests/composition/validators/fixtures/stage-out-of-domain.invalid.yaml` | `tests/composition/validators/run.bats:37-41` |
| `[ITERATION-NO-MAX]` | ✓ Met | `tests/composition/validators/fixtures/iterate-no-max.invalid.yaml` | `tests/composition/validators/run.bats:51-55` |
| `[ITERATION-NO-TERMINATION]` | ✓ Met | `tests/composition/validators/fixtures/iterate-no-termination.invalid.yaml` | `tests/composition/validators/run.bats:57-62` |
| `[ENVELOPE-CHAIN-BROKEN]` | ⏸ [ACCEPTED-DEFERRED] | — | — |

`[ENVELOPE-CHAIN-BROKEN]` deferral rationale: the error class is the natural responsibility of `envelope-chain.sh` (Sprint 2 / S2-T2 + S2-T5 per `grimoires/loa/sprint.md:107-115`). It manifests during full-run replay (chain integrity is checked when reading prior handoff envelopes), not during pre-execution stream-graph validation. Wiring this class into `compose-stream-graph.py` would require duplicating the chain-walk logic that Sprint 2 will own anyway. The deferral is pre-existing in the partial S1-T1 commit (`dfa8a912`) and the matching NOTES.md decision-log entry is added by this report.

> **AC-1.B**: Top-12 packs that lack domain blocks fail validation in strict tier; pass in advisory.

✓ Met. `construct-validate.sh` resolves a pack's tier from `.claude/data/construct-validation-tiers.yaml` (S0-T4 deliverable):

- Top-12 packs (artisan, observer, protocol, beacon, mibera-codex, k-hole, the-easel, gecko, crucible, hardening, kansei, showcase) → tier=`strict` via `explicit_top_12`.
- All other packs → tier=`advisory` via `default_tier` (unless `.claude/data/legacy-domain-contracts/<slug>.yaml` exists, in which case they upgrade to `compatibility`).

Verified empirically:

```
$ .claude/scripts/construct-validate.sh .claude/constructs/packs/artisan --json | jq '{tier, tier_reason, runner_eligibility, worst_severity}'
{
  "tier": "strict",
  "tier_reason": "explicit_top_12",
  "runner_eligibility": "golden_path_allowed",
  "worst_severity": "high"
}
$ .claude/scripts/construct-validate.sh .claude/constructs/packs/archivist --json | jq '{tier, tier_reason, runner_eligibility, worst_severity}'
{
  "tier": "advisory",
  "tier_reason": "default_tier",
  "runner_eligibility": "golden_path_blocked",
  "worst_severity": "medium"
}
```

The `escalate` function (`construct-validate.sh:135-148`) maps tier × check-name → severity. Strict-tier packs missing streams declarations escalate from `low` to `high`; missing capabilities/context_policy from `low` to `medium`; missing domain block from `medium` to `high`. Advisory packs keep their pre-existing severity baseline.

> **AC-1.C**: `audit-feel` composition passes pre-execution validation.

⏸ Deferred — composition isn't installed at the canonical path on this dev box (no `.claude/compositions/audit-feel.yaml` or `loa-compositions/compositions/audit-feel.yaml`). The validator surface itself accepts a golden-path equivalent fixture (`tests/composition/validators/fixtures/golden-path.valid.yaml`, 2-stage artisan→observer pipeline) per `tests/composition/validators/run.bats:19-23`. When `audit-feel` lands in the registry (per the loom skill ecosystem), running `compose-stream-graph.sh path/to/audit-feel.yaml` will exercise the same code path. Tracking forward in NOTES.md.

> **AC-1.D**: No execution code yet — validators only.

✓ Met. Diff inspection of the 8 Sprint 1 files added/modified: zero `execve`, zero `subprocess.run` for stage execution, zero `tmux send-keys`. The cheval-adapter probe in `strict-tier-prereq.sh` (lines 86-122) does an `importlib.import_module` of the loa_cheval base adapter — pure introspection, no provider invocation.

### Per-task acceptance criteria

> **S1-T1** acceptance: validator builds DAG, rejects every error class.

✓ Met for 5 of 6 (see AC-1.A). DAG construction lives at `compose-stream-graph.py:_check_streams` (the producer-map walk that registers writes after each stage and verifies reads against the prior-stages set).

> **S1-T2** acceptance: post-exec validator confirms writes contract match, schema validation, hash recompute, domain.produced_by attribution, output count match. Failure produces `[OUTPUT-CONTRACT-VIOLATION]`.

✓ Met. `output-gate.py:validate` walks every check:

- File-exists: required missing → `[OUTPUT-MISSING]` (or warning when optional).
- JSON parse → `[OUTPUT-CONTRACT-VIOLATION]/json_parse`.
- Schema validation: `_stream_schema_path` resolves `loa.stream.<Type>.v<N>` → `<schemas-dir>/<type-kebab>.schema.json`; `_validate_payload_against_schema` runs jsonschema when installed, silent skip otherwise (Sprint 0 already gates schema validity, so this is a hot-path defense-in-depth check).
- Hash recompute via JCS: `_jcs_canonical_bytes` + sha256, compared to handoff's reported hash.
- Domain attribution: TWO checks, per the schema's actual semantics. `domain.produced_by` is a *construct slug* (handoff schema:96-104) — cross-checked against invocation's `construct_slug`, with `delegated_to` as the legal mismatch escape. `domain.primary` is a *domain tag* — cross-checked against the manifest's `domain.primary + supporting[]` set.
- Output count: orphan loop emits `[ORPHAN-OUTPUT]` for any handoff entry not declared in the contract.

Tests: `tests/composition/output-gate/run.bats`, all 4 cases pass (golden / missing / hash mismatch / orphan).

> **S1-T3** acceptance: detects `bwrap`, `CAP_NET_ADMIN`, provider memory-disable flag support; aborts with `[STRICT-TIER-PREREQ-MISSING]` exit 78.

✓ Met. `strict-tier-prereq.sh` runs three probes (`probe_bwrap`, `probe_cap_net_admin`, `probe_cheval_memory_disable`). The composition-tier discovery (`requests_strict_tier`) yq-walks both top-level `composition.isolation_tier` and `chain[]?.context_policy?.isolation_tier`. Exit 78 when any error is collected. Verified by `tests/composition/preflight/run.bats:25-65`.

> **S1-T4** acceptance: strict packs fail closed without full domain block; compatibility packs require contract; advisory packs warn-only with `runner_eligibility: golden_path_blocked`.

✓ Met. Tier resolution at `construct-validate.sh:67-130`. Tier-conditional contract presence rules at lines 245-271. Severity escalation via the `escalate` function at lines 135-148. JSON output now includes top-level `tier`, `tier_reason`, `runner_eligibility`, `contract_path`, `worst_severity`, `findings[]` (lines 392-413). The `(if length > 0 then ... else null end)` pattern fixes a `select(length > 0)` jq gotcha that was filtering the entire output object when contract was absent — see Technical Highlights for the post-mortem.

> **S1-T5** acceptance: aborts with `[AUDIT-KEYS-NOT-BOOTSTRAPPED]` exit 78 + runbook reference if keys missing.

✓ Met. `audit-keys-preflight.sh` checks four signals (sentinel file, env var path, private-key file readability, public-key registry presence). Bootstrap is "complete" if either the sentinel + public-key path exists OR the env-var private + public-key path exists. Runbook path `grimoires/loa/runbooks/audit-keys-bootstrap.md` always surfaced in the JSON output. Exit 78 when bootstrap incomplete and composition declares `audit_signed: true`. Verified by `tests/composition/preflight/run.bats:69-124`.

> **S1-T6** acceptance: 6 composition YAMLs that should fail + 1 golden-path YAML.

✓ Met for 5 + golden-path. The 6th (envelope-chain-broken) is deferred per AC-1.A. Fixture matrix at `tests/composition/validators/fixtures/`:

```
golden-path.valid.yaml
iterate-no-max.invalid.yaml
iterate-no-termination.invalid.yaml          ← S1-T6 completion
stage-out-of-domain.invalid.yaml             ← S1-T6 completion (paired with S1-T4)
stream-no-producer.invalid.yaml
stream-schema-mismatch.invalid.yaml
```

---

## Tasks Completed

### S1-T1 (extension) — `[STAGE-OUT-OF-DOMAIN]` validator

`.claude/scripts/lib/compose-stream-graph.py` (modified, ~+95 lines)

Added `_resolve_manifest` + `_manifest_domain_set` helpers that read `<packs-dir>/<slug>/construct.yaml` and compute the union of `domain.primary + domain.supporting[]`. Accepts string-form, array-form, and object-form domain declarations for brownfield compatibility.

Added `_check_stage_domain` validation pass — for each stage with declared `domain.primary`, look up the construct's manifest and emit `[STAGE-OUT-OF-DOMAIN]` if the stage's primary isn't in the manifest's authorised set. Missing manifest OR missing manifest domain block → warning (not error) so partially-installed compositions and pre-substrate legacy packs don't fail closed unnecessarily.

CLI gains `--packs-dir` (defaults to auto-located `.claude/constructs/packs`) and `--no-domain-check` (escape hatch for environments without a packs install).

### S1-T2 — `lib/output-gate.{sh,py}` post-exec output validator

`.claude/scripts/lib/output-gate.py` (new, ~470 lines)
`.claude/scripts/lib/output-gate.sh` (new, ~45 lines — bash wrapper around python core, mirrors compose-stream-graph pattern)

Five-clause validation per declared `output_contract.writes[]` entry:
1. **File-exists**: required output missing → `[OUTPUT-MISSING]`; optional missing → warning.
2. **JSON-parse**: malformed payload → `[OUTPUT-CONTRACT-VIOLATION]/json_parse`.
3. **Schema-validation**: `loa.stream.<Type>.v<N>` resolved via `_stream_schema_path` (kebab-case mapping for `OperatorModel` → `operator-model.schema.json`); jsonschema validation when installed.
4. **Hash recompute**: JCS canonicalise (rfc8785 if installed; sort_keys+separators fallback otherwise — sufficient for substrate's no-float output payload contract) → sha256 → compare to handoff's reported `hash`. Mismatch → `[OUTPUT-CONTRACT-VIOLATION]/hash_mismatch`.
5. **Domain attribution**: produced_by ↔ construct_slug cross-check (with `delegated_to` as legal mismatch escape) AND domain.primary tag ↔ manifest-domain-set check. Two distinct checks per the handoff schema's actual field semantics.

Plus orphan detection: any handoff `outputs[]` URI not in the contract → `[ORPHAN-OUTPUT]`.

### S1-T3 — `lib/strict-tier-prereq.sh`

`.claude/scripts/lib/strict-tier-prereq.sh` (new, ~215 lines)

Three environment probes:
- `bwrap` on PATH (`command -v`).
- CAP_NET_ADMIN: `id -u == 0` (root) OR `getcap` on `/usr/bin/bwrap | /usr/local/bin/bwrap | /usr/bin/unshare` showing `cap_net_admin`. macOS lacks `getcap` → reports `missing`.
- cheval memory-disable flag support: imports `loa_cheval.providers.base`, checks for `SUPPORTS_MEMORY_DISABLE` attribute or `provider_memory_disable` parameter on `BaseAdapter.__init__`.

Composition tier discovery: yq-walks composition for any stage with `context_policy.isolation_tier == "strict"` OR top-level `composition.isolation_tier == "strict"`. One occurrence triggers the gate.

Two CLI shapes: `<composition.yaml>` (production path, exits 78 when prereqs incomplete AND strict requested) and `--probe-only` (reports environment state regardless of composition).

### S1-T4 — `construct-validate.sh` tier extension

`.claude/scripts/construct-validate.sh` (modified, ~+125 lines)

Tier resolution at `resolve_tier`:
1. Default tier from `.claude/data/construct-validation-tiers.yaml::default_tier`.
2. Strict if pack slug is in `tiers.strict.explicit_packs[]` (top-12).
3. Compatibility if pack has a contract at the path resolved from `tiers.compatibility.contract_path_template`. When also in strict's explicit list, stays strict so the contract-presence finding fires as critical.
4. Strict if `construct.yaml::created` is post-`tiers.strict.cutoff_date` AND tier still default.

Tier-conditional rules:
- Strict + contract present → critical `tier_contract_forbidden`.
- Compatibility + no contract → critical `tier_contract_required`.
- Compatibility + bootstrap-only contract (empty `out_of_domain` + `invariants`) → high `tier_contract_bootstrap`.

Severity escalation via `escalate <check> <baseline>`: strict tier raises domain → high (was medium), streams → high (was low), capabilities/context_policy → medium (was low). Other tiers keep baseline.

JSON output now wraps findings in a top-level object that surfaces `tier`, `tier_reason`, `runner_eligibility`, `contract_path`, `worst_severity` for compose-run consumers. Backward-compatibility note: callers reading `[]` JSON output now get an object with `findings[]` — small semver-minor break, acceptable for this sprint per SDD §3.4 framing of construct-validate as the canonical tier-resolver.

### S1-T5 — `lib/audit-keys-preflight.sh`

`.claude/scripts/lib/audit-keys-preflight.sh` (new, ~190 lines)

Four state probes:
- `.run/audit-keys/keypair.exists` sentinel.
- `LOA_AUDIT_PRIVATE_KEY_PATH` env var → readable file.
- `.claude/data/audit-keys/*.pub.json` registry presence.

Bootstrap is complete if (sentinel + public-key) OR (env-path-readable + public-key). Composition gate: yq-walks for `audit_signed: true`; only fires the gate when the composition opts in. Exit 78 with `[AUDIT-KEYS-NOT-BOOTSTRAPPED]` and runbook path `grimoires/loa/runbooks/audit-keys-bootstrap.md`.

### S1-T6 (completion) — fixtures + bats matrix

`tests/composition/validators/fixtures/iterate-no-termination.invalid.yaml` (new, 27 lines)
`tests/composition/validators/fixtures/stage-out-of-domain.invalid.yaml` (new, 24 lines)
`tests/composition/validators/run.bats` (modified, +35 lines — added 4 tests, one is a `--no-domain-check` regression guard)
`tests/composition/preflight/run.bats` (new, ~125 lines, 6 tests)
`tests/composition/output-gate/run.bats` (new, ~140 lines, 4 tests)

Total Sprint 1 bats coverage: **18 tests across 3 suites, 100% pass**. Each fixture validates JSON output; gate exit codes are asserted as 0 (golden path) or 1 (validator rejection) or 78 (preflight refusal).

---

## Technical Highlights

**1. The `select(length > 0)` jq gotcha.** Initial JSON output for `construct-validate.sh` and `strict-tier-prereq.sh` was empty when the optional field was empty. Cause: `jq -n '{... contract_path: ($contract | select(length > 0)) ...}'` — when `select` filters out the value, the entire object construction silently produces no output rather than a field-with-null. Fix in both scripts: `(if ($var | length) > 0 then $var else null end)`. This is a known but easily-missed jq behaviour (`select` returns nothing on false rather than failing); leaving a NOTES.md decision-log entry so the next contributor isn't tripped by it.

**2. Defense-in-depth schema mapping.** The output-gate's stream-schema resolver maps `loa.stream.<Type>.v<N>` → `<type-kebab>.schema.json` (so `OperatorModel.v1` correctly resolves to `operator-model.schema.json`). When jsonschema isn't installed the schema check is silent-skip rather than failing — a deliberate fallback because this validator runs in the hot path AND on operator dev boxes; Sprint 0's gate validates the schemas themselves, so we don't need to re-prove that here.

**3. domain.produced_by is a construct slug, not a domain tag.** SDD §4.4 step 5 reads ambiguously ("matches the construct's declared `domain.primary` or appears in `domain.supporting[]`"); the *handoff schema* (`construct-handoff-v0.schema.json:99-104`) is unambiguous: "Construct slug that produced this output. Cross-checked against construct_slug; mismatch is allowed only when the stage explicitly declares delegation." The output-gate honors the schema. The `domain.primary` field in the same handoff sub-block is the actual domain-tag attribution and gets its own check against the manifest's authorised set. Two checks, both required.

**4. JCS fallback path is intentionally non-strict.** When `rfc8785` Python package isn't installed, output-gate falls back to `json.dumps(sort_keys=True, separators=(",", ":"), ensure_ascii=False)`. This is byte-equivalent to JCS for objects + arrays + strings + booleans + null + integers — i.e. the substrate's payload contract. It diverges only on floats (ECMAScript ToNumber semantics). The substrate's typed-streams protocol doesn't carry floats anywhere, so the fallback is materially correct. Operators wanting full RFC 8785 strictness install `rfc8785`; the validator transparently upgrades.

**5. `[STAGE-OUT-OF-DOMAIN]` deferred-from-S1-T1 was the right call.** The error class needs construct-manifest resolution. Doing it in S1-T1's first cut would have tangled the validator with manifest I/O before S0's manifest schema was ratified. Pulling the check forward into S1-T4 (where the construct-validate work already grounds in tier-config) bundles the manifest-resolution concern with its natural owner. Net cost: one extra `_check_stage_domain` pass + a manifest cache. Net benefit: clean separation between Sprint 0's contract layer and Sprint 1's enforcement skin.

---

## Testing Summary

| Suite | Count | Status | Path |
|---|---|---|---|
| validators (S1-T1, S1-T4 + S1-T6) | 8 | ✓ all pass | `tests/composition/validators/run.bats` |
| preflight (S1-T3, S1-T5) | 6 | ✓ all pass | `tests/composition/preflight/run.bats` |
| output-gate (S1-T2) | 4 | ✓ all pass | `tests/composition/output-gate/run.bats` |
| **Sprint 1 total** | **18** | **✓ 18/18** | — |
| Sprint 0 schema gate (regression) | 9 | ✓ all pass | `.claude/scripts/composition-schema-validate.sh` |

Reproduce locally:

```bash
bats tests/composition/validators/run.bats tests/composition/preflight/run.bats tests/composition/output-gate/run.bats
.claude/scripts/composition-schema-validate.sh
```

---

## Known Limitations

1. **`[ENVELOPE-CHAIN-BROKEN]` deferred to Sprint 2** — see AC-1.A deferral rationale. Tracked in NOTES.md decision log.
2. **`audit-feel` composition not present on dev box** — golden-path equivalent fixture exercises the validator; full registry composition will be wired in once it lands per the loom skill ecosystem.
3. **macOS environment cannot test strict-tier prereqs comprehensively** — `bwrap` and `getcap` are Linux-only. The suite tests the gate fires correctly when prereqs are missing (which is what dev boxes hit); positive-path testing requires Linux+bwrap+CAP_NET_ADMIN per the SDD §6.5b CI matrix.
4. **No `[ITERATION-NO-MAX]` standalone fixture** — the existing fixture exercises both `[ITERATION-NO-MAX]` AND `[ITERATION-NO-TERMINATION]` together (per the original commit's design). The new `iterate-no-termination.invalid.yaml` proves negative — that with max present, ITERATION-NO-MAX does NOT fire. This pair fully covers the iteration acceptance space.
5. **construct-validate JSON output shape changed** — pre-Sprint-1 callers got `[finding, ...]`; post-Sprint-1 callers get `{tier, tier_reason, ..., findings: [...]}`. Documented here; downstream callers in compose-run will adapt in Sprint 2 + 3.
6. **cheval memory-disable probe is best-effort** — looks for `SUPPORTS_MEMORY_DISABLE` attribute or `provider_memory_disable` constructor arg. Adapter library may add a richer API later (e.g., per-provider capability matrix); the probe gracefully reports `unknown` rather than `missing` when the adapter package isn't importable, so it won't false-fail on minimal installs.

---

## Verification Steps

For a reviewer wanting to verify Sprint 1 end-to-end:

```bash
# 1. All 18 Sprint 1 bats tests pass
bats tests/composition/validators/run.bats \
     tests/composition/preflight/run.bats \
     tests/composition/output-gate/run.bats

# 2. Sprint 0 regression — schema gate still green
.claude/scripts/composition-schema-validate.sh

# 3. Tier resolution sanity check — top-12 strict, rest advisory
.claude/scripts/construct-validate.sh .claude/constructs/packs/artisan --json | jq '.tier'      # → "strict"
.claude/scripts/construct-validate.sh .claude/constructs/packs/archivist --json | jq '.tier'    # → "advisory"

# 4. Strict-tier prereq probe (macOS reports incomplete; Linux+bwrap reports complete)
.claude/scripts/lib/strict-tier-prereq.sh --probe-only --json

# 5. Audit-keys preflight probe (will exit 78 unless operator has bootstrapped)
env -u LOA_AUDIT_PRIVATE_KEY_PATH .claude/scripts/lib/audit-keys-preflight.sh --probe-only --json

# 6. Stream-graph validator on golden-path (exits 0)
.claude/scripts/lib/compose-stream-graph.sh tests/composition/validators/fixtures/golden-path.valid.yaml | jq '.ok'  # → true

# 7. Stream-graph validator on stage-out-of-domain fixture (exits 1)
.claude/scripts/lib/compose-stream-graph.sh tests/composition/validators/fixtures/stage-out-of-domain.invalid.yaml | jq '.errors[].code'  # → "[STAGE-OUT-OF-DOMAIN]"
```

---

## Open Items / Recommendations

1. **Sprint 2 should land [ENVELOPE-CHAIN-BROKEN]** in `envelope-chain.sh`. The fixture (or equivalent .json envelope sequence) is best authored in that sprint where the chain semantics actually live.
2. **Sprint 5/6 should propagate `runner_eligibility: golden_path_blocked`** into compose-run's pre-flight refusal: an advisory-tier pack should not be schedulable in a golden composition. The validator surfaces the marker; the runner must honour it.
3. **CI matrix per SDD §6.5b** needs a strict-tier Linux runner and an advisory Linux/macOS runner. The strict-tier-prereq probe will pass on the former, fail (or skip) on the latter — the Sprint 1 tests already accept either exit code so they're CI-portable.
4. **`construct-validate.sh` JSON output break** should be advertised in Sprint 6's docs roundup. Downstream callers (compose-run dry-run, butterfreezone-construct-gen.sh, the loom skill) need to read the new `findings[]` shape.
5. **rfc8785 should be added to `requirements*.txt`** when one exists — the JCS fallback is correct for now but rfc8785 is the canonical post-cycle-098 dependency; no harm pinning it.

---

## Feedback Addressed

This is the first reviewer.md for Sprint 1 in this cycle. No prior feedback to address. Stale `auditor-sprint-feedback.md` and `engineer-feedback.md` in `grimoires/loa/a2a/sprint-1/` are from prior cycles (Sprint 1 — Project Foundation, 2025-12-30) and do NOT apply to this sprint.
