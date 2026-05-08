#!/usr/bin/env bats
# Sprint 3 (S3-T1..T8) — advisory-tier stage runner bats matrix.
#
# Run via: bats tests/composition/runner/run.bats
#
# Covers:
#   S3-T1 argv-array invocation (no bash -c with interpolation)
#   S3-T2 env scrub via env -i + allowed_env_vars allowlist
#   S3-T7 path canonicalization via realpath/python3 fallback
#   S3-T8 post-exec output-gate integration
#   tier refusal: strict-tier compositions are rejected by the advisory runner
#
# Mode: LOA_STAGE_MOCK=1 — runner emits a deterministic fixture row
# (substrate-shape only; no LLM call). Live cheval execution is Sprint 3+ work.

setup() {
  REPO_ROOT="$(cd "${BATS_TEST_DIRNAME:-tests/composition/runner}/../../.." && pwd -P)"
  RUNNER="$REPO_ROOT/.claude/scripts/lib/stage-runner-advisory.sh"
  BUILDER="$REPO_ROOT/.claude/scripts/lib/envelope-builder.sh"
  GOLDEN_PATH="$REPO_ROOT/tests/composition/validators/fixtures/golden-path.valid.yaml"
  TMPDIR_FIX="$(mktemp -d)"
  export TMPDIR_FIX REPO_ROOT

  # A test manifest with a domain block that matches the golden path's stage-1 needs.
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

  # Build invocation envelope with output destination + allowlist inside the
  # repo (so the runner's PROJECT_ROOT containment check passes).
  "$BUILDER" invocation \
    --composition "$GOLDEN_PATH" \
    --stage 1 \
    --run-id "test_run" \
    --quiet \
    --out "$TMPDIR_FIX/inv.json"

  # Override allowed_write_paths + destination + domain to point inside fixture dir.
  jq --arg dir "$TMPDIR_FIX" '
    .context_policy.allowed_write_paths = [($dir + "/output/**")] |
    .output_contract.writes[0].destination = ($dir + "/output/signal.json") |
    .domain.primary = "design"
  ' "$TMPDIR_FIX/inv.json" > "$TMPDIR_FIX/inv2.json"

  # Re-finalize hash since we mutated the envelope.
  python3 -c "
import json, hashlib
e = json.load(open('$TMPDIR_FIX/inv2.json'))
e.pop('invocation_hash', None)
canonical = json.dumps(e, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
e['invocation_hash'] = 'sha256:' + hashlib.sha256(canonical).hexdigest()
json.dump(e, open('$TMPDIR_FIX/inv-final.json', 'w'), indent=2)
"
}

teardown() {
  [[ -d "$TMPDIR_FIX" ]] && find "$TMPDIR_FIX" -delete 2>/dev/null || true
  # Don't touch shared .run/compose; tests use the standard runner output dir
  # whose contents are run-id-scoped.
}

# --- argv-array + tier refusal -----------------------------------------------

@test "advisory runner refuses strict-tier composition (exit 78)" {
  jq '.context_policy.isolation_tier = "strict"' "$TMPDIR_FIX/inv-final.json" > "$TMPDIR_FIX/inv-strict.json"
  python3 -c "
import json, hashlib
e = json.load(open('$TMPDIR_FIX/inv-strict.json'))
e.pop('invocation_hash', None)
canonical = json.dumps(e, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
e['invocation_hash'] = 'sha256:' + hashlib.sha256(canonical).hexdigest()
json.dump(e, open('$TMPDIR_FIX/inv-strict.json', 'w'), indent=2)
"
  run "$RUNNER" \
    --invocation "$TMPDIR_FIX/inv-strict.json" \
    --manifest "$TMPDIR_FIX/manifest.yaml"
  [ "$status" -eq 78 ]
  [[ "$output" == *"strict"* ]]
}

@test "advisory runner accepts advisory-tier composition (exit 0 in mock mode)" {
  LOA_STAGE_MOCK=1 run "$RUNNER" \
    --invocation "$TMPDIR_FIX/inv-final.json" \
    --manifest "$TMPDIR_FIX/manifest.yaml"
  [ "$status" -eq 0 ]
  [[ "$output" == *"status=success"* ]]
}

# --- handoff envelope construction (S3-T1 + S3-T8) ---------------------------

@test "advisory runner produces handoff envelope on success" {
  LOA_STAGE_MOCK=1 "$RUNNER" \
    --invocation "$TMPDIR_FIX/inv-final.json" \
    --manifest "$TMPDIR_FIX/manifest.yaml" \
    --quiet
  run_id=$(jq -r '.run_id' "$TMPDIR_FIX/inv-final.json")
  stage_id=$(jq -r '.stage_id' "$TMPDIR_FIX/inv-final.json")
  handoff="$REPO_ROOT/.run/compose/$run_id/envelopes/${stage_id}.handoff.json"
  [ -f "$handoff" ]
  jq -e '.status == "success"' "$handoff" >/dev/null
  jq -e '.outputs | length > 0' "$handoff" >/dev/null
  jq -e '.handoff_hash | startswith("sha256:")' "$handoff" >/dev/null
}

@test "advisory runner output passes post-exec output-gate" {
  LOA_STAGE_MOCK=1 "$RUNNER" \
    --invocation "$TMPDIR_FIX/inv-final.json" \
    --manifest "$TMPDIR_FIX/manifest.yaml" \
    --quiet
  # Output gate already runs inside the runner; if it failed, runner exits 1.
  # Re-run it externally to verify the resulting handoff stands on its own.
  run_id=$(jq -r '.run_id' "$TMPDIR_FIX/inv-final.json")
  stage_id=$(jq -r '.stage_id' "$TMPDIR_FIX/inv-final.json")
  handoff="$REPO_ROOT/.run/compose/$run_id/envelopes/${stage_id}.handoff.json"
  run "$REPO_ROOT/.claude/scripts/lib/output-gate.sh" \
    --invocation "$TMPDIR_FIX/inv-final.json" \
    --handoff "$handoff" \
    --manifest "$TMPDIR_FIX/manifest.yaml"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"ok": true'* ]]
}

# --- env scrub (S3-T2) -------------------------------------------------------

@test "env scrub: subprocess sees only allowed env vars" {
  # Add a custom allowed_env_vars list with one allowed (PATH) + skip the rest.
  jq '.context_policy.allowed_env_vars = ["PATH"]' "$TMPDIR_FIX/inv-final.json" > "$TMPDIR_FIX/inv-env.json"
  python3 -c "
import json, hashlib
e = json.load(open('$TMPDIR_FIX/inv-env.json'))
e.pop('invocation_hash', None)
canonical = json.dumps(e, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
e['invocation_hash'] = 'sha256:' + hashlib.sha256(canonical).hexdigest()
json.dump(e, open('$TMPDIR_FIX/inv-env.json', 'w'), indent=2)
"

  # Use a real skill cmd that prints `env` so we can assert on the env-scrub.
  cat > "$TMPDIR_FIX/print-env.sh" <<'EOF'
#!/usr/bin/env bash
env > "$1"
echo "done"
EOF
  chmod +x "$TMPDIR_FIX/print-env.sh"

  # Set a sentinel env var the runner should scrub.
  export LOA_TEST_SECRET="scrub-me"

  # Run with --skill-cmd that captures env.
  # Note: under env -i, only PATH (from the allowlist) should appear.
  run "$RUNNER" \
    --invocation "$TMPDIR_FIX/inv-env.json" \
    --manifest "$TMPDIR_FIX/manifest.yaml" \
    --quiet \
    --skill-cmd "$TMPDIR_FIX/print-env.sh" "$TMPDIR_FIX/captured-env.txt"

  # The runner exits 1 because the skill didn't produce the output_contract's
  # declared write — that's expected for this test (we're verifying the env,
  # not the output). The captured-env.txt MUST exist with PATH only.
  [ -f "$TMPDIR_FIX/captured-env.txt" ]
  ! grep -q "LOA_TEST_SECRET" "$TMPDIR_FIX/captured-env.txt"
  grep -q "^PATH=" "$TMPDIR_FIX/captured-env.txt"

  unset LOA_TEST_SECRET
}

# --- malformed env-var name in allowlist -------------------------------------

@test "env scrub: malformed allowed_env_vars entry rejected (exit 1)" {
  jq '.context_policy.allowed_env_vars = ["valid_lower"]' "$TMPDIR_FIX/inv-final.json" > "$TMPDIR_FIX/inv-bad-env.json"
  python3 -c "
import json, hashlib
e = json.load(open('$TMPDIR_FIX/inv-bad-env.json'))
e.pop('invocation_hash', None)
canonical = json.dumps(e, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
e['invocation_hash'] = 'sha256:' + hashlib.sha256(canonical).hexdigest()
json.dump(e, open('$TMPDIR_FIX/inv-bad-env.json', 'w'), indent=2)
"
  LOA_STAGE_MOCK=1 run "$RUNNER" \
    --invocation "$TMPDIR_FIX/inv-bad-env.json" \
    --manifest "$TMPDIR_FIX/manifest.yaml"
  [ "$status" -eq 1 ]
  [[ "$output" == *"malformed allowed_env_vars"* ]]
}

# --- argv-array safety (S3-T1) -----------------------------------------------

@test "argv-array invocation: skill cmd with shell metas is NOT eval'd" {
  # Skill name with shell metas — if the runner used bash -c, this would
  # explode. With argv-array, it's an opaque token (probably a missing-cmd
  # error, but no shell injection).
  evil_cmd='$(echo PWNED; touch /tmp/pwned-$$)'
  pwn_marker="/tmp/pwned-$$"

  # Use --skill-cmd with the evil string as argv[0]. Runner should fail to
  # find it (command -v returns nothing → resolved_cmd_path stays as-is →
  # env -i invokes the literal token → fails non-zero).
  run "$RUNNER" \
    --invocation "$TMPDIR_FIX/inv-final.json" \
    --manifest "$TMPDIR_FIX/manifest.yaml" \
    --quiet \
    --skill-cmd "$evil_cmd"
  # Whatever exit (0 or 1), the marker MUST NOT exist — proves no shell eval.
  [ ! -f "$pwn_marker" ]
}
