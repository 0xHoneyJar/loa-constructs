#!/usr/bin/env bash
# scripts/clew/propose-construct-learning.sh — construct-clew PROPAGATE gate (C5 + C6, SDD §1.4/§5.3/§6.1)
#
# The ONE place construct-clew data crosses the machine boundary (into a public PR).
# Mirrors `proposal-generator.sh`'s PR-drafting pattern as a NATIVE helper — the
# vendored `.claude/scripts/proposal-generator.sh` is NOT patched (that patch is the
# deferred base-Loa promotion, SDD §10 Q2 A2). Unlike the vendored generator (which
# opens an Issue on 0xHoneyJar/loa), this drafts a PR to the TARGETED construct's OWN
# canonical repo, resolved from `construct.yaml::repository.url` (FR-5).
#
#   propose-construct-learning.sh --construct <slug> --skill <slug> [--dry-run] [--pending-dir D]
#
# Order is FR-6 (archived guard) THEN FR-5 (auth pre-flight), both NON-BYPASSABLE:
#   1. resolve canonical = construct.yaml::repository.url  (untrusted → validated owner/repo)
#   2. C6 archived guard: gh repo view --json isArchived
#        archived=true  → SKIP: write distill_status=skipped_archived, emit uninstall flag,
#                         print operator PROMPT marker. exit 0 (designed skip, NOT an error).
#        repo-view fails → access/403 → FR-5 fail fast exit 4 (we hit this live), NO pr create.
#   3. C5 auth pre-flight: gh auth status → not authed → exit 4 BEFORE any pr create.
#   4. assemble PR body from the (already-redacted) RATIONALE.md + the inert PROPOSAL.diff,
#      under the field allowlist — the verbatim operator `trigger` quote NEVER reaches here
#      (it is not in either artifact; distill structurally excluded it, FR-8).
#   5. gh pr create --draft --repo <canonical>.  --dry-run stops BEFORE the create.
#
# FORCE CHAIN (NFR): this helper NEVER applies PROPOSAL.diff and NEVER sets verified:true.
# It only drafts an inert PR and (on the archived path) stamps distill_status=skipped_archived.
# No `|| true` / `2>/dev/null` masking on the gh boundary — failures are loud (SDD §6.2).
set -euo pipefail

PCL_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/clew/ledger-append.sh
source "${PCL_LIB_DIR}/ledger-append.sh"   # _clew_ledger_root, _clew_resolve_path, clew_run_locked

# Injectable gh + git (tests point these at stubs). Default: the real CLIs.
PCL_GH="${LOA_CLEW_GH:-gh}"
PCL_GIT="${LOA_CLEW_GIT:-git}"
PCL_PENDING_DEFAULT="${LOA_GRIMOIRE_DIR:-grimoires/loa}/skills-pending"

readonly PCL_OK=0 PCL_USAGE=64 PCL_NO_PROPOSAL=2 PCL_AUTH_FAIL=4

# The C7 reader (surface.sh) derives these from the SAME pending dir — keep them in lock-step.
# Computed from the runtime --pending-dir (NOT a load-time default) so a test/override pending
# dir and its flags/drafted side-files always co-locate. Env overrides win for explicit control.
_pcl_flags_file()   { printf '%s' "${LOA_CLEW_FLAGS_FILE:-$1/.clew-uninstall-flags.jsonl}"; }
_pcl_drafted_log()  { printf '%s' "${LOA_CLEW_DRAFTED_LOG:-$1/.clew-drafted.jsonl}"; }

_pcl_now() { date -u +%Y-%m-%dT%H:%M:%SZ; }

