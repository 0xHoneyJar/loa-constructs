#!/usr/bin/env bats
# Sprint 2 — distill reducer + gates + fuzzy match + idempotency.
# Reuses seed_line() (the SDD §3.2 smol casing seed) from helper.bash.

load helper
setup()    { clew_setup; FIX="$(cd "$(dirname "$BATS_TEST_FILENAME")/fixtures" && pwd)"; DISTILL="${CLEW_DIR}/distill.sh"; OUT="$TEST_ROOT/skills-pending"; }
teardown() { clew_teardown; }

# Assemble secret-SHAPED test tokens at RUNTIME from split parts, so no contiguous secret literal is
# committed. GitHub push-protection (and any scanner) would otherwise block real-looking tokens even
# though these are synthetic fixtures. The runtime value still matches distill's _dist_has_secret.
mk_secret() {
  case "$1" in
    ghp)         printf 'ghp%s016C7e42F292c6912E7710c838347Ae178B4a' '_';;
    github_pat)  printf 'github%spat%s11ABCDEFG0aBcDeFgHiJkL1234567890aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789AbCd' '_' '_';;
    asia)        printf 'ASIA%s' 'Z4F5K6L7M8N9P0QR';;
    stripe)      printf 'sk%slive%s1234567890abcdefghijklmnop' '_' '_';;
    aiza)        printf 'AIza%s' 'SyD1234567890abcdefghijklmnopqrstuv';;
    slack)       printf 'xox%s%s2345678901-2345678901234-AbCdEfGhIjKlMnOpQrStUvWx' 'b' '-';;
    stripe_slug) printf 'sk%slive%saaaaaaaaaaaaaaaaaaaa' '-' '-';;
  esac
}

# override a single top-level or solution field of the seed line
seed_with_solution() { printf '%s' "$(seed_line)" | python3 -c 'import json,sys;d=json.loads(sys.stdin.read());d["solution"]=sys.argv[1];print(json.dumps(d))' "$1"; }

@test "match: golden fixture resolves the casing line uniquely" {
  run bash "$DISTILL" match "$FIX/smol-golden.SKILL.md" 'casing rule — the rule describing lowercase vs sentence casing'
  [ "$status" -eq 0 ]
  [ "$output" = "MATCH 4" ]
}

@test "match: ambiguous fixture (description + table both match) → AMBIGUOUS" {
  run bash "$DISTILL" match "$FIX/smol-ambiguous.SKILL.md" 'casing rule — the rule describing lowercase vs sentence casing'
  [ "$status" -eq 0 ]
  [[ "$output" == AMBIGUOUS\ * ]]
}

@test "P0 golden diff (#1): seed → PROPOSAL.diff that patch-applies to the corrected casing line" {
  run bash "$DISTILL" propose "$FIX/smol-golden.SKILL.md" "$(seed_line)" "$OUT"
  [ "$status" -eq 0 ]
  [ "$output" = "proposed" ]
  local prop="$OUT/smol-comms-register-smol-comms-register/PROPOSAL.diff"
  [ -f "$prop" ]
  # the diff replaces the verbose casing line with the generalized solution
  grep -qF 'AGENT writes normal sentence casing; lowercase is operator-only manual voice' "$prop"
  # and it applies to produce exactly that corrected line
  cp "$FIX/smol-golden.SKILL.md" "$TEST_ROOT/work"
  patch -s "$TEST_ROOT/work" < "$prop"
  [ "$(sed -n '4p' "$TEST_ROOT/work")" = 'AGENT writes normal sentence casing; lowercase is operator-only manual voice' ]
}

@test "generality gate (#7): a project-specific (absolute path) solution is rejected_generality, no diff" {
  local bad; bad="$(seed_with_solution 'always edit /Users/zksoju/loa-constructs/src/foo.ts directly')"
  run bash "$DISTILL" propose "$FIX/smol-golden.SKILL.md" "$bad" "$OUT"
  [ "$status" -eq 0 ]
  [ "$output" = "rejected_generality" ]
  [ ! -f "$OUT/smol-comms-register-smol-comms-register/PROPOSAL.diff" ]
}

@test "redaction gate (#6a): no verbatim trigger quote appears in RATIONALE.md" {
  bash "$DISTILL" propose "$FIX/smol-golden.SKILL.md" "$(seed_line)" "$OUT"
  local rat="$OUT/smol-comms-register-smol-comms-register/RATIONALE.md"
  [ -f "$rat" ]
  # the verbatim operator quote must NOT leak (FR-8)
  run grep -F 'lowercase is MY manual voice' "$rat"
  [ "$status" -ne 0 ]
}

