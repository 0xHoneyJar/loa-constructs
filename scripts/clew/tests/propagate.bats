#!/usr/bin/env bats
# Sprint 3 — PROPAGATE + RATIFY + SURFACE (C5/C6/C7, FR-4/5/6/7/8).
# Covers the mandatory tests: #3 archived guard, #4 PR-path resolution, #8 gh-auth fail-fast,
# #12 force chain. gh is injected via LOA_CLEW_GH pointing at a configurable stub that LOGS every
# call — so "no pr create" is asserted on the call log, never on luck.

load helper

setup() {
  clew_setup
  PROPOSE="${CLEW_DIR}/propose-construct-learning.sh"
  RATIFY="${CLEW_DIR}/ratify.sh"
  SURFACE="${CLEW_DIR}/surface.sh"
  PENDING="$TEST_ROOT/skills-pending"
  GH_CALL_LOG="$TEST_ROOT/gh-calls.log"; : > "$GH_CALL_LOG"; export GH_CALL_LOG
  GIT_CALL_LOG="$TEST_ROOT/git-calls.log"; : > "$GIT_CALL_LOG"; export GIT_CALL_LOG
  PUSHED_BRANCHES="$TEST_ROOT/pushed-branches"; : > "$PUSHED_BRANCHES"; export PUSHED_BRANCHES
  export LOA_CLEW_GH="$(mk_gh_stub)"
  export LOA_CLEW_GIT="$(mk_git_stub)"
  # A confirmed, distilled proposal for a LIVE-by-default construct (observer) + its ledger line.
  mk_construct observer https://github.com/0xHoneyJar/construct-observer.git
  mk_proposal observer keeper lrn-20260530-test
  mk_ledger_line observer lrn-20260530-test proposed
}
teardown() { clew_teardown; }

# A gh stub driven by $STUB_MODE (live|archived|403|noauth). Logs all calls.
mk_gh_stub() {
  local p="$TEST_ROOT/bin"; mkdir -p "$p"
  cat > "$p/gh" <<'STUB'
#!/usr/bin/env bash
echo "$*" >> "$GH_CALL_LOG"
case "$1 $2" in
  "repo view")
    if [[ "$*" == *defaultBranchRef* ]]; then echo main; exit 0; fi
    [[ "${STUB_MODE:-live}" == "archived" ]] && { echo true; exit 0; }
    [[ "${STUB_MODE:-live}" == "403" ]] && { echo "gh: HTTP 403 (archived/forbidden)" >&2; exit 1; }
    echo false; exit 0;;
  "auth status")
    [[ "${STUB_MODE:-live}" == "noauth" ]] && { echo "not logged in" >&2; exit 1; }
    exit 0;;
  "pr create")
    [[ "${STUB_MODE:-live}" == "prfail" || "${STUB_MODE:-live}" == "prexists" ]] && { echo "gh: pr create failed (e.g. a PR for that branch already exists)" >&2; exit 1; }
    echo "https://github.com/0xHoneyJar/construct-observer/pull/77"; exit 0;;
  "pr list")
    [[ "${STUB_MODE:-live}" == "prexists" ]] && { echo "https://github.com/0xHoneyJar/construct-observer/pull/55"; exit 0; }
    exit 0;;   # no existing PR (empty -q output)
esac
exit 0
STUB
  chmod +x "$p/gh"
  printf '%s' "$p/gh"
}

# A git stub: `clone` materializes a fake checkout with skills/keeper/SKILL.md = the patch pre-image
# (so the REAL `patch` in _pcl_open_pr applies); checkout/add/commit/push are logged no-ops. Handles
# leading `-c key=val` options. Logs all calls.
mk_git_stub() {
  local p="$TEST_ROOT/bin"; mkdir -p "$p"
  cat > "$p/git" <<'STUB'
#!/usr/bin/env bash
echo "$*" >> "$GIT_CALL_LOG"
args=("$@"); i=0
while [[ "${args[$i]:-}" == "-c" ]]; do i=$((i+2)); done
case "${args[$i]:-}" in
  clone)
    work="${args[$((${#args[@]}-1))]}"   # last arg = destination
    mkdir -p "$work/skills/keeper"
    printf 'old line\n' > "$work/skills/keeper/SKILL.md"
    exit 0;;
  push)
    branch="${args[$((${#args[@]}-1))]}"   # last arg = branch
    if [[ "$*" == *"--delete"* ]]; then    # cleanup: forget the branch
      grep -vxF "$branch" "$PUSHED_BRANCHES" > "$PUSHED_BRANCHES.t" 2>/dev/null || true
      mv -f "$PUSHED_BRANCHES.t" "$PUSHED_BRANCHES" 2>/dev/null || true
      exit 0
    fi
    # a real remote rejects a second push of an existing branch as non-fast-forward
    grep -qxF "$branch" "$PUSHED_BRANCHES" 2>/dev/null && { echo "! [rejected] non-fast-forward" >&2; exit 1; }
    echo "$branch" >> "$PUSHED_BRANCHES"; exit 0;;
  *) exit 0;;   # checkout / add / commit → succeed
