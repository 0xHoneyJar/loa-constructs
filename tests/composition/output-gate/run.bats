#!/usr/bin/env bats
# Sprint 1 (S1-T2) — post-execution output-gate validator.
#
# Run via: bats tests/composition/output-gate/run.bats
#
# Exercises the contract per SDD §4.4:
#   1. file-exists
#   2. JSON-parses
#   3. schema-validates (best-effort when jsonschema is installed)
#   4. handoff hash matches JCS-recompute of file content
#   5. domain.produced_by matches manifest domain
#
# We synthesise tiny invocation/handoff envelope JSON files + a fake manifest
# + a Verdict payload, then assert the gate's verdict on each fixture variant.
# The gate doesn't touch the network or the runtime; it's a pure function.

setup() {
  REPO_ROOT="$(cd "${BATS_TEST_DIRNAME:-tests/composition/output-gate}/../../.." && pwd)"
  GATE="$REPO_ROOT/.claude/scripts/lib/output-gate.sh"
  TMPDIR_FIX="$(mktemp -d)"

  # Build a fake construct manifest declaring domain.primary=design (legacy
  # array form is also accepted by the gate; we use object form for canonical
  # post-Sprint-0 behaviour).
  cat > "$TMPDIR_FIX/manifest.yaml" <<'YML'
schema_version: 1
slug: artisan
name: Artisan
version: 1.0.0
description: test fixture
domain:
  primary: design
  supporting: [accessibility]
YML

  # Verdict payload — minimum fields per .claude/schemas/verdict.schema.json
  # (stream_type, schema_version, timestamp, source, verdict).
  cat > "$TMPDIR_FIX/verdict.json" <<'JSON'
{
  "stream_type": "Verdict",
  "schema_version": "1.0.0",
  "timestamp": "2026-05-08T22:00:00Z",
  "source": "output-gate-fixture",
  "verdict": "fixture says yes"
}
JSON

  # Compute the JCS-canonical sha256 of the verdict for the handoff hash.
  export TMPDIR_FIX
  HASH_VAL=$(TMPDIR_FIX="$TMPDIR_FIX" python3 -c '
import hashlib, json, os
from pathlib import Path
data = json.loads(Path(os.environ["TMPDIR_FIX"], "verdict.json").read_text())
canonical = json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
print("sha256:" + hashlib.sha256(canonical).hexdigest())
')
  export HASH_VAL

  # Invocation envelope with a single declared write.
  cat > "$TMPDIR_FIX/invocation.json" <<JSON
{
  "construct_slug": "artisan",
  "output_contract": {
    "writes": [
      {
        "type": "Verdict",
        "schema_id": "loa.stream.Verdict.v1",
        "destination": "$TMPDIR_FIX/verdict.json",
        "required": true
      }
    ]
  }
}
JSON

  # Handoff envelope with matching output entry + correct hash + correct domain.
  cat > "$TMPDIR_FIX/handoff.json" <<JSON
{
  "status": "success",
  "construct_slug": "artisan",
  "outputs": [
    {
      "type": "Verdict",
      "schema_id": "loa.stream.Verdict.v1",
      "uri": "$TMPDIR_FIX/verdict.json",
      "hash": "$HASH_VAL",
      "domain": {"primary": "design", "produced_by": "artisan"}
    }
  ]
}
JSON
}

teardown() {
  rm -rf "$TMPDIR_FIX"
}

@test "output-gate: golden path — all checks pass (exit 0)" {
  run "$GATE" \
    --invocation "$TMPDIR_FIX/invocation.json" \
    --handoff "$TMPDIR_FIX/handoff.json" \
    --manifest "$TMPDIR_FIX/manifest.yaml"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"ok": true'* ]]
}

@test "output-gate: missing required output → [OUTPUT-MISSING]" {
  rm -f "$TMPDIR_FIX/verdict.json"
  run "$GATE" \
    --invocation "$TMPDIR_FIX/invocation.json" \
    --handoff "$TMPDIR_FIX/handoff.json" \
    --manifest "$TMPDIR_FIX/manifest.yaml"
  [ "$status" -eq 1 ]
  [[ "$output" == *'[OUTPUT-MISSING]'* ]]
}

@test "output-gate: hash mismatch → [OUTPUT-CONTRACT-VIOLATION]" {
  # Tamper with the file AFTER hash was computed (preserve schema-required fields).
  cat > "$TMPDIR_FIX/verdict.json" <<'JSON'
{
  "stream_type": "Verdict",
  "schema_version": "1.0.0",
  "timestamp": "2026-05-08T22:00:00Z",
  "source": "output-gate-fixture",
  "verdict": "fixture says NO — content tampered"
}
JSON
  run "$GATE" \
    --invocation "$TMPDIR_FIX/invocation.json" \
    --handoff "$TMPDIR_FIX/handoff.json" \
    --manifest "$TMPDIR_FIX/manifest.yaml"
  [ "$status" -eq 1 ]
  [[ "$output" == *'[OUTPUT-CONTRACT-VIOLATION]'* ]]
  [[ "$output" == *'hash_mismatch'* ]]
}

@test "output-gate: orphan handoff output → [ORPHAN-OUTPUT]" {
  # Add an extra output to handoff that isn't declared in the contract.
  python3 - <<PY
import json
from pathlib import Path
import os
p = Path(os.environ["TMPDIR_FIX"]) / "handoff.json"
d = json.loads(p.read_text())
d["outputs"].append({
  "type": "Signal",
  "schema_id": "loa.stream.Signal.v1",
  "uri": os.environ["TMPDIR_FIX"] + "/orphan.json",
  "hash": "sha256:" + ("0" * 64),
  "domain": {"primary": "design", "produced_by": "artisan"}
})
p.write_text(json.dumps(d))
PY
  run "$GATE" \
    --invocation "$TMPDIR_FIX/invocation.json" \
    --handoff "$TMPDIR_FIX/handoff.json" \
    --manifest "$TMPDIR_FIX/manifest.yaml"
  [ "$status" -eq 1 ]
  [[ "$output" == *'[ORPHAN-OUTPUT]'* ]]
}
