# Envelope Schema Migration Guide

**Sprint 6, S6-T5** — v0 → future v1 migration path per FR-1.4.
Documents the `audit_emit_signed` opt-in steps.

---

## Overview

The bounded-context substrate ships with envelope schemas at version `v0`:
- `loa.construct.invocation.v0` — `.claude/schemas/runtime/construct-invocation-v0.schema.json`
- `loa.construct.handoff.v0` — `.claude/schemas/runtime/construct-handoff-v0.schema.json`

These schemas are **stable for the current cycle**. A future `v1` would be authored
in `loa-hounfour` (the protocol-level schema repository) once the substrate has
hardened through at least one full production cycle.

This runbook documents:
1. How to opt in to audit-grade signing (`audit_emit_signed`) on v0 envelopes
2. The migration path from v0 to v1 when v1 ships
3. What to do when `schema_version` validation fails

---

## Opting In to Audit-Grade Signing (v0)

The `audit_emit_signed` integration is an **opt-in** on top of v0 envelopes.
It does not change the envelope schema — it adds a parallel signed audit chain.

### Prerequisites

1. Bootstrap cycle-098 audit keys (if not already done):
   ```bash
   # See grimoires/loa/runbooks/audit-keys-bootstrap.md
   .claude/scripts/bootstrap-audit-keys.sh
   ```

2. Verify bootstrap:
   ```bash
   .claude/scripts/lib/audit-keys-preflight.sh
   # Exit 0 = keys ready; Exit 78 = [AUDIT-KEYS-NOT-BOOTSTRAPPED]
   ```

### Enable in Composition

```yaml
# compositions/my-composition.yaml
audit_signed: true   # ← add this field
```

### What Changes at Runtime

With `audit_signed: true`:
1. Pre-execution: stream-graph validator calls `audit-keys-preflight.sh`. Abort on
   exit 78 with `[AUDIT-KEYS-NOT-BOOTSTRAPPED]` before any stage executes.
2. Per-stage: each invocation and handoff envelope is also emitted via
   `audit_emit_signed` to `.run/compose/<run_id>/audit.jsonl`.
3. The signed chain uses Ed25519 signatures per the cycle-098 audit envelope
   spec (`agent-network-envelope.schema.json` v1.1.0).
4. Chain replay (`lib/envelope-chain.sh validate`) verifies Ed25519 signatures
   when signatures are present.

Default is `false`. The golden-path `compositions/audit-feel.yaml` sets
`audit_signed: false` — enable for sensitive composition runs.

---

## v0 to v1 Migration Path (Future)

When `loa.construct.invocation.v1` ships (expected: after one full hardening cycle):

### Step 1 — Identify Affected Compositions

```bash
# Find all compositions using v0 schema
grep -r 'schema_version.*"1\.0"\|"1\.1"' compositions/ --include="*.yaml" -l
```

Note: the envelope `schema_version` (`loa.construct.invocation.v0`) is distinct
from the composition file `schema_version` (`"1.0"`, `"1.1"`). The envelope
schema governs the JSON files at `.run/compose/<run_id>/envelopes/`.

### Step 2 — Run Dry-Run to Identify Breaking Changes

```bash
# For each composition, run dry-run against the v1 schema
compose-run.sh compositions/my-composition.yaml \
    --dry-run \
    --explain-context \
    --schema-version v1 \
    --json | jq '.errors'
```

### Step 3 — Migrate Composition YAML

v1 envelope schema changes are expected to be additive (new optional fields) plus
two breaking changes from v0:

| Field | v0 | v1 | Migration |
|---|---|---|---|
| `context_policy.isolation_tier` | optional | required | Add `isolation_tier: advisory` to existing stages |
| `output_contract.writes[].required` | optional | required | Add `required: true` to existing output declarations |
| `domain.primary` | optional | required on strict | Already enforced by strict-tier validator |

Run the composition's test suite after each change to verify.

### Step 4 — Archive v0 Envelopes (Optional)

Old `.run/compose/` directories with v0 envelopes remain valid for replay and
audit purposes. The chain validator reads the `schema_version` field and routes
to the correct validator. No action required.

If you want to clean up old runs:
```bash
# Envelopes older than 90 days (telemetry retention)
find .run/compose/ -name "*.invocation.json" -mtime +90 -delete
```

---

## Troubleshooting

### `[ENVELOPE-CHAIN-BROKEN]` on Startup

The chain validator detected a hash mismatch. This happens when:
1. An envelope file was modified after being written.
2. A disk error corrupted the file.
3. A manual edit was made to the envelope JSON.

**Diagnose**:
```bash
lib/envelope-chain.sh validate --chain-dir .run/compose/<run_id>/envelopes/
```

**Recover** (if the run is still valid but the chain is suspect):
```bash
# Re-validate from git history if envelopes are tracked (they are not by default)
git fsck --unreachable | grep blob | head -20
```

**Prevention**: never manually edit envelope JSON files. If you need to replay
a composition, use `compose-run.sh --replay <run_id>`.

### Schema Version Mismatch Warning

If you see:
```
WARN: envelope at stage-2.invocation.json declares schema_version loa.construct.invocation.v0
but current default is loa.construct.invocation.v1
```

This is informational — v0 envelopes continue to validate and replay. Set
`LOA_ENVELOPE_SCHEMA_VERSION=v0` in your environment if you want to suppress
the warning while migrating.

### `[AUDIT-KEYS-NOT-BOOTSTRAPPED]` exit 78

Composition has `audit_signed: true` but keys are not present. Resolution:
```bash
# See the full bootstrap runbook
cat grimoires/loa/runbooks/audit-keys-bootstrap.md
```

---

## See Also

- `grimoires/loa/runbooks/audit-keys-bootstrap.md` — key generation + rotation
- `grimoires/loa/runbooks/context-policy-guide.md` — context_policy field reference
- `.claude/schemas/runtime/` — live schema files
- SDD §2.2 (Q#7 envelope reuse vs sibling decision)
- SDD §3.1 (hash chain algorithm + worked example)