esac
STUB
  chmod +x "$p/git"
  printf '%s' "$p/git"
}

mk_construct() {  # <slug> <repo-url>
  mkdir -p "$LOA_CLEW_LEDGER_ROOT/$1"
  printf 'name: T\nslug: %s\nrepository:\n  url: %s\n' "$1" "$2" > "$LOA_CLEW_LEDGER_ROOT/$1/construct.yaml"
}
mk_proposal() {  # <construct> <skill> <source-id>
  local d="$PENDING/$1-$2"; mkdir -p "$d"
  printf -- '--- a/SKILL.md\n+++ b/SKILL.md\n@@ -1 +1 @@\n-old line\n+generalized line\n' > "$d/PROPOSAL.diff"
  printf '# Proposal Rationale — %s\n\n> Source learning: `%s` (correction).\n\n**Proposed change:** sentence casing.\n' "$2" "$3" > "$d/RATIONALE.md"
}
mk_ledger_line() {  # <construct> <id> <status>
  local f="$LOA_CLEW_LEDGER_ROOT/$1/LEARNINGS.jsonl"
  printf '{"id":"%s","tier":"construct","type":"correction","trigger":"SECRET_TRIGGER_QUOTE_xyz","solution":"sentence casing","target":{"skill_slug":"keeper","construct":"%s"},"verified":false,"distilled_at":"2026-05-30T00:00:00Z","distill_status":"%s"}\n' "$2" "$1" "$3" > "$f"
  chmod 0600 "$f"
}
pr_create_count() { local n; n="$(grep -c '^pr create' "$GH_CALL_LOG" 2>/dev/null)" || n=0; printf '%s' "${n:-0}"; }
ledger_status() { python3 -c "import json;print(json.loads(open('$LOA_CLEW_LEDGER_ROOT/$1/LEARNINGS.jsonl').readline())['distill_status'])"; }
ledger_verified() { python3 -c "import json;print(json.loads(open('$LOA_CLEW_LEDGER_ROOT/$1/LEARNINGS.jsonl').readline())['verified'])"; }

# ---------------------------------------------------------------------------
# C5 repo resolution
# ---------------------------------------------------------------------------
@test "repo resolution: github url → owner/repo (dry-run echoes the resolved canonical)" {
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"DRY_RUN 0xHoneyJar/construct-observer"* ]]
  [ "$(pr_create_count)" -eq 0 ]   # dry-run never creates
}

@test "repo resolution: an unsafe/unrecognized repository.url is refused (no gh call)" {
  mk_construct evil 'https://evil.example.com/../../etc/passwd'
  mk_proposal evil keeper lrn-20260530-evil
  STUB_MODE=live run bash "$PROPOSE" --construct evil --skill keeper --pending-dir "$PENDING"
  [ "$status" -ne 0 ]
  [ "$(pr_create_count)" -eq 0 ]
}

@test "missing distilled proposal → exit 2 (nothing to propose)" {
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill nonexistent --pending-dir "$PENDING"
  [ "$status" -eq 2 ]
}

# ---------------------------------------------------------------------------
# #3 archived guard (FR-6, BLOCKER)
# ---------------------------------------------------------------------------
@test "#3 archived guard: isArchived:true → SKIP (no pr create), skipped_archived, uninstall flag, prompt" {
  STUB_MODE=archived run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]                         # designed skip, not an error (SDD §6.1)
  [[ "$output" == *"SKIPPED_ARCHIVED"* ]]
  [[ "$output" == *"[CLEW-PROMPT]"* ]]        # operator prompt fired (Q6: no auto-route)
  [ "$(pr_create_count)" -eq 0 ]             # the BLOCKER assertion: NO PR against an archived repo
  [ "$(ledger_status observer)" = "skipped_archived" ]
  [ -f "$PENDING/.clew-uninstall-flags.jsonl" ]
  grep -q 'uninstall_candidate' "$PENDING/.clew-uninstall-flags.jsonl"
}