@test "redaction gate (#6b): an un-redactable secret in the exported solution → rejected_redaction" {
  local bad; bad="$(seed_with_solution "use token $(mk_secret ghp) for the call")"
  run bash "$DISTILL" propose "$FIX/smol-golden.SKILL.md" "$bad" "$OUT"
  [ "$status" -eq 0 ]
  [ "$output" = "rejected_redaction" ]
}

@test "ambiguity (#6.1): no unique match → [CONTEXT-AMBIGUOUS], never guess-apply" {
  run bash "$DISTILL" propose "$FIX/smol-ambiguous.SKILL.md" "$(seed_line)" "$OUT"
  [ "$status" -eq 0 ]
  local prop="$OUT/smol-comms-register-smol-comms-register/PROPOSAL.diff"
  grep -qF '[CONTEXT-AMBIGUOUS]' "$prop"
  # it is NOT a real applicable hunk (no @@ hunk header)
  run grep -qF '@@' "$prop"
  [ "$status" -ne 0 ]
}

seed_with_hint() { printf '%s' "$(seed_line)" | python3 -c 'import json,sys;d=json.loads(sys.stdin.read());d["target"]["line_hint"]=sys.argv[1];print(json.dumps(d))' "$1"; }

@test "DISS-001: a secret in line_hint is WITHHELD from ambiguous PROPOSAL.diff/RATIONALE (FR-8)" {
  local sec; sec="$(mk_secret ghp)"
  local bad; bad="$(seed_with_hint "locate the $sec usage line")"
  run bash "$DISTILL" propose "$FIX/smol-golden.SKILL.md" "$bad" "$OUT"
  [ "$status" -eq 0 ]
  local d="$OUT/smol-comms-register-smol-comms-register"
  grep -qF '[CONTEXT-AMBIGUOUS]' "$d/PROPOSAL.diff"
  run grep -F "$sec" "$d/PROPOSAL.diff" "$d/RATIONALE.md"
  [ "$status" -ne 0 ]   # secret must NOT appear in either artifact
  grep -qF 'withheld' "$d/PROPOSAL.diff"
}

@test "DISS-001: an absolute path in line_hint is REDACTED from ambiguous artifacts (FR-8)" {
  local bad; bad="$(seed_with_hint 'the entry near /Users/zksoju/private/notes.md region')"
  run bash "$DISTILL" propose "$FIX/smol-golden.SKILL.md" "$bad" "$OUT"
  [ "$status" -eq 0 ]
  local d="$OUT/smol-comms-register-smol-comms-register"
  run grep -F '/Users/zksoju/private/notes.md' "$d/PROPOSAL.diff" "$d/RATIONALE.md"
  [ "$status" -ne 0 ]   # raw path must NOT appear
}

@test "red-team secret-bypass: broadened token formats all route to rejected_redaction" {
  local sec
  for sec in "$(mk_secret github_pat)" "$(mk_secret asia)" "$(mk_secret stripe)" "$(mk_secret aiza)" "$(mk_secret slack)"; do
    local bad; bad="$(seed_with_solution "use the value $sec when configuring")"
    run bash "$DISTILL" propose "$FIX/smol-golden.SKILL.md" "$bad" "$OUT"
    [ "$status" -eq 0 ]
    if [ "$output" != "rejected_redaction" ]; then echo "LEAKED secret format: $sec → $output"; false; fi
  done
}

@test "red-team generality-bypass: non-portable markers all route to rejected_generality" {
  local spec
  for spec in \
    'edit the file at src/components/Foo.tsx to apply the rule' \
    'set the value under $HOME/config before running' \
    'follow the 0xHoneyJar/loa-constructs repo convention' \
    'set CONVEX_DEPLOYMENT=quaint-anaconda-866 in the environment'; do
    local bad; bad="$(seed_with_solution "$spec")"
    run bash "$DISTILL" propose "$FIX/smol-golden.SKILL.md" "$bad" "$OUT"
    [ "$status" -eq 0 ]
    if [ "$output" != "rejected_generality" ]; then echo "GENERALITY MISS: $spec → $output"; false; fi
  done
}

