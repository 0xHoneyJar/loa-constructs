#!/usr/bin/env bats
# Task 1.6 — sync-isolation P0 (mandatory test #2, SDD §3.5).
# Drives the REAL populate-global-store.sh against a hermetic temp repo+store and
# asserts the pack-root LEARNINGS.jsonl survives the rm -rf + re-copy byte-identically.

setup() {
  CLEW_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  REAL_POPULATE="$(cd "$CLEW_DIR/.." && pwd)/populate-global-store.sh"
  TMP="$(mktemp -d)"
  # Hermetic repo: copy the script under test so REPO_ROOT/CACHE_DIR resolve into TMP.
  # Also copy clew-lock.sh so populate's `${SCRIPT_DIR}/clew/clew-lock.sh` source resolves
  # (without it the lock degrades to a no-op and the coordination test can't run).
  mkdir -p "$TMP/scripts/clew" "$TMP/.cache/construct-repos/construct-foo/skills/foo"
  cp "$REAL_POPULATE" "$TMP/scripts/populate-global-store.sh"
  cp "$CLEW_DIR/clew-lock.sh" "$TMP/scripts/clew/clew-lock.sh"
  printf 'name: foo\nversion: 9.9.9\n' > "$TMP/.cache/construct-repos/construct-foo/construct.yaml"
  printf '# Foo skill (fresh from cache)\n' > "$TMP/.cache/construct-repos/construct-foo/skills/foo/SKILL.md"
  export LOA_GLOBAL_STORE="$TMP/store"
}

teardown() { [[ -n "${TMP:-}" ]] && rm -rf "$TMP"; }

@test "re-populate leaves an existing pack-root LEARNINGS.jsonl byte-identical" {
  local dest="$TMP/store/packs/foo"
  mkdir -p "$dest"
  # Two un-distilled capture lines living at the pack root.
  printf '%s\n%s\n' \
    '{"id":"lrn-20260530-foo-aaaaaa","tier":"construct"}' \
    '{"id":"lrn-20260530-foo-bbbbbb","tier":"construct"}' > "$dest/LEARNINGS.jsonl"
  cp "$dest/LEARNINGS.jsonl" "$TMP/preimage.jsonl"

  run bash "$TMP/scripts/populate-global-store.sh" --only foo
  [ "$status" -eq 0 ]

  # Proof the populate actually ran (would have rm -rf'd the dir): fresh skill landed.
  [ -f "$dest/skills/foo/SKILL.md" ]
  # The load-bearing invariant: the ledger is untouched, byte-for-byte.
  [ -f "$dest/LEARNINGS.jsonl" ]
  run cmp -s "$TMP/preimage.jsonl" "$dest/LEARNINGS.jsonl"
  [ "$status" -eq 0 ]
}

@test "a pack with no ledger is unaffected (no spurious file created)" {
  run bash "$TMP/scripts/populate-global-store.sh" --only foo
  [ "$status" -eq 0 ]
  [ ! -f "$TMP/store/packs/foo/LEARNINGS.jsonl" ]
}

@test "populate WAITS for a held ledger lock — no clobber race with concurrent capture" {
  command -v flock >/dev/null 2>&1 || skip "flock not on PATH"
  local dest="$TMP/store/packs/foo"
  mkdir -p "$dest"
  printf '%s\n' '{"id":"lrn-20260530-foo-aaaaaa","tier":"construct"}' > "$dest/LEARNINGS.jsonl"
  cp "$dest/LEARNINGS.jsonl" "$TMP/preimage.jsonl"
  # Hold the STABLE shared lock for 3s (simulating an in-flight capture).
  local lock="$TMP/store/packs/.clew-foo.lock"
  local ready="$TMP/holder.ready"
  ( flock -x 9; touch "$ready"; sleep 3 ) 9>"$lock" &
  local holder=$!
  for _ in $(seq 1 50); do [ -f "$ready" ] && break; sleep 0.1; done
  local t0 t1; t0="$(date +%s)"
  run bash "$TMP/scripts/populate-global-store.sh" --only foo
  t1="$(date +%s)"
  wait "$holder" 2>/dev/null || true
  [ "$status" -eq 0 ]
  # populate must have BLOCKED on the lock (≥2s of the 3s hold) rather than racing through.
  [ "$((t1 - t0))" -ge 2 ]
  # and the ledger is still byte-identical.
  run cmp -s "$TMP/preimage.jsonl" "$dest/LEARNINGS.jsonl"
  [ "$status" -eq 0 ]
}