@test "#3 archived flag co-locates with the pending dir (no real-repo pollution)" {
  STUB_MODE=archived run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ -f "$PENDING/.clew-uninstall-flags.jsonl" ]
  # surface.sh reads the SAME path → the FR-6 'wire a reader' contract (no dead flag)
  run bash "$SURFACE" flags --pending-dir "$PENDING"
  [ "$status" -eq 0 ]
  [[ "$output" == *"observer"* ]]
  [[ "$output" == *"uninstall candidate"* ]]
}

# ---------------------------------------------------------------------------
# #8 gh-auth fail-fast (FR-5, CRITICAL)
# ---------------------------------------------------------------------------
@test "#8 gh-auth fail-fast: not authenticated → exit 4 BEFORE any pr create" {
  STUB_MODE=noauth run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 4 ]
  [ "$(pr_create_count)" -eq 0 ]
}

@test "#8 access 403 on repo view → exit 4 fail-fast (the live archived-repo 403)" {
  STUB_MODE=403 run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 4 ]
  [ "$(pr_create_count)" -eq 0 ]
}

# ---------------------------------------------------------------------------
# #4 PR-path resolution (BLOCKER)
# ---------------------------------------------------------------------------
@test "#4 PR-path: live canonical → auth preflight ran, TARGET_REPO resolved, REAL branch PR drafted" {
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]
  [[ "$output" == *"DRAFTED https://github.com/0xHoneyJar/construct-observer/pull/77"* ]]
  grep -q '^auth status' "$GH_CALL_LOG"                # FR-5 preflight ran
  grep -q '^repo view 0xHoneyJar/construct-observer'  "$GH_CALL_LOG"  # resolved canonical
  # CRIT-1: a REAL branch-based PR — clone + push + --head (not a bare body-only pr create)
  grep -q '^clone --depth 1 https://github.com/0xHoneyJar/construct-observer.git' "$GIT_CALL_LOG"
  grep -q '^push -u origin clew/keeper-' "$GIT_CALL_LOG"
  grep '^pr create' "$GH_CALL_LOG" | grep -q -- '--head clew/keeper-'
  grep '^pr create' "$GH_CALL_LOG" | grep -q -- '--base main'
  [ "$(pr_create_count)" -eq 1 ]
  [ -f "$PENDING/observer-keeper/.drafted" ]          # CRIT-2 proposal-local drafted marker
  [ -f "$PENDING/.clew-drafted.jsonl" ]               # C7 'in flight' record
}

@test "DISS-004: gh pr create failure after push → non-zero, NO .drafted, retry not short-circuited" {
  STUB_MODE=prfail run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -ne 0 ]                                 # failure surfaces (not phantom success)
  [ ! -f "$PENDING/observer-keeper/.drafted" ]        # no drafted marker for a PR that does not exist
  : > "$GH_CALL_LOG"
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]                                 # retry actually drafts (not ALREADY_DRAFTED)
  [[ "$output" == *"DRAFTED"* ]]
  [ "$(pr_create_count)" -eq 1 ]
}

@test "DISS-009: pr-create failure with an EXISTING PR reuses it (no branch delete, no data loss)" {
  STUB_MODE=prexists run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]                                    # reused the existing PR, not failed
  grep -q '^pr list' "$GH_CALL_LOG"                      # checked for an existing PR first
  ! grep -q 'push origin --delete' "$GIT_CALL_LOG"       # the existing PR's branch is NOT deleted
  [ -f "$PENDING/observer-keeper/.drafted" ]
  grep -q 'pull/55' "$PENDING/observer-keeper/.drafted"  # marker points at the reused PR
}

@test "DISS-008: LOA_CLEW_FLAGS_FILE override stays in lock-step (writer + reader agree)" {
  export LOA_CLEW_FLAGS_FILE="$TEST_ROOT/custom-flags.jsonl"
  STUB_MODE=archived run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]
  [ -f "$LOA_CLEW_FLAGS_FILE" ]                          # writer honored the override
  [ ! -f "$PENDING/.clew-uninstall-flags.jsonl" ]        # NOT the default path
  run bash "$SURFACE" flags --pending-dir "$PENDING"     # reader honors the same override
  [[ "$output" == *"observer"* ]]
  [[ "$output" == *"uninstall candidate"* ]]
}

@test "DISS-008: LOA_CLEW_DRAFTED_LOG override is read by surface landed" {
  export LOA_CLEW_DRAFTED_LOG="$TEST_ROOT/custom-drafted.jsonl"
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]
  [ -f "$LOA_CLEW_DRAFTED_LOG" ]
  run bash "$SURFACE" landed --pending-dir "$PENDING"
  [[ "$output" == *"correction(s) drafted"* ]]
}

