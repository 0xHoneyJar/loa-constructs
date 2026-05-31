#!/usr/bin/env bash
# scripts/clew/distill.sh — construct-clew cold-path reducer (C4, SDD §1.4/§5/§6)
#
# Reads un-distilled ledger lines → clusters by target.skill_slug → runs the
# GENERALITY gate (FR-3) + REDACTION gate (FR-8) → fuzzy-matches target.line_hint
# against the target SKILL.md → emits an INERT PROPOSAL.diff + a REDACTED RATIONALE.md
# to grimoires/loa/skills-pending/<construct>-<skill>/ → stamps distilled_at idempotently.
# NEVER applies an edit; NEVER lets a verbatim operator quote leave the ledger.
#
# Subcommands (each unit-testable via `bash distill.sh <cmd> ...`):
#   match    <skill_md> <line_hint>          → "MATCH <n>" | "AMBIGUOUS <n,..>" | "NOMATCH"
#   generality <json-line>                   → exit 0 pass | 3 rejected_generality (reason on stderr)
#   redact   <json-line>                     → print RATIONALE-safe JSON | exit 4 rejected_redaction
#   propose  <skill_md> <json-line> <out_dir> → run gates+match+emit; prints final distill_status
#   run      [--construct S] [--min N] [--force] [--ledger-root R] [--out D] [--target-skill P]
#
# SECURITY (FR-8): the field allowlist — only {id,type,solution,target.skill_slug,tags}
# may leave; the verbatim `trigger` quote NEVER does. redact-export.sh's BLOCK rules
# are macOS-broken (grep -P), so we DO NOT trust its exit code for secrets — we run our
# own BSD-safe (grep -E) secret check on the exported fields and assert no trigger leaks.
set -euo pipefail

CLEW_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/clew/ledger-append.sh
source "${CLEW_LIB_DIR}/ledger-append.sh"   # brings _clew_ledger_root, _clew_resolve_path, clew_run_locked

DIST_REDACT_EXPORT="${LOA_CLEW_REDACT_EXPORT:-${CLEW_LIB_DIR}/../../.claude/scripts/redact-export.sh}"
DIST_OUT_DEFAULT="${LOA_GRIMOIRE_DIR:-grimoires/loa}/skills-pending"
readonly DIST_OK=0 DIST_USAGE=64 DIST_GENERALITY=3 DIST_REDACTION=4

_dist_now() { date -u +%Y-%m-%dT%H:%M:%SZ; }

# Secret detection — FAIL-CLOSED. redact-export's grep -P BLOCK rules no-op on macOS, and a
# 6-pattern denylist is structurally incomplete (red-team DISS), so this broadens the shape set
# AND adds a high-entropy fallback for token-shaped substrings (sha256/uuid exempted). Python,
# not grep, for the entropy math. Exit 0 = secret present, 1 = clean.
_dist_has_secret() {
  printf '%s' "$1" | python3 -c '
import re, sys, math
from collections import Counter
t = sys.stdin.read()
PATTERNS = [
  r"gh[psor]_[A-Za-z0-9_]{36}", r"github_pat_[A-Za-z0-9_]{30,}",
  r"(AKIA|ASIA|AROA|AIDA)[0-9A-Z]{16}",
  r"xox[baprs]-[A-Za-z0-9-]{10,}",
  r"sk[-_](live|test|proj)[-_][A-Za-z0-9]{16,}", r"sk-[A-Za-z0-9]{20,}",
  r"AIza[0-9A-Za-z_-]{35}",
  r"eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+",
  r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
  r"[Bb]earer\s+[A-Za-z0-9._-]{20,}",
]
for p in PATTERNS:
  if re.search(p, t): sys.exit(0)
def entropy(s):
  c = Counter(s); n = len(s)
  return -sum((v/n)*math.log2(v/n) for v in c.values())
for tok in re.findall(r"[A-Za-z0-9+/_=-]{32,}", t):
  if re.fullmatch(r"[a-f0-9]{64}", tok): continue                       # sha256
  if re.fullmatch(r"[0-9a-fA-F-]{36}", tok) and tok.count("-")==4: continue  # uuid
  if entropy(tok) >= 4.0: sys.exit(0)                                   # opaque high-entropy token
sys.exit(1)
'
}