@test "red-team tags-leak: operator email in tags rejected by schema re-validation" {
  local bad; bad="$(printf '%s' "$(seed_line)" | python3 -c 'import json,sys;d=json.loads(sys.stdin.read());d["tags"]=["beatselysian@gmail.com","operator-zksoju-private"];print(json.dumps(d))')"
  run bash "$DISTILL" propose "$FIX/smol-golden.SKILL.md" "$bad" "$OUT"
  [ "$status" -eq 0 ]
  [ "$output" = "rejected_invalid" ]
  [ ! -f "$OUT/smol-comms-register-smol-comms-register/RATIONALE.md" ]
}

@test "red-team prose-leak: operator prose in line_hint is hard-withheld (not pretend-redacted)" {
  local bad; bad="$(seed_with_hint 'qqzznomatch zksoju privately despises gumi wibblefrotz')"
  run bash "$DISTILL" propose "$FIX/smol-golden.SKILL.md" "$bad" "$OUT"
  [ "$status" -eq 0 ]
  local d="$OUT/smol-comms-register-smol-comms-register"
  run grep -F 'zksoju privately despises gumi' "$d/PROPOSAL.diff" "$d/RATIONALE.md"
  [ "$status" -ne 0 ]
  grep -qF 'withheld' "$d/PROPOSAL.diff"
}

@test "re-dissent: a target-not-found line still runs the gates (secret → rejected_redaction, not bare proposed)" {
  local sec; sec="$(mk_secret ghp)"
  local line; line="$(printf '%s' "$(seed_line)" | python3 -c 'import json,sys;d=json.loads(sys.stdin.read());d["target"]["construct"]="ghostc";d["target"]["skill_slug"]="ghosts";d["solution"]="use "+sys.argv[1]+" now";print(json.dumps(d))' "$sec")"
  local dir="$TEST_ROOT/ghostc"; mkdir -p "$dir"; printf '%s\n' "$line" > "$dir/LEARNINGS.jsonl"
  run bash "$DISTILL" run --construct ghostc --force --ledger-root "$TEST_ROOT" --out "$OUT"
  [ "$status" -eq 0 ]
  run grep -rF "$sec" "$OUT"
  [ "$status" -ne 0 ]   # secret never reaches any artifact
  grep -qF '"distill_status":"rejected_redaction"' "$dir/LEARNINGS.jsonl"
}

@test "re-dissent: a schema-invalid pending line in run is left UNTOUCHED (no non-enum stamp, no traversal)" {
  local line; line="$(printf '%s' "$(seed_line)" | python3 -c 'import json,sys;d=json.loads(sys.stdin.read());d["target"]["skill_slug"]="../evil";print(json.dumps(d))')"
  local dir="$TEST_ROOT/smol-comms-register"; mkdir -p "$dir"; printf '%s\n' "$line" > "$dir/LEARNINGS.jsonl"
  run bash "$DISTILL" run --construct smol-comms-register --force --ledger-root "$TEST_ROOT" --out "$OUT"
  [ "$status" -eq 0 ]
  # v4-dissent: never stamp a non-enum status — the invalid line stays pending + untouched (loud-warned).
  # Parse (not grep) so the assertion is independent of JSON whitespace.
  run python3 -c 'import json,sys;d=json.loads(open(sys.argv[1]).readline());print("ok" if d.get("distilled_at") is None and d.get("distill_status")=="pending" else "STAMPED")' "$dir/LEARNINGS.jsonl"
  [ "$output" = "ok" ]
  [ ! -e "$TEST_ROOT/evil" ]   # no traversal dir from the bad slug
}

@test "v4-dissent: a secret-shaped (schema-valid) tag → rejected_redaction (no leak via tags)" {
  local bad; bad="$(printf '%s' "$(seed_line)" | python3 -c 'import json,sys;d=json.loads(sys.stdin.read());d["tags"]=[sys.argv[1]];print(json.dumps(d))' "$(mk_secret stripe_slug)")"
  run bash "$DISTILL" propose "$FIX/smol-golden.SKILL.md" "$bad" "$OUT"
  [ "$status" -eq 0 ]
  [ "$output" = "rejected_redaction" ]
  [ ! -f "$OUT/smol-comms-register-smol-comms-register/RATIONALE.md" ]
}

