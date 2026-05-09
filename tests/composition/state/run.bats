#!/usr/bin/env bats
# Sprint 5 (S5-T1 + S5-T2 + S5-T3 + S5-T4) — persistent state + GC race coordination.
#
# Run via: bats tests/composition/state/run.bats
#
# Covers:
#   S5-T1 persistent-state.sh — init, set, get, extend (composite key + flock + atomic-rename)
#   S5-T2 TTL policies (write vs access) + state-poisoning safeguard ([STATE-OWNERSHIP-VIOLATION])
#   S5-T3 compose-state-gc.sh — race-coordinated GC (TTL + mtime grace + flock)
#   S5-T4 GC-vs-running-composition sentinel (state survives concurrent GC)

setup() {
  REPO_ROOT="$(cd "${BATS_TEST_DIRNAME:-tests/composition/state}/../../.." && pwd -P)"
  PSTATE="$REPO_ROOT/.claude/scripts/lib/persistent-state.sh"
  GC="$REPO_ROOT/.claude/scripts/lib/compose-state-gc.sh"
  TMPDIR_FIX="$(mktemp -d)"
  export LOA_PERSISTENT_STATE_ROOT="$TMPDIR_FIX/persistent"
  KEY=(
    --project-id testproj
    --composition-id 'demo@sha256:demo123'
    --construct-slug artisan
    --skill-slug decomposing-feel
    --stage-id demo.stage-1
    --schema-version v1
  )
}

teardown() {
  [[ -d "$TMPDIR_FIX" ]] && find "$TMPDIR_FIX" -delete 2>/dev/null || true
}

# --- init / get round-trip (S5-T1) -------------------------------------------

@test "init creates a state file at the canonical composite-key path" {
  run "$PSTATE" init "${KEY[@]}" --payload-json '{"foo":"bar"}'
  [ "$status" -eq 0 ]
  [[ "$output" == *"/persistent/testproj/demo@sha256:demo123/artisan/decomposing-feel/demo.stage-1/v1/state.json" ]]
  [ -f "$output" ]
}

@test "init refuses to overwrite existing state (use 'set' instead)" {
  "$PSTATE" init "${KEY[@]}" --payload-json '{}' >/dev/null
  run "$PSTATE" init "${KEY[@]}" --payload-json '{"x":1}'
  [ "$status" -eq 1 ]
  [[ "$output" == *"already exists"* ]]
}

@test "get returns the initialized payload + audit trail starts with init" {
  "$PSTATE" init "${KEY[@]}" --payload-json '{"foo":"bar"}' >/dev/null
  run "$PSTATE" get "${KEY[@]}"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.payload.foo == "bar"' >/dev/null
  echo "$output" | jq -e '.audit_trail[0].op == "init"' >/dev/null
}

@test "set merges payload + appends 'write' to audit trail" {
  "$PSTATE" init "${KEY[@]}" --payload-json '{"a":1}' >/dev/null
  "$PSTATE" set "${KEY[@]}" --payload-json '{"b":2}' >/dev/null
  run "$PSTATE" get "${KEY[@]}"
  echo "$output" | jq -e '.payload.a == 1' >/dev/null
  echo "$output" | jq -e '.payload.b == 2' >/dev/null
  echo "$output" | jq -e '[.audit_trail[].op] == ["init", "write"]' >/dev/null
}

# --- ownership boundary (S5-T2 / closes Flatline HIGH on state poisoning) ----

@test "extend by foreign construct → [STATE-OWNERSHIP-VIOLATION]" {
  "$PSTATE" init "${KEY[@]}" --payload-json '{}' >/dev/null
  run "$PSTATE" extend "${KEY[@]}" --calling-construct observer --calling-skill observing-users
  [ "$status" -eq 1 ]
  [[ "$output" == *"[STATE-OWNERSHIP-VIOLATION]"* ]]
}

@test "extend by owning construct succeeds + audit trail records 'extend'" {
  "$PSTATE" init "${KEY[@]}" --payload-json '{}' >/dev/null
  run "$PSTATE" extend "${KEY[@]}" --calling-construct artisan --calling-skill decomposing-feel
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '[.audit_trail[].op] == ["init", "extend"]' >/dev/null
}

# --- TTL policy (S5-T2) ------------------------------------------------------

@test "write policy: get does NOT extend ttl_expires" {
  "$PSTATE" init "${KEY[@]}" --ttl-seconds 60 --ttl-policy write --payload-json '{}' >/dev/null
  initial_expires=$("$PSTATE" get "${KEY[@]}" | jq -r '.ttl_expires')
  sleep 1
  later_expires=$("$PSTATE" get "${KEY[@]}" | jq -r '.ttl_expires')
  [ "$initial_expires" = "$later_expires" ]
}