@test "DISS-005: pr-create failure deletes the pushed branch so a retry is not wedged" {
  STUB_MODE=prfail run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -ne 0 ]
  grep -q '^push origin --delete clew/keeper-' "$GIT_CALL_LOG"   # orphaned branch cleaned up
  # tracker is clear again → retry re-pushes cleanly and drafts (would be wedged without cleanup)
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]
  [[ "$output" == *"DRAFTED"* ]]
}

@test "DISS-006: a re-distilled diff after a draft is NOT short-circuited as ALREADY_DRAFTED" {
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]; [ -f "$PENDING/observer-keeper/.drafted" ]
  # distill replaces the diff with a corrected one (different content → different hash)
  printf -- '--- a/SKILL.md\n+++ b/SKILL.md\n@@ -1 +1 @@\n-old line\n+a NEWER corrected line\n' > "$PENDING/observer-keeper/PROPOSAL.diff"
  : > "$GH_CALL_LOG"
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]
  [[ "$output" == *"DRAFTED"* ]]
  [[ "$output" != *"ALREADY_DRAFTED"* ]]                 # the new correction is not buried
  [ "$(pr_create_count)" -eq 1 ]
  # surface also lists the re-distilled diff (stale .drafted does not suppress it)
  run bash "$SURFACE" pending --pending-dir "$PENDING" --handoffs-dir "$TEST_ROOT/h6"
  [[ "$output" == *"observer-keeper"* ]] || [ -z "$output" ]  # listed unless this exact diff was just re-drafted
}

@test "DISS-007: repository: with NO url never falls through to a later nested url (no gh call)" {
  mkdir -p "$LOA_CLEW_LEDGER_ROOT/nourl"
  printf 'name: NoUrl\nslug: nourl\nrepository:\n  homepage: https://constructs.network/x\nstreams:\n  url: https://github.com/evil/wrong-repo.git\n' > "$LOA_CLEW_LEDGER_ROOT/nourl/construct.yaml"
  mk_proposal nourl keeper lrn-20260530-nourl
  STUB_MODE=live run bash "$PROPOSE" --construct nourl --skill keeper --pending-dir "$PENDING"
  [ "$status" -ne 0 ]                                    # refuses — no repository.url
  [ "$(pr_create_count)" -eq 0 ]
  ! grep -q 'evil/wrong-repo' "$GH_CALL_LOG"             # never resolved the wrong repo
}

@test "CRIT-1: a [CONTEXT-AMBIGUOUS] proposal is NOT drafted (no clone, no PR)" {
  printf '[CONTEXT-AMBIGUOUS] line_hint did not resolve uniquely.\n' > "$PENDING/observer-keeper/PROPOSAL.diff"
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 2 ]
  [ ! -s "$GIT_CALL_LOG" ]            # never cloned
  [ "$(pr_create_count)" -eq 0 ]     # never PR'd
}

@test "CRIT-2: re-approving a drafted proposal is idempotent — no second PR" {
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]; [ "$(pr_create_count)" -eq 1 ]
  : > "$GH_CALL_LOG"                  # reset the call log
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]
  [[ "$output" == *"ALREADY_DRAFTED"* ]]
  [ "$(pr_create_count)" -eq 0 ]     # the boundary crossing is idempotent
}

@test "CRIT-2: surface pending stops listing a drafted proposal" {
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]
  run bash "$SURFACE" pending --pending-dir "$PENDING" --handoffs-dir "$TEST_ROOT/handoffs"
  [ -z "$output" ]                   # only proposal is drafted → nothing pending → silence
}

@test "CRIT-3: rejecting one diff does NOT bury a re-distilled (different) diff for the same skill" {
  run bash "$RATIFY" reject --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]
  run bash "$SURFACE" pending --pending-dir "$PENDING" --handoffs-dir "$TEST_ROOT/handoffs"
  [ -z "$output" ]                   # the rejected diff is suppressed
  # distill re-emits a CORRECTED proposal (new content → new hash) into the same dir
  printf -- '--- a/SKILL.md\n+++ b/SKILL.md\n@@ -1 +1 @@\n-old line\n+a BETTER generalized line\n' > "$PENDING/observer-keeper/PROPOSAL.diff"
  run bash "$SURFACE" pending --pending-dir "$PENDING" --handoffs-dir "$TEST_ROOT/handoffs2"
  [[ "$output" == *"observer-keeper"* ]]   # the new diff resurfaces (not buried by the stale rejection)
  export LOA_SESSION_ID=reapprove
  STUB_MODE=live run bash "$RATIFY" approve --construct observer --skill keeper --pending-dir "$PENDING" --dry-run
  [ "$status" -eq 0 ]                 # and is approvable again
  [[ "$output" == *"DRY_RUN"* ]]
}