# Project-specificity — a DENYLIST of non-portable markers (a shared construct edit must not
# hardcode them). Broadened per red-team: home/abs/env/Windows paths, source-tree relative paths,
# file extensions, org/repo slugs, deployment constants, internal hostnames/URLs. Exit 0 = specific.
_dist_is_project_specific() {
  printf '%s' "$1" | python3 -c '
import re, sys
t = sys.stdin.read()
PATTERNS = [
  r"/(Users|home|root)/", r"(^|\s)~/", r"\$HOME\b|\$PWD\b|%USERPROFILE%|%APPDATA%",
  r"[A-Za-z]:\\\\", r"%[A-Za-z_][A-Za-z0-9_]*%\\\\",
  r"(^|[\s(/\"'"'"'])(src|lib|apps|packages|app|components|scripts)/[A-Za-z0-9._-]",
  r"\.(ts|tsx|js|jsx|mjs|cjs|sh|ya?ml|json|py|rs|go|sol|svelte|vue)(\b|$)",
  r"\b[A-Za-z0-9_-]+/[A-Za-z0-9_-]+\b(?=.*(repo|org|github|0xHoneyJar))|0xHoneyJar/[A-Za-z0-9_-]+",
  r"\b[A-Z][A-Z0-9_]{3,}_(DEPLOYMENT|URL|KEY|TOKEN|ID|SECRET|HOST)\s*=",
  r"\b[a-z0-9-]+\.(internal|local|convex\.cloud|up\.railway\.app|vercel\.app)\b",
]
for p in PATTERNS:
  if re.search(p, t): sys.exit(0)
sys.exit(1)
'
}

# Validate a line against the construct-clew schema (reuse the Sprint-1 validator). This is the
# first defense for distill: it rejects non-conforming input — e.g. `tags` that are not slugs
# (so operator email/PII can never ride in via tags), over-long fields, unknown keys.
_dist_valid_line() { _clew_validate_compact "$1" >/dev/null 2>&1; }

# ---- match: fuzzy keyword overlap of line_hint against SKILL.md lines ----
# Returns the single best-scoring line, or AMBIGUOUS when the top score is shared.
dist_match() {
  local skill_md="$1" hint="$2"
  [[ -f "$skill_md" ]] || { echo "NOMATCH"; return 0; }
  DIST_HINT="$hint" python3 - "$skill_md" <<'PY'
import os, re, sys
STOP = {"the","a","an","of","to","in","on","is","are","and","or","for","rule","that","this","describing","vs","not"}
hint = os.environ["DIST_HINT"].lower()
kw = {w for w in re.findall(r"[a-z0-9][a-z0-9-]{2,}", hint) if w not in STOP}
best, hits = 0, []
for i, line in enumerate(open(sys.argv[1], encoding="utf-8", errors="replace"), 1):
    low = line.lower()
    score = sum(1 for w in kw if w in low)
    if score > best:
        best, hits = score, [i]
    elif score == best and score > 0:
        hits.append(i)
if best == 0:
    print("NOMATCH")
elif len(hits) == 1:
    print(f"MATCH {hits[0]}")
else:
    print("AMBIGUOUS " + ",".join(map(str, hits)))
PY
}

# ---- generality gate (FR-3) ----
dist_gate_generality() {
  local json="$1" sol
  sol="$(printf '%s' "$json" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("solution",""))')"
  if _dist_is_project_specific "$sol"; then
    echo "generality: solution contains a project-specific (absolute/home) path — not generalizable" >&2
    return $DIST_GENERALITY
  fi
  return $DIST_OK
}

# ---- redaction gate (FR-8) — emit RATIONALE-safe fields; the trigger NEVER leaves ----
dist_gate_redact() {
  local json="$1"
  # Field allowlist via explicit jq selection — `trigger` is structurally excluded.
  local safe sol_red sol
  safe="$(printf '%s' "$json" | python3 -c '
import json,sys
d=json.load(sys.stdin)
out={"id":d.get("id"),"type":d.get("type"),"solution":d.get("solution",""),
     "skill_slug":(d.get("target") or {}).get("skill_slug"),"tags":d.get("tags",[])}
sys.stdout.write(json.dumps(out))')"
  sol="$(printf '%s' "$safe" | python3 -c 'import json,sys;print(json.load(sys.stdin)["solution"])')"
  # Secret check on EVERY exported free-text field (solution + tags + skill_slug), not just solution:
  # a secret-shaped token can be a schema-valid slug/tag (e.g. `sk-live-aaaa…`, `xoxb-aaaa…`), so it
  # passes the schema yet would leak via tags (v4-dissent). Any hit → rejected_redaction.
  local exported
  exported="$(printf '%s' "$safe" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("solution","")+"\n"+"\n".join(d.get("tags") or [])+"\n"+(d.get("skill_slug") or ""))')"
  if _dist_has_secret "$exported"; then
    echo "redaction: an exported field (solution/tags/skill_slug) contains a secret-shaped token" >&2
    return $DIST_REDACTION
  fi
  # redact-export for its WORKING path/email REDACT (BSD-safe); ignore its (broken) BLOCK exit.
  if [[ -x "$DIST_REDACT_EXPORT" ]]; then
    sol_red="$(printf '%s' "$sol" | "$DIST_REDACT_EXPORT" --quiet 2>/dev/null || printf '%s' "$sol")"
  else
    sol_red="$sol"
  fi
  printf '%s' "$safe" | python3 -c 'import json,sys
d=json.load(sys.stdin); d["solution"]=sys.argv[1]; sys.stdout.write(json.dumps(d))' "$sol_red"
}