# Resolve a construct's canonical repo "owner/repo" from construct.yaml::repository.url.
# UNTRUSTED input (operator-editable yaml) → validate the resolved slug before it touches gh.
# Override the yaml path via LOA_CLEW_CONSTRUCT_YAML (tests); else read the global-store pack.
_pcl_resolve_repo() {
  local slug="$1" yaml url repo
  if [[ ! "$slug" =~ ^[a-z][a-z0-9-]*$ ]]; then
    echo "propose: invalid construct slug '$slug'" >&2; return $PCL_USAGE
  fi
  yaml="${LOA_CLEW_CONSTRUCT_YAML:-$(_clew_ledger_root)/$slug/construct.yaml}"
  if [[ ! -f "$yaml" ]]; then
    echo "propose: no construct.yaml for '$slug' at $yaml" >&2; return $PCL_NO_PROPOSAL
  fi
  # Extract repository.url WITHOUT a yaml dependency, but bounded to the repository: block ONLY
  # (DISS-007): stop at the next top-level key, so a missing repository.url can NEVER fall through
  # to an unrelated nested `url:` elsewhere in the file and resolve a non-canonical repo.
  url="$(LOA_PCL_YAML="$yaml" python3 -c '
import os, re, sys
lines = open(os.environ["LOA_PCL_YAML"], encoding="utf-8", errors="replace").read().splitlines()
start = next((i for i, l in enumerate(lines) if re.match(r"^repository:\s*$", l)), None)
if start is None:
    sys.exit(0)
for l in lines[start + 1:]:
    if re.match(r"^\S", l):          # next top-level key → end of the repository block
        break
    m = re.match(r"^\s+url:\s*(\S+)", l)
    if m:
        sys.stdout.write(m.group(1).strip().strip("\"'"'"'")); break
')"
  if [[ -z "$url" ]]; then
    echo "propose: construct.yaml for '$slug' has no repository.url" >&2; return $PCL_NO_PROPOSAL
  fi
  # https://github.com/OWNER/REPO(.git) → OWNER/REPO ; reject anything else.
  repo="$(printf '%s' "$url" | sed -E 's#^(https?://github\.com/|git@github\.com:)##; s#\.git$##; s#/$##')"
  if [[ ! "$repo" =~ ^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$ ]] || [[ "$repo" == *".."* ]]; then
    echo "propose: refusing unsafe/unrecognized repo '$repo' (from url '$url')" >&2
    return $PCL_NO_PROPOSAL
  fi
  printf '%s' "$repo"
}

# C6 archived check. Prints "true"/"false" on a successful gh query; returns non-zero
# (and prints nothing) when gh cannot resolve the repo — the caller treats that as the
# FR-5 access/403 failure and fails fast. Uses --json (never interpolates repo into a shell string).
_pcl_is_archived() {
  local repo="$1" out
  if ! out="$("$PCL_GH" repo view "$repo" --json isArchived -q '.isArchived' 2>/dev/null)"; then
    return 1
  fi
  [[ "$out" == "true" ]] && { printf 'true'; return 0; }
  printf 'false'; return 0
}

# FR-5 auth pre-flight. exit 0 = authenticated; non-zero = not (caller → exit 4).
_pcl_auth_ok() { "$PCL_GH" auth status >/dev/null 2>&1; }

# Pull source learning ids (lrn-...) from a RATIONALE.md so we can stamp the right ledger line(s).
_pcl_source_ids() {
  grep -oE 'lrn-[0-9]{8}-[a-z0-9-]+' "$1" 2>/dev/null | sort -u || true
}

# Locked read-modify-write: set distill_status for matching ids (regardless of distilled_at).
# Mirrors distill.sh's _dist_merge_stamps atomicity (temp-swap + mv under the shared clew lock).
# It ONLY rewrites distill_status — never `verified`, never any other field (force chain).
_pcl_set_status() {
  local slug="$1" status="$2"; shift 2
  local ids="$*" ledger
  ledger="$(_clew_resolve_path "$slug")" || return $?
  [[ -f "$ledger" ]] || return 0
  _pcl_rmw() {
    local lg="$1" st="$2" idlist="$3"
    local tmp; tmp="$(mktemp "$(dirname "$lg")/.LEARNINGS.swap.XXXXXX")"
    PCL_ST="$st" PCL_IDS="$idlist" python3 - "$lg" "$tmp" <<'PY'
import json, os, sys
status = os.environ["PCL_ST"]
ids = set(os.environ["PCL_IDS"].split())
out = []
for ln in open(sys.argv[1], encoding="utf-8", errors="replace"):
    s = ln.strip()
    if not s:
        continue
    try:
        o = json.loads(s)
    except Exception:
        out.append(s); continue          # preserve malformed lines verbatim
    if o.get("id") in ids:
        o["distill_status"] = status      # ONLY this field
        out.append(json.dumps(o, separators=(",", ":"), ensure_ascii=False))
    else:
        out.append(s)
with open(sys.argv[2], "w", encoding="utf-8") as fh:
    fh.write(("\n".join(out) + "\n") if out else "")
PY
    chmod 0600 "$tmp"
    mv -f "$tmp" "$lg"
  }
  clew_run_locked "$(_clew_ledger_root)" "$slug" "${LOA_CLEW_LOCK_TIMEOUT:-5}" -- \
    _pcl_rmw "$ledger" "$status" "$ids"
}

# Emit the FR-6 uninstall flag (consumed by surface.sh — never a dead side-effect).
_pcl_emit_uninstall_flag() {
  local slug="$1" skill="$2" repo="$3" flags_file="$4"
  mkdir -p "$(dirname "$flags_file")"
  local line
  line="$(SLUG="$slug" SKILL="$skill" REPO="$repo" TS="$(_pcl_now)" python3 -c '
import json, os
print(json.dumps({"kind":"uninstall_candidate","construct":os.environ["SLUG"],
  "skill":os.environ["SKILL"],"canonical":os.environ["REPO"],
  "reason":"canonical repo is archived","ts":os.environ["TS"]}, separators=(",",":")))')"
  printf '%s\n' "$line" >> "$flags_file"
}

# Short content signature of a PROPOSAL.diff — branch-name uniqueness + the .drafted/.rejected key.
_pcl_diff_hash() { shasum -a 256 "$1" 2>/dev/null | cut -c1-12; }

# A real unified diff starts with a `--- ` header; a `[CONTEXT-AMBIGUOUS]` marker does not.
_pcl_diff_is_patch() { head -1 "$1" 2>/dev/null | grep -q '^--- '; }

# Locate the skill's SKILL.md inside a cloned construct repo. Constructs lay skills under
# skills/<slug>/SKILL.md (global-store layout); fall back to .claude/skills, then a path search.
# Returns non-zero (and prints nothing) rather than guessing a wrong file.
_pcl_find_skill_file() {
  local work="$1" sk="$2" f
  for f in "$work/skills/$sk/SKILL.md" "$work/.claude/skills/$sk/SKILL.md" "$work/$sk/SKILL.md" "$work/SKILL.md"; do
    [[ -f "$f" ]] && { printf '%s' "$f"; return 0; }
  done
  f="$(find "$work" -type f -path "*/$sk/SKILL.md" 2>/dev/null | head -1)"
  [[ -n "$f" ]] && { printf '%s' "$f"; return 0; }
  return 1
}

# CRIT-1 (DISS-001): create a REAL branch-based PR in the target construct repo.
# clone canonical → locate the skill file → branch → patch-apply → commit → push → gh pr create --head.
# Phase-1 scope: assumes push access to the canonical (true for the 0xHoneyJar org — every construct
# canonical lives there). Fork-based PRs for third-party constructs are a documented Phase-2 extension.
# Prints the PR url on success; non-zero on any failure (caller surfaces it). NEVER runs under --dry-run.
_pcl_open_pr() {
  local repo="$1" skill="$2" dir="$3" title="$4" body_file="$5"
  local base; base="$("$PCL_GH" repo view "$repo" --json defaultBranchRef -q '.defaultBranchRef.name' 2>/dev/null || true)"
  [[ -n "$base" ]] || base="main"
  local work; work="$(mktemp -d)"
  if ! "$PCL_GIT" clone --depth 1 "https://github.com/${repo}.git" "$work" >/dev/null 2>&1; then
    echo "propose: clone of $repo failed (no access / network) — failing fast" >&2
    rm -rf "$work"; return $PCL_AUTH_FAIL
  fi
  local target; target="$(_pcl_find_skill_file "$work" "$skill")" || {
    echo "propose: could not locate skill '$skill' SKILL.md in $repo — refusing to guess a target" >&2
    rm -rf "$work"; return $PCL_NO_PROPOSAL; }
  local branch="clew/${skill}-$(_pcl_diff_hash "$dir/PROPOSAL.diff")"
  if ! ( set -e
         cd "$work"
         "$PCL_GIT" checkout -b "$branch" >/dev/null 2>&1
         patch -s "$target" < "$dir/PROPOSAL.diff"
         "$PCL_GIT" add -A
         "$PCL_GIT" -c user.email=clew@local -c user.name=construct-clew commit -m "$title" >/dev/null
         "$PCL_GIT" push -u origin "$branch" >/dev/null 2>&1 ); then
    echo "propose: branch/apply/push failed for $repo (patch may not apply — resolve at ratify)" >&2
    rm -rf "$work"; return $PCL_AUTH_FAIL
  fi
  # _pcl_open_pr runs under the caller's `set +e` (command-substitution), so errexit will NOT abort
  # a failing `gh pr create`. Check it EXPLICITLY (DISS-004): a push can succeed while PR creation
  # fails (perms, pre-existing branch/PR, validation, transient API). On failure we must return
  # non-zero with NO url — else the caller would write .drafted for a PR that does not exist and
  # permanently short-circuit the proposal as ALREADY_DRAFTED.
  local url
  if ! url="$("$PCL_GH" pr create --repo "$repo" --head "$branch" --base "$base" --draft \
        --title "$title" --body-file "$body_file")" || [[ -z "$url" ]]; then
    # pr create failed. The content-hashed branch may ALREADY back an open PR (rerun from another
    # checkout, lost .drafted, concurrent run). REUSE it idempotently — never destroy a real PR's
    # branch (DISS-009). Only a genuine orphan (pushed, but no backing PR) is cleaned up (DISS-005).
    local existing
    existing="$("$PCL_GH" pr list --repo "$repo" --head "$branch" --state all --json url -q '.[0].url' 2>/dev/null || true)"
    if [[ -n "$existing" ]]; then
      rm -rf "$work"; printf '%s' "$existing"; return $PCL_OK
    fi
    ( cd "$work" && "$PCL_GIT" push origin --delete "$branch" >/dev/null 2>&1 ) || true
    echo "propose: gh pr create failed for $repo (orphan branch $branch cleaned up) — NO PR drafted" >&2
    rm -rf "$work"; return $PCL_AUTH_FAIL
  fi
  rm -rf "$work"
  printf '%s' "$url"
}

# Assemble the PR body from already-redacted artifacts ONLY (field allowlist, FR-8).
_pcl_assemble_body() {
  local dir="$1" construct="$2" skill="$3"
  printf '## construct-clew — distilled learning for `%s` (skill `%s`)\n\n' "$construct" "$skill"
  printf 'This PR was drafted by the construct-distillation loop from a confirmed, generalized\n'
  printf 'learning. It is a **draft** and applies no change automatically — review the diff below.\n\n'
  printf -- '---\n\n'
  cat "$dir/RATIONALE.md"
  printf '\n\n### Proposed change\n\n```diff\n'
  cat "$dir/PROPOSAL.diff"
  printf '\n```\n'
}

pcl_propose() {
  local construct="" skill="" dry_run=false pending="$PCL_PENDING_DEFAULT"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --construct) construct="$2"; shift 2;;
      --skill) skill="$2"; shift 2;;
      --dry-run) dry_run=true; shift;;
      --pending-dir) pending="$2"; shift 2;;
      *) echo "unknown arg: $1" >&2; return $PCL_USAGE;;
    esac
  done
  [[ -n "$construct" && -n "$skill" ]] || {
    echo "usage: propose-construct-learning.sh --construct <slug> --skill <slug> [--dry-run] [--pending-dir D]" >&2
    return $PCL_USAGE; }

  local dir="${pending}/${construct}-${skill}"
  if [[ ! -f "$dir/PROPOSAL.diff" || ! -f "$dir/RATIONALE.md" ]]; then
    echo "propose: no distilled proposal at $dir (run distill first)" >&2
    return $PCL_NO_PROPOSAL
  fi

  # CRIT-2 (DISS-002): idempotent boundary crossing. A drafted proposal short-circuits — print the
  # existing PR, draft NO second PR. (surface.sh also stops listing a .drafted dir as pending.)
  # The short-circuit is CONTENT-SPECIFIC (DISS-006): it fires only when the stored hash matches the
  # CURRENT diff. A re-distilled (different) diff makes the marker stale → removed → the new
  # correction flows normally. Mirrors the content-specific rejection logic.
  if [[ -f "$dir/.drafted" ]]; then
    local drafted_hash cur_hash
    drafted_hash="$(sed -n 's/^hash=//p' "$dir/.drafted" | head -1)"
    cur_hash="$(_pcl_diff_hash "$dir/PROPOSAL.diff")"
    if [[ -n "$drafted_hash" && "$drafted_hash" == "$cur_hash" ]]; then
      local prior; prior="$(grep -oE 'https://[^ ]+' "$dir/.drafted" 2>/dev/null | head -1)"
      echo "ALREADY_DRAFTED ${prior:-$dir/.drafted}"
      return $PCL_OK
    fi
    rm -f "$dir/.drafted"   # stale: distill replaced the diff since this PR — let the new one flow
  fi

  # CRIT-1 (DISS-001): a [CONTEXT-AMBIGUOUS] marker is not a patch — it cannot become a PR.
  # Refuse rather than push an empty/garbage branch; the operator resolves the hint at ratify.
  if ! _pcl_diff_is_patch "$dir/PROPOSAL.diff"; then
    echo "propose: PROPOSAL.diff for ${construct}-${skill} is [CONTEXT-AMBIGUOUS], not a patch — resolve the line_hint at ratify before drafting" >&2
    return $PCL_NO_PROPOSAL
  fi

  local repo; repo="$(_pcl_resolve_repo "$construct")" || return $?

  # ---- C6 archived guard (FR-6) — runs FIRST, before any auth/PR side effect ----
  local archived rc
  set +e; archived="$(_pcl_is_archived "$repo")"; rc=$?; set -e
  if (( rc != 0 )); then
    # gh could not resolve the repo (403 on an archived/private repo, or network). This IS the
    # FR-5 access failure we hit live — fail fast, NO pr create attempt.
    echo "propose: cannot access '$repo' (gh repo view failed) — failing fast (FR-5)" >&2
    return $PCL_AUTH_FAIL
  fi
  if [[ "$archived" == "true" ]]; then
    local ids; ids="$(_pcl_source_ids "$dir/RATIONALE.md")"
    [[ -n "$ids" ]] && _pcl_set_status "$construct" "skipped_archived" $ids
    _pcl_emit_uninstall_flag "$construct" "$skill" "$repo" "$(_pcl_flags_file "$pending")"
    # Operator PROMPT (Q6: no auto-route in Phase 1). The deferred /skill-audit command surfaces
    # this as an AskUserQuestion (uninstall / route-to-mirror / discard); here we emit the marker.
    echo "SKIPPED_ARCHIVED $repo"
    printf '[CLEW-PROMPT] Canonical repo %s for %s is ARCHIVED. No PR drafted. Options: uninstall %s · route to a live mirror · discard. (operator decision — no auto-route)\n' \
      "$repo" "$skill" "$construct"
    return $PCL_OK
  fi

  # ---- C5 auth pre-flight (FR-5) — before any pr create ----
  if ! _pcl_auth_ok; then
    echo "propose: gh not authenticated (or scope insufficient) for '$repo' — failing fast before PR (FR-5)" >&2
    return $PCL_AUTH_FAIL
  fi

  local title="construct-clew: distilled learning for ${skill}"
  local body_file; body_file="$(umask 077 && mktemp)"
  _pcl_assemble_body "$dir" "$construct" "$skill" > "$body_file"

  if [[ "$dry_run" == true ]]; then
    echo "DRY_RUN $repo"
    echo "  title: $title"
    echo "  body:  $body_file ($(wc -l < "$body_file" | tr -d ' ') lines)"
    echo "  (no gh pr create attempted — --dry-run)"
    return $PCL_OK
  fi

  # ---- draft the PR (the single machine-boundary crossing) — real branch-based PR (CRIT-1) ----
  local url rc
  set +e; url="$(_pcl_open_pr "$repo" "$skill" "$dir" "$title" "$body_file")"; rc=$?; set -e
  rm -f "$body_file"
  if (( rc != 0 )); then return "$rc"; fi
  echo "DRAFTED $url"

  # CRIT-2: proposal-local drafted marker (consumed by surface.sh pending + the idempotency check above).
  local ids; ids="$(_pcl_source_ids "$dir/RATIONALE.md" | tr '\n' ' ')"
  printf 'pr=%s\nhash=%s\nids=%s\nts=%s\n' "$url" "$(_pcl_diff_hash "$dir/PROPOSAL.diff")" "$ids" "$(_pcl_now)" > "$dir/.drafted"

  # Record for the C7 'corrections in flight / landed' SessionStart surface (NOT a schema field).
  local drafted_log; drafted_log="$(_pcl_drafted_log "$pending")"
  mkdir -p "$(dirname "$drafted_log")"
  local rec
  rec="$(CONS="$construct" SK="$skill" REPO="$repo" URL="$url" TS="$(_pcl_now)" python3 -c '
import json, os
print(json.dumps({"construct":os.environ["CONS"],"skill":os.environ["SK"],
  "canonical":os.environ["REPO"],"pr":os.environ["URL"],"ts":os.environ["TS"]}, separators=(",",":")))')"
  printf '%s\n' "$rec" >> "$drafted_log"
  return $PCL_OK
}

# CLI shim for tests / direct invocation.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  pcl_propose "$@"; exit $?
fi
