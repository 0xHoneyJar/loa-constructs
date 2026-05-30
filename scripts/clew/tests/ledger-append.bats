#!/usr/bin/env bats
# Task 1.4 — ledger_append unit tests: append, perms, concurrency, exit codes.

load helper
setup()    { clew_setup; }
teardown() { clew_teardown; }

@test "valid append exits 0 and creates 0600 file in 0700 dir" {
  run bash "$LEDGER_APPEND" smol-comms-register "$(seed_line)"
  [ "$status" -eq 0 ]
  local f; f="$(ledger_file smol-comms-register)"
  [ -f "$f" ]
  # macOS `stat -f %Lp`, GNU `stat -c %a`
  local fmode dmode
  fmode="$(stat -f '%Lp' "$f" 2>/dev/null || stat -c '%a' "$f")"
  dmode="$(stat -f '%Lp' "$(dirname "$f")" 2>/dev/null || stat -c '%a' "$(dirname "$f")")"
  [ "$fmode" = "600" ]
  [ "$dmode" = "700" ]
}

@test "appends are additive (two appends → two lines)" {
  bash "$LEDGER_APPEND" smol-comms-register "$(seed_line)"
  local second
  second="$(python3 -c 'import json,sys;d=json.loads(sys.argv[1]);d["id"]="lrn-20260530-smol-second";print(json.dumps(d))' "$(seed_line)")"
  run bash "$LEDGER_APPEND" smol-comms-register "$second"
  [ "$status" -eq 0 ]
  run wc -l < "$(ledger_file smol-comms-register)"
  [ "${output// /}" -eq 2 ]
}

@test "concurrent writers do not interleave or corrupt (10 parallel appends → 10 valid lines)" {
  for i in $(seq 1 10); do
    local line
    line="$(python3 -c 'import json,sys;d=json.loads(sys.argv[1]);d["id"]=f"lrn-20260530-smol-c{int(sys.argv[2]):02d}";print(json.dumps(d))' "$(seed_line)" "$i")"
    bash "$LEDGER_APPEND" smol-comms-register "$line" &
  done
  wait
  local f; f="$(ledger_file smol-comms-register)"
  run wc -l < "$f"
  [ "${output// /}" -eq 10 ]
  # every line is independently valid JSON (no torn/interleaved writes)
  run python3 -c 'import json,sys;[json.loads(l) for l in open(sys.argv[1]) if l.strip()];print("ok")' "$f"
  [ "$status" -eq 0 ]
  [ "$output" = "ok" ]
}

@test "schema-invalid input exits 2 and does not append" {
  run bash "$LEDGER_APPEND" smol-comms-register '{"id":"x"}'
  [ "$status" -eq 2 ]
  [ ! -f "$(ledger_file smol-comms-register)" ] || [ ! -s "$(ledger_file smol-comms-register)" ]
}

@test "invalid slug (path traversal) is refused (exit 64)" {
  run bash "$LEDGER_APPEND" "../evil" "$(seed_line)"
  [ "$status" -eq 64 ]
}

@test "lock-timeout exits 3 (held STABLE lock, short timeout) — loud, never silent" {
  command -v flock >/dev/null 2>&1 || skip "flock not on PATH; mkdir-lock path covered implicitly"
  # The stable lock sits at the packs root (survives rm -rf of the pack dir).
  local lock="${TEST_ROOT}/.clew-smol-comms-register.lock"
  local ready="${TEST_ROOT}/holder.ready"
  # Hold the stable lock for 5s, signal readiness once acquired.
  ( flock -x 9; touch "$ready"; sleep 5 ) 9>"$lock" &
  local holder=$!
  for _ in $(seq 1 50); do [ -f "$ready" ] && break; sleep 0.1; done
  LOA_CLEW_LOCK_TIMEOUT=1 run bash "$LEDGER_APPEND" smol-comms-register "$(seed_line)"
  kill "$holder" 2>/dev/null || true; wait "$holder" 2>/dev/null || true
  [ "$status" -eq 3 ]
}