# ---- emit a unified diff replacing matched line with the solution ----
_dist_emit_diff() {
  local skill_md="$1" lineno="$2" new_text="$3" out="$4"
  local mod; mod="$(mktemp)"
  # Pass the replacement via ENVIRON (not `awk -v`, which processes backslash escapes).
  REPL="$new_text" awk -v n="$lineno" 'NR==n{print ENVIRON["REPL"]; next} {print}' "$skill_md" > "$mod"
  # `diff` exits 1 when files differ — expected; don't let set -e abort.
  local raw; raw="$(diff -u "$skill_md" "$mod" || true)"
  rm -f "$mod"
  # Clean a/ b/ header for readability (patch applies regardless via explicit target).
  printf '%s\n' "$raw" | sed -e "1s|^--- .*|--- a/$(basename "$skill_md")|" -e "2s|^+++ .*|+++ b/$(basename "$skill_md")|" > "$out"
}

# ---- propose: gates → match → emit, for one ledger line. Prints final distill_status. ----
dist_propose() {
  local skill_md="$1" json="$2" out_dir="$3"
  local construct skill id
  construct="$(printf '%s' "$json" | python3 -c 'import json,sys;print((json.load(sys.stdin).get("target") or {}).get("construct",""))')"
  skill="$(printf '%s' "$json" | python3 -c 'import json,sys;print((json.load(sys.stdin).get("target") or {}).get("skill_slug",""))')"
  id="$(printf '%s' "$json" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("id",""))')"

  # Defense #1: only schema-valid lines are processed (rejects non-slug tags, over-long/unknown fields).
  if ! _dist_valid_line "$json"; then echo "rejected_invalid"; return 0; fi
  if ! dist_gate_generality "$json" 2>/dev/null; then echo "rejected_generality"; return 0; fi
  local safe
  if ! safe="$(dist_gate_redact "$json" 2>/dev/null)"; then echo "rejected_redaction"; return 0; fi

  local dir="${out_dir}/${construct}-${skill}"
  mkdir -p "$dir"
  local hint sol matchres
  hint="$(printf '%s' "$json" | python3 -c 'import json,sys;print((json.load(sys.stdin).get("target") or {}).get("line_hint",""))')"
  sol="$(printf '%s' "$safe" | python3 -c 'import json,sys;print(json.load(sys.stdin)["solution"])')"
  matchres="$(dist_match "$skill_md" "$hint")"

  if [[ "$matchres" == MATCH\ * ]]; then
    _dist_emit_diff "$skill_md" "${matchres#MATCH }" "$sol" "${dir}/PROPOSAL.diff"
    _dist_rationale "$dir" "$id" "$safe" "" > "${dir}/RATIONALE.md"
    echo "proposed"
  else
    # NOMATCH or AMBIGUOUS — never guess-apply (SDD §6.1). The line_hint is NOT in the field
    # allowlist; rather than pretend-redact arbitrary prose, HARD-WITHHOLD it — emit only the
    # match-class and a pointer to the local ledger line by id (red-team DISS, option (a)).
    printf '[CONTEXT-AMBIGUOUS] line_hint did not resolve to a unique location (%s).\nThe raw hint is withheld from this artifact; consult the local ledger line %s to resolve at ratify.\n' \
      "$matchres" "$id" > "${dir}/PROPOSAL.diff"
    _dist_rationale "$dir" "$id" "$safe" "withheld" > "${dir}/RATIONALE.md"
    echo "proposed"
  fi
}