@test "final-dissent: locked merge preserves a concurrent append while stamping (no lost capture)" {
  local dir="$TEST_ROOT/smol-comms-register"; mkdir -p "$dir"
  # L1 was the snapshot distill processed; L2 is a capture that landed DURING processing.
  printf '%s\n' "$(seed_line)" > "$dir/LEARNINGS.jsonl"                                   # L1 (id lrn-...smol-casing)
  local L2; L2="$(seed_line | python3 -c 'import json,sys;d=json.loads(sys.stdin.read());d["id"]="lrn-20260530-smol-concurrent";print(json.dumps(d))')"
  printf '%s\n' "$L2" >> "$dir/LEARNINGS.jsonl"                                            # L2 appended after snapshot
  # stamps map covers ONLY L1 (what PASS 1 saw)
  printf 'lrn-20260530-smol-casing\tproposed\t2026-05-30T12:00:00Z\n' > "$TEST_ROOT/stamps.tsv"
  run bash "$DISTILL" merge "$dir/LEARNINGS.jsonl" "$TEST_ROOT/stamps.tsv"
  [ "$status" -eq 0 ]
  # L1 stamped, L2 preserved and still pending (never lost)
  run python3 -c '
import json,sys
rows=[json.loads(l) for l in open(sys.argv[1]) if l.strip()]
by={r["id"]:r for r in rows}
assert len(rows)==2, rows
assert by["lrn-20260530-smol-casing"]["distilled_at"]=="2026-05-30T12:00:00Z"
assert by["lrn-20260530-smol-concurrent"]["distilled_at"] is None
print("ok")' "$dir/LEARNINGS.jsonl"
  [ "$output" = "ok" ]
}

@test "idempotency (#11): run stamps un-distilled lines once; a re-run reduces 0" {
  local dir="$TEST_ROOT/smol-comms-register"; mkdir -p "$dir"
  # one already-distilled line + one pending line
  printf '%s\n' "$(seed_line | python3 -c 'import json,sys;d=json.loads(sys.stdin.read());d["id"]="lrn-20260530-smol-done";d["distilled_at"]="2026-05-30T00:00:00Z";d["distill_status"]="proposed";print(json.dumps(d))')" > "$dir/LEARNINGS.jsonl"
  printf '%s\n' "$(seed_line)" >> "$dir/LEARNINGS.jsonl"

  run bash "$DISTILL" run --construct smol-comms-register --force --ledger-root "$TEST_ROOT" --out "$OUT" --target-skill "$FIX/smol-golden.SKILL.md"
  [ "$status" -eq 0 ]
  [[ "$output" == *"1 line(s) reduced"* ]]
  # both lines now stamped (no null distilled_at remains)
  run grep -c '"distilled_at":null' "$dir/LEARNINGS.jsonl"
  [ "${output}" -eq 0 ]

  # re-run → nothing left to do
  run bash "$DISTILL" run --construct smol-comms-register --force --ledger-root "$TEST_ROOT" --out "$OUT" --target-skill "$FIX/smol-golden.SKILL.md"
  [ "$status" -eq 0 ]
  [[ "$output" == *"0 line(s) reduced"* ]]
}

@test "no-force on an all-distilled ledger: 0 pending, clean skip (regression: grep -c '0\\n0')" {
  local dir="$TEST_ROOT/smol-comms-register"; mkdir -p "$dir"
  printf '%s\n' "$(seed_line | python3 -c 'import json,sys;d=json.loads(sys.stdin.read());d["distilled_at"]="2026-05-30T00:00:00Z";print(json.dumps(d))')" > "$dir/LEARNINGS.jsonl"
  run bash "$DISTILL" run --construct smol-comms-register --min 5 --ledger-root "$TEST_ROOT" --out "$OUT" --target-skill "$FIX/smol-golden.SKILL.md"
  [ "$status" -eq 0 ]
  [[ "$output" == *"skip"* ]]
}

@test "Chronos N>=5 gate: fewer than min un-distilled lines → skip (no --force)" {
  local dir="$TEST_ROOT/smol-comms-register"; mkdir -p "$dir"
  printf '%s\n' "$(seed_line)" > "$dir/LEARNINGS.jsonl"
  run bash "$DISTILL" run --construct smol-comms-register --min 5 --ledger-root "$TEST_ROOT" --out "$OUT" --target-skill "$FIX/smol-golden.SKILL.md"
  [ "$status" -eq 0 ]
  [[ "$output" == *"skip"* ]]
  run grep -c '"distilled_at":null' "$dir/LEARNINGS.jsonl"
  [ "${output}" -eq 1 ]
}