@test "access policy: get DOES extend ttl_expires" {
  "$PSTATE" init "${KEY[@]}" --ttl-seconds 60 --ttl-policy access --payload-json '{}' >/dev/null
  initial_expires=$("$PSTATE" get "${KEY[@]}" | jq -r '.ttl_expires')
  sleep 2
  later_expires=$("$PSTATE" get "${KEY[@]}" | jq -r '.ttl_expires')
  # access policy resets the expiry on every read
  [ "$initial_expires" != "$later_expires" ]
}

# --- composite-key isolation (Sprint 5 acceptance) ---------------------------

@test "two compositions invoking same skill at different stages have independent state" {
  KEY2=(
    --project-id testproj
    --composition-id 'demo@sha256:demo123'
    --construct-slug artisan
    --skill-slug decomposing-feel
    --stage-id demo.stage-2     # different stage → different path
    --schema-version v1
  )
  "$PSTATE" init "${KEY[@]}" --payload-json '{"stage":"first"}' >/dev/null
  "$PSTATE" init "${KEY2[@]}" --payload-json '{"stage":"second"}' >/dev/null
  state1=$("$PSTATE" get "${KEY[@]}")
  state2=$("$PSTATE" get "${KEY2[@]}")
  echo "$state1" | jq -e '.payload.stage == "first"' >/dev/null
  echo "$state2" | jq -e '.payload.stage == "second"' >/dev/null
}

# --- GC race coordination (S5-T3) --------------------------------------------

@test "GC reaps expired state files past TTL with mtime-grace cleared" {
  "$PSTATE" init "${KEY[@]}" --ttl-seconds 60 --payload-json '{}' >/dev/null
  state_path=$("$PSTATE" path "${KEY[@]}")
  [ -f "$state_path" ]
  # Push effective time past TTL via skew, and bypass mtime grace.
  run "$GC" --json --ttl-clock-skew-seconds 120 --mtime-grace-hours 0
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.summary.total_deleted == 1' >/dev/null
  [ ! -f "$state_path" ]
}

@test "GC respects mtime grace window — refuses to delete recently-written state" {
  "$PSTATE" init "${KEY[@]}" --ttl-seconds 60 --payload-json '{}' >/dev/null
  state_path=$("$PSTATE" path "${KEY[@]}")
  # Default mtime-grace is 4 hours; the state was just written, so mtime grace fires.
  run "$GC" --json --ttl-clock-skew-seconds 120
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.summary.total_skipped_mtime == 1' >/dev/null
  [ -f "$state_path" ]
}

@test "GC skips non-expired state (skipped_alive)" {
  "$PSTATE" init "${KEY[@]}" --ttl-seconds 999999 --payload-json '{}' >/dev/null
  run "$GC" --json
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.summary.total_skipped_alive == 1' >/dev/null
  echo "$output" | jq -e '.summary.total_deleted == 0' >/dev/null
}

# --- S5-T4 sentinel: GC-vs-running-composition ------------------------------

@test "SENTINEL: state survives concurrent GC — composition writes during GC sweep" {
  # Create an expired state — the GC WOULD delete it under normal conditions.
  "$PSTATE" init "${KEY[@]}" --ttl-seconds 60 --payload-json '{}' >/dev/null
  state_path=$("$PSTATE" path "${KEY[@]}")
  lock_path="${state_path}.lock"

  # Hold the lock manually (simulating a running composition mid-write).
  # The GC's flock -n -x will fail to acquire → state survives.
  if command -v flock >/dev/null 2>&1; then
    # Hold the lock in a background subshell for 2s. During that time, run GC.
    (
      exec 9>"$lock_path"
      flock -x 9
      sleep 2
    ) &
    held_pid=$!
    sleep 0.3   # let the background lock-holder grab the lock first
    run "$GC" --json --ttl-clock-skew-seconds 120 --mtime-grace-hours 0
    [ "$status" -eq 0 ]
    # State must survive — the GC saw the lock held and skipped.
    echo "$output" | jq -e '.summary.total_skipped_locked >= 1' >/dev/null
    [ -f "$state_path" ]
    wait "$held_pid"
  else
    # mkdir-fallback path: create the lock dir, run GC, verify skip.
    mkdir "${lock_path}.dir"
    run "$GC" --json --ttl-clock-skew-seconds 120 --mtime-grace-hours 0
    [ "$status" -eq 0 ]
    echo "$output" | jq -e '.summary.total_skipped_locked >= 1' >/dev/null
    [ -f "$state_path" ]
    rmdir "${lock_path}.dir"
  fi
}