# RATIONALE.md — redacted summary, cites source id, NO verbatim trigger (FR-8).
_dist_rationale() {
  local dir="$1" id="$2" safe="$3" ambiguous_hint="$4"
  local type sol skill tags
  type="$(printf '%s' "$safe" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("type",""))')"
  sol="$(printf '%s' "$safe" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("solution",""))')"
  skill="$(printf '%s' "$safe" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("skill_slug",""))')"
  tags="$(printf '%s' "$safe" | python3 -c 'import json,sys;print(",".join(json.load(sys.stdin).get("tags") or []))')"
  printf '# Proposal Rationale — %s\n\n' "$skill"
  printf '> Source learning: `%s` (%s). The verbatim operator `trigger` quote is **excluded** (never read into this file); secret-shaped tokens and project-specific paths are gated. The generalized change below is operator-authored prose — it is reviewed **in full at ratify** before any PR (the mechanical gate is defense-in-depth, not a complete content filter).\n\n' "$id" "$type"
  printf '**Proposed change (generalized):** %s\n\n' "$sol"
  [[ -n "$tags" ]] && printf '**Tags:** %s\n\n' "$tags"
  if [[ -n "$ambiguous_hint" ]]; then
    printf '**[CONTEXT-AMBIGUOUS]** — the `line_hint` did not resolve to a unique location. The raw hint is **withheld** from this artifact; the operator consults the local ledger line to resolve the target at ratify.\n'
  fi
}

# Merge stamps into the LIVE ledger. Called UNDER the clew lock so the whole read-modify-write is
# atomic w.r.t. concurrent captures: it re-reads the current ledger, stamps only still-pending
# matching ids, and preserves every other line (incl. appends that arrived during processing).
_dist_merge_stamps() {
  local ledger="$1" stamps="$2"
  local tmp; tmp="$(mktemp "$(dirname "$ledger")/.LEARNINGS.swap.XXXXXX")"
  DIST_STAMPS="$stamps" python3 - "$ledger" "$tmp" <<'PY'
import json, os, sys
st = {}
with open(os.environ["DIST_STAMPS"], encoding="utf-8") as fh:
    for ln in fh:
        p = ln.rstrip("\n").split("\t")
        if len(p) == 3:
            st[p[0]] = (p[1], p[2])
out = []
for ln in open(sys.argv[1], encoding="utf-8", errors="replace"):
    s = ln.strip()
    if not s:
        continue
    try:
        o = json.loads(s)
    except Exception:
        out.append(s); continue        # preserve malformed lines verbatim
    i = o.get("id")
    if o.get("distilled_at") is None and i in st:
        o["distilled_at"] = st[i][1]
        o["distill_status"] = st[i][0]
        out.append(json.dumps(o, separators=(",", ":"), ensure_ascii=False))
    else:
        out.append(s)                   # keep already-stamped + concurrently-appended lines as-is
with open(sys.argv[2], "w", encoding="utf-8") as fh:
    fh.write(("\n".join(out) + "\n") if out else "")
PY
  chmod 0600 "$tmp"
  mv -f "$tmp" "$ledger"
}

# ---- run: orchestrate over a construct ledger, idempotent stamping under the clew lock ----
dist_run() {
  local construct="" min=5 force=false ledger_root="" out="$DIST_OUT_DEFAULT" target_skill=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --construct) construct="$2"; shift 2;;
      --min) min="$2"; shift 2;;
      --force) force=true; shift;;
      --ledger-root) ledger_root="$2"; shift 2;;
      --out) out="$2"; shift 2;;
      --target-skill) target_skill="$2"; shift 2;;
      *) echo "unknown arg: $1" >&2; return $DIST_USAGE;;
    esac
  done
  [[ -n "$construct" ]] || { echo "usage: distill.sh run --construct <slug> [...]" >&2; return $DIST_USAGE; }
  [[ -n "$ledger_root" ]] && export LOA_CLEW_LEDGER_ROOT="$ledger_root"

  local ledger; ledger="$(_clew_resolve_path "$construct")" || return $?
  [[ -f "$ledger" ]] || { echo "distill: no ledger for $construct" >&2; return 0; }

  # Un-distilled = distilled_at == null. Canonical JSON count (NOT `grep -c`, which both
  # mis-parses and diverges from the loop's parse — red-team idempotency finding).
  local pending
  pending="$(python3 -c '
import json,sys
n=0
for ln in open(sys.argv[1], encoding="utf-8", errors="replace"):
    ln=ln.strip()
    if not ln: continue
    try:
        if json.loads(ln).get("distilled_at") is None: n+=1
    except Exception: pass
