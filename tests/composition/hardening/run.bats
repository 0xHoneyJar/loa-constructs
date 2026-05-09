#!/usr/bin/env bats
# Sprint 6 hardening (S6-H1..H4) — closes cycle's carry-forward findings.
#
# Run via: bats tests/composition/hardening/run.bats
#
# Covers:
#   S6-H1 lib/path-safety.py — slug regex + realpath containment (closes F1)
#   S6-H2 lib/jcs-fallback.py — shared canonicalizer (closes F3 + B-002)
#   S6-H3 output-gate _stream_schema_path — schema_id regex enforcement (closes F2)
#   S6-H4 envelope-builder tier-cap — composition-level caps stage-level (closes B-001)

setup() {
  REPO_ROOT="$(cd "${BATS_TEST_DIRNAME:-tests/composition/hardening}/../../.." && pwd -P)"
  PATH_SAFETY="$REPO_ROOT/.claude/scripts/lib/path-safety.py"
  JCS_FALLBACK="$REPO_ROOT/.claude/scripts/lib/jcs-fallback.py"
  STREAMGRAPH="$REPO_ROOT/.claude/scripts/lib/compose-stream-graph.sh"
  BUILDER="$REPO_ROOT/.claude/scripts/lib/envelope-builder.sh"
  OUTPUT_GATE="$REPO_ROOT/.claude/scripts/lib/output-gate.sh"
  TMPDIR_FIX="$(mktemp -d)"
  export TMPDIR_FIX
}

teardown() {
  [[ -d "$TMPDIR_FIX" ]] && find "$TMPDIR_FIX" -delete 2>/dev/null || true
}

# --- S6-H1: path-safety slug + realpath containment (closes F1) -------------

@test "path-safety: pack slug 'artisan' is valid" {
  run "$PATH_SAFETY" validate-slug --kind pack artisan
  [ "$status" -eq 0 ]
}

@test "path-safety: pack slug '../etc/passwd' is rejected" {
  run "$PATH_SAFETY" validate-slug --kind pack '../etc/passwd'
  [ "$status" -eq 1 ]
}

@test "path-safety: pack slug containing '..' anywhere is rejected" {
  run "$PATH_SAFETY" validate-slug --kind pack 'pack..name'
  [ "$status" -eq 1 ]
}

@test "path-safety: schema-id 'loa.stream.Verdict.v1' is valid" {
  run "$PATH_SAFETY" validate-slug --kind schema-id 'loa.stream.Verdict.v1'
  [ "$status" -eq 0 ]
}

@test "path-safety: schema-id 'loa.stream./etc/passwd.v1' is rejected (closes F2)" {
  run "$PATH_SAFETY" validate-slug --kind schema-id 'loa.stream./etc/passwd.v1'
  [ "$status" -eq 1 ]
}

@test "path-safety: composition-id with sha256 suffix is valid" {
  run "$PATH_SAFETY" validate-slug --kind composition-id 'audit-feel.yaml@sha256:abc123def456'
  [ "$status" -eq 0 ]
}

@test "path-safety: composition-id without sha256 suffix is rejected" {
  run "$PATH_SAFETY" validate-slug --kind composition-id 'no-sha256-suffix'
  [ "$status" -eq 1 ]
}

@test "path-safety: resolve-pack-path returns absolute when valid" {
  mkdir -p "$TMPDIR_FIX/packs/artisan"
  echo "schema_version: 1" > "$TMPDIR_FIX/packs/artisan/construct.yaml"
  run "$PATH_SAFETY" resolve-pack-path --packs-dir "$TMPDIR_FIX/packs" --slug artisan
  [ "$status" -eq 0 ]
  [[ "$output" == */packs/artisan/construct.yaml ]]
}

@test "path-safety: resolve-pack-path rejects '../etc/' traversal" {
  mkdir -p "$TMPDIR_FIX/packs"
  run "$PATH_SAFETY" resolve-pack-path --packs-dir "$TMPDIR_FIX/packs" --slug '../etc'
  [ "$status" -eq 1 ]
}

# --- S6-H2: jcs-fallback shared canonicalizer (closes F3 + B-002) -----------

@test "jcs-fallback: canonicalizes object with sorted keys + minimal separators" {
  run bash -c "echo '{\"b\":2,\"a\":1}' | $JCS_FALLBACK canonicalize"
  [ "$status" -eq 0 ]
  [ "$output" = '{"a":1,"b":2}' ]
}

@test "jcs-fallback: sha256 produces deterministic digest" {
  run bash -c "echo '{\"a\":1,\"b\":2}' | $JCS_FALLBACK sha256"
  [ "$status" -eq 0 ]
  hash1="$output"
  run bash -c "echo '{\"b\":2,\"a\":1}' | $JCS_FALLBACK sha256"
  hash2="$output"
  # Different key order → SAME canonical bytes → SAME hash (the whole point of JCS).
  [ "$hash1" = "$hash2" ]
}

