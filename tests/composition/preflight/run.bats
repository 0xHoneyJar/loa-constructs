#!/usr/bin/env bats
# Sprint 1 (S1-T3 + S1-T5) — pre-execution prerequisite gates.
#
# Run via: bats tests/composition/preflight/run.bats
#
# Covers two gates that fire BEFORE any stage executes:
#   strict-tier-prereq.sh   bwrap + CAP_NET_ADMIN + cheval memory-disable
#   audit-keys-preflight.sh sentinel + env path + public registry
#
# Both exit 78 (EX_CONFIG) when prerequisites are missing — operator must
# downgrade tier OR upgrade environment OR bootstrap audit keys.

setup() {
  REPO_ROOT="$(cd "${BATS_TEST_DIRNAME:-tests/composition/preflight}/../../.." && pwd)"
  STRICT_PREREQ="$REPO_ROOT/.claude/scripts/lib/strict-tier-prereq.sh"
  AUDIT_PREFLIGHT="$REPO_ROOT/.claude/scripts/lib/audit-keys-preflight.sh"
  TMPDIR_FIX="$(mktemp -d)"
}

teardown() {
  rm -rf "$TMPDIR_FIX"
}

# --- strict-tier-prereq -------------------------------------------------------

@test "strict-tier-prereq: --probe-only emits JSON with checks block" {
  run "$STRICT_PREREQ" --probe-only --json
  # Exit 0 if env supports strict OR exit 78 if missing — both produce valid JSON.
  [ "$status" -eq 0 ] || [ "$status" -eq 78 ]
  echo "$output" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); assert 'checks' in d; assert 'bwrap' in d['checks']"
}

@test "strict-tier-prereq: composition without strict tier exits 0" {
  cat > "$TMPDIR_FIX/no-strict.yaml" <<EOF
schema_version: "1.2"
kind: workflow
name: no-strict
description: Composition that does not request strict tier.
intent: Ensure prereq gate is no-op when strict isn't requested.
chain:
  - stage: 1
    construct: artisan
    skill: decomposing-feel
    context_policy:
      isolation_tier: advisory
EOF
  run "$STRICT_PREREQ" "$TMPDIR_FIX/no-strict.yaml" --json
  [ "$status" -eq 0 ]
  [[ "$output" == *'"requested_strict": false'* ]]
}

@test "strict-tier-prereq: composition with strict stage requested triggers gate (78 on incomplete env)" {
  cat > "$TMPDIR_FIX/strict.yaml" <<EOF
schema_version: "1.2"
kind: workflow
name: strict-requested
description: Composition that requests strict tier on stage 1.
intent: Ensure prereq gate fires.
chain:
  - stage: 1
    construct: artisan
    skill: decomposing-feel
    context_policy:
      isolation_tier: strict
EOF
  run "$STRICT_PREREQ" "$TMPDIR_FIX/strict.yaml" --json
  # macOS dev box lacks bwrap + cap_net_admin; should exit 78.
  # On a strict-equipped Linux CI runner, exit could be 0 — both are acceptable.
  [ "$status" -eq 0 ] || [ "$status" -eq 78 ]
  [[ "$output" == *'"requested_strict": true'* ]]
}

# --- audit-keys-preflight -----------------------------------------------------

@test "audit-keys-preflight: --probe-only emits JSON with runbook reference" {
  run "$AUDIT_PREFLIGHT" --probe-only --json
  [ "$status" -eq 0 ] || [ "$status" -eq 78 ]
  echo "$output" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); assert d['runbook'].endswith('audit-keys-bootstrap.md')"
}

@test "audit-keys-preflight: composition without audit_signed exits 0" {
  cat > "$TMPDIR_FIX/no-signed.yaml" <<EOF
schema_version: "1.2"
kind: workflow
name: no-signed
description: Composition without audit_signed flag.
intent: Ensure preflight is a no-op when audit-grade signing isn't requested.
chain:
  - stage: 1
    construct: artisan
    skill: decomposing-feel
EOF
  run "$AUDIT_PREFLIGHT" "$TMPDIR_FIX/no-signed.yaml" --json
  [ "$status" -eq 0 ]
  [[ "$output" == *'"requested_audit_signed": false'* ]]
}

@test "audit-keys-preflight: composition with audit_signed: true triggers gate (78 when keys missing)" {
  cat > "$TMPDIR_FIX/signed.yaml" <<EOF
schema_version: "1.2"
kind: workflow
name: signed-requested
description: Composition opting into audit-grade signed envelopes.
intent: Ensure preflight fires.
audit_signed: true
chain:
  - stage: 1
    construct: artisan
    skill: decomposing-feel
EOF
  run env -u LOA_AUDIT_PRIVATE_KEY_PATH "$AUDIT_PREFLIGHT" "$TMPDIR_FIX/signed.yaml" --json
  # Without keys bootstrapped, MUST exit 78 with [AUDIT-KEYS-NOT-BOOTSTRAPPED].
  [ "$status" -eq 78 ]
  [[ "$output" == *'[AUDIT-KEYS-NOT-BOOTSTRAPPED]'* ]]
  [[ "$output" == *'"requested_audit_signed": true'* ]]
}