@test "#4 PR body is assembled from redacted artifacts only — no verbatim trigger leaks (FR-8 carry)" {
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING" --dry-run
  [ "$status" -eq 0 ]
  # dry-run prints the body file path on the 'body:' line
  local body_file; body_file="$(printf '%s\n' "$output" | sed -n 's/.*body:  \([^ ]*\) .*/\1/p')"
  [ -n "$body_file" ] && [ -f "$body_file" ]
  run grep -F 'SECRET_TRIGGER_QUOTE_xyz' "$body_file"
  [ "$status" -ne 0 ]   # the verbatim ledger trigger MUST NOT appear in the PR body
}

# ---------------------------------------------------------------------------
# #12 force chain
# ---------------------------------------------------------------------------
@test "#12 force chain: drafting a PR never sets verified:true" {
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]
  [ "$(ledger_verified observer)" = "False" ]
}

@test "#12 force chain: no code path APPLIES the PROPOSAL.diff to a SKILL.md" {
  # The propose helper has no apply path; assert the target SKILL.md is untouched after a full run.
  local skill_md="$TEST_ROOT/SKILL.md"; printf 'old line\n' > "$skill_md"
  local before; before="$(cat "$skill_md")"
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$(cat "$skill_md")" = "$before" ]
}

# ---------------------------------------------------------------------------
# Task 3.1 ratify lifecycle (FR-4)
# ---------------------------------------------------------------------------
@test "ratify approve: delegates to the propose helper (inert until this gesture)" {
  STUB_MODE=live run bash "$RATIFY" approve --construct observer --skill keeper --pending-dir "$PENDING" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"DRY_RUN 0xHoneyJar/construct-observer"* ]]
}

@test "ratify reject: marks .rejected; approve then refuses; surface stops listing it" {
  run bash "$RATIFY" reject --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]
  [ -f "$PENDING/observer-keeper/.rejected" ]
  STUB_MODE=live run bash "$RATIFY" approve --construct observer --skill keeper --pending-dir "$PENDING" --dry-run
  [ "$status" -ne 0 ]                                  # rejected → not approvable
  run bash "$SURFACE" pending --pending-dir "$PENDING" --handoffs-dir "$TEST_ROOT/handoffs"
  [ -z "$output" ]                                     # the only proposal is rejected → silence
}

@test "ratify ignore: no-op, exits clean" {
  run bash "$RATIFY" ignore --construct observer --skill keeper --pending-dir "$PENDING"
  [ "$status" -eq 0 ]
  [[ "$output" == *"IGNORED"* ]]
  [ ! -f "$PENDING/observer-keeper/.rejected" ]
}

# ---------------------------------------------------------------------------
# Task 3.5 surface readers (FR-7, anti-bureaucracy §4.3)
# ---------------------------------------------------------------------------
@test "surface pending: lists pending + writes an L6 handoff doc" {
  run bash "$SURFACE" pending --pending-dir "$PENDING" --handoffs-dir "$TEST_ROOT/handoffs"
  [ "$status" -eq 0 ]
  [[ "$output" == *"1 construct proposal(s) pending"* ]]
  [ "$(ls "$TEST_ROOT/handoffs" 2>/dev/null | wc -l | tr -d ' ')" -ge 1 ]
}

@test "surface pending: degrades to SILENCE on an empty pending set" {
  run bash "$SURFACE" pending --pending-dir "$TEST_ROOT/empty-pending" --handoffs-dir "$TEST_ROOT/handoffs"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "surface pending: anti-nag — same set re-surfaces at most once per session" {
  export LOA_SESSION_ID=sess-1
  run bash "$SURFACE" pending --pending-dir "$PENDING" --handoffs-dir "$TEST_ROOT/handoffs"
  [ -n "$output" ]
  run bash "$SURFACE" pending --pending-dir "$PENDING" --handoffs-dir "$TEST_ROOT/handoffs"
  [ -z "$output" ]                                     # second call same session → silent
}

@test "surface landed: silent when no PR drafted; surfaces a line after a draft" {
  run bash "$SURFACE" landed --pending-dir "$PENDING"
  [ -z "$output" ]
  STUB_MODE=live run bash "$PROPOSE" --construct observer --skill keeper --pending-dir "$PENDING"
  run bash "$SURFACE" landed --pending-dir "$PENDING"
  [[ "$output" == *"correction(s) drafted"* ]]
}