print(n)' "$ledger")"
  if [[ "$force" != true && "$pending" -lt "$min" ]]; then
    echo "distill: $construct has $pending un-distilled line(s) (< min $min); skip (use --force)"
    return 0
  fi

  # Resolve the target SKILL.md (explicit for tests; candidate paths otherwise).
  local skill_md_for
  _resolve_skill_md() {
    local sk="$1"
    if [[ -n "$target_skill" ]]; then printf '%s' "$target_skill"; return; fi
    for c in "$HOME/.claude/skills/$sk/SKILL.md" "$(_clew_ledger_root)/$construct/skills/$sk/SKILL.md" "$(_clew_ledger_root)/$construct/SKILL.md"; do
      [[ -f "$c" ]] && { printf '%s' "$c"; return; }
    done
    printf ''
  }

  # PASS 1 (NO lock): process pending lines on a snapshot and record stamps as `id<TAB>status<TAB>ts`.
  # Gates + diff emission run here, OUTSIDE the lock, so the lock is held only for the short merge.
  local stamps; stamps="$(mktemp)"
  trap 'rm -f "$stamps" 2>/dev/null || true' RETURN
  local ts; ts="$(_dist_now)"
  local count=0
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    # Parse canonically; reject duplicate keys (tamper) / malformed lines LOUDLY (the merge keeps them verbatim).
    local parsed; parsed="$(printf '%s' "$line" | python3 -c '
import json,sys
def nodup(pairs):
    d={}
    for k,v in pairs:
        if k in d: raise ValueError("duplicate key")
        d[k]=v
    return d
try:
    o=json.loads(sys.stdin.read(), object_pairs_hook=nodup)
    print("pending" if o.get("distilled_at") is None else "done")
except Exception:
    print("ERROR")')"
    if [[ "$parsed" == "ERROR" ]]; then
      echo "distill: WARN malformed/tampered ledger line in $construct — left untouched (not distilled)" >&2
      continue
    fi
    [[ "$parsed" == "pending" ]] || continue   # only pending lines are processed; the merge preserves the rest
    local id; id="$(printf '%s' "$line" | python3 -c 'import json,sys;print(json.loads(sys.stdin.read()).get("id",""))' 2>/dev/null || true)"
    [[ -n "$id" ]] || continue
    # A schema-invalid pending line means tampering/corruption (ledger_append validates at write).
    # Do NOT stamp it with a non-enum `distill_status` (that would compound the corruption, v4-dissent)
    # — leave it untouched + LOUD so the operator fixes or removes it. Validate BEFORE resolving so we
    # never resolve a path from, or name an output dir by, an unvalidated slug.
    if ! _dist_valid_line "$line"; then
      echo "distill: WARN schema-invalid pending line in $construct (id ${id}) — left untouched, NOT stamped" >&2
      continue
    fi
    local sk; sk="$(printf '%s' "$line" | python3 -c 'import json,sys;print((json.load(sys.stdin).get("target") or {}).get("skill_slug",""))')"
    skill_md_for="$(_resolve_skill_md "$sk")"
    local status; status="$(dist_propose "$skill_md_for" "$line" "$out")"
    printf '%s\t%s\t%s\n' "$id" "$status" "$ts" >> "$stamps"
    count=$((count + 1))
  done < "$ledger"

  # PASS 2 (UNDER the clew lock): re-read the LIVE ledger, apply stamps to still-pending matching ids,
  # preserve everything else — including captures that arrived during PASS 1 — then atomic mv. The whole
  # read-modify-write is locked here, closing the lost-append race (final-dissent finding).
  clew_run_locked "$(_clew_ledger_root)" "$construct" "${LOA_CLEW_LOCK_TIMEOUT:-5}" -- \
    _dist_merge_stamps "$ledger" "$stamps"
  echo "distill: $construct → $count line(s) reduced"
}

# ---- CLI dispatch ----
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  cmd="${1:-}"; shift || true
  case "$cmd" in
    match)      dist_match "$@";;
    merge)      _dist_merge_stamps "$@";;
    generality) dist_gate_generality "$1"; echo "PASS";;
    redact)     dist_gate_redact "$1";;
    propose)    dist_propose "$@";;
    run)        dist_run "$@";;
    *) echo "usage: distill.sh {match|generality|redact|propose|run} ..." >&2; exit $DIST_USAGE;;
  esac
fi