@test "jcs-fallback: --audit-signed fails closed when rfc8785 missing" {
  # rfc8785 NOT installed in this env (verified at cycle level).
  run bash -c "echo '{\"a\":1}' | $JCS_FALLBACK sha256 --audit-signed"
  [ "$status" -eq 1 ]
  [[ "$output" == *"rfc8785 package required"* ]]
}

# --- S6-H3: schema_id regex enforcement at output-gate (closes F2) ---------

@test "output-gate: schema_id with absolute-path Type rejected via path-safety" {
  # Build minimal invocation + handoff with a malicious schema_id; the gate
  # MUST refuse before reading any file, returning a CONTRACT-VIOLATION.
  cat > "$TMPDIR_FIX/manifest.yaml" <<'YML'
schema_version: 1
slug: artisan
domain:
  primary: design
YML
  cat > "$TMPDIR_FIX/inv.json" <<JSON
{
  "construct_slug": "artisan",
  "output_contract": {
    "writes": [{
      "type": "Verdict",
      "schema_id": "loa.stream./etc/passwd.v1",
      "destination": "$TMPDIR_FIX/output.json",
      "required": true
    }]
  }
}
JSON
  echo '{"verdict":"x"}' > "$TMPDIR_FIX/output.json"
  cat > "$TMPDIR_FIX/handoff.json" <<JSON
{
  "status": "success",
  "construct_slug": "artisan",
  "outputs": [{
    "type": "Verdict",
    "uri": "$TMPDIR_FIX/output.json",
    "schema_id": "loa.stream./etc/passwd.v1",
    "hash": "sha256:00",
    "domain": {"primary": "design", "produced_by": "artisan"}
  }]
}
JSON
  run "$OUTPUT_GATE" \
    --invocation "$TMPDIR_FIX/inv.json" \
    --handoff "$TMPDIR_FIX/handoff.json" \
    --manifest "$TMPDIR_FIX/manifest.yaml"
  # Gate refuses on schema_id resolution; exit 1 with [OUTPUT-CONTRACT-VIOLATION].
  [ "$status" -eq 1 ]
  [[ "$output" == *"unrecognized or unsafe schema_id"* ]] || \
    [[ "$output" == *"unsafe"* ]] || \
    [[ "$output" == *"loa.stream./etc/passwd.v1"* ]]
}

# --- S6-H4: envelope-builder tier-cap (closes B-001) -------------------------

@test "tier-cap: stage-level advisory + composition-level strict → invocation reports strict" {
  # Build a composition with composition-level strict, stage-level advisory.
  cat > "$TMPDIR_FIX/composition.yaml" <<'YML'
schema_version: "1.2"
kind: workflow
name: tier-cap-test
description: composition strict, stage advisory — runner must see strict
intent: verify tier-cap fix
isolation_tier: strict
chain:
  - stage: 1
    construct: artisan
    skill: decomposing-feel
    context_policy:
      isolation_tier: advisory
YML

  run "$BUILDER" invocation \
    --composition "$TMPDIR_FIX/composition.yaml" \
    --stage 1 --run-id "tier-test" --quiet \
    --out "$TMPDIR_FIX/inv.json"
  [ "$status" -eq 0 ]
  # The capped tier MUST be strict (the more-restrictive of the two).
  capped=$(jq -r '.context_policy.isolation_tier' "$TMPDIR_FIX/inv.json")
  [ "$capped" = "strict" ]
}

@test "tier-cap: stage-level strict, composition-level advisory → strict (stage's request honored)" {
  cat > "$TMPDIR_FIX/composition.yaml" <<'YML'
schema_version: "1.2"
kind: workflow
name: stage-tier-test
description: stage requests strict, composition is advisory
intent: stage tier should win when more restrictive
isolation_tier: advisory
chain:
  - stage: 1
    construct: artisan
    skill: decomposing-feel
    context_policy:
      isolation_tier: strict
YML
  run "$BUILDER" invocation \
    --composition "$TMPDIR_FIX/composition.yaml" \
    --stage 1 --run-id "stage-tier" --quiet \
    --out "$TMPDIR_FIX/inv.json"
  [ "$status" -eq 0 ]
  capped=$(jq -r '.context_policy.isolation_tier' "$TMPDIR_FIX/inv.json")
  [ "$capped" = "strict" ]
}

@test "tier-cap: both advisory → advisory" {
  cat > "$TMPDIR_FIX/composition.yaml" <<'YML'
schema_version: "1.2"
kind: workflow
name: both-advisory
description: both advisory
intent: confirm advisory pass-through
isolation_tier: advisory
chain:
  - stage: 1
    construct: artisan
    skill: decomposing-feel
    context_policy:
      isolation_tier: advisory
YML
  run "$BUILDER" invocation \
    --composition "$TMPDIR_FIX/composition.yaml" \
    --stage 1 --run-id "both-adv" --quiet \
    --out "$TMPDIR_FIX/inv.json"
  [ "$status" -eq 0 ]
  capped=$(jq -r '.context_policy.isolation_tier' "$TMPDIR_FIX/inv.json")
  [ "$capped" = "advisory" ]
}
