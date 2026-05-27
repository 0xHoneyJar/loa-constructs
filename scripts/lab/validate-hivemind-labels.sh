#!/usr/bin/env bash
# validate-hivemind-labels.sh — validate a hivemind: YAML block against the
# canonical labels.schema.json v1.0 (vendored at scripts/lab/labels.schema.json).
#
# Self-contained: no Node dep. Uses yq (YAML→JSON) + jq (schema enum match).
# Implements the same shape-of-output as the canonical validator at
# 0xHoneyJar/construct-laboratory-substrate/validator/hivemind-labels-validate.
#
# Usage:
#   scripts/lab/validate-hivemind-labels.sh <markdown-file>
#   scripts/lab/validate-hivemind-labels.sh --issue <issue-number>      # via gh
#   scripts/lab/validate-hivemind-labels.sh --stdin                     # raw yaml on stdin
#
# Exit codes (matching canonical):
#   0  all match (or all required fields present and conforming)
#   2  malformed / missing block
#   3  enum drift (one or more fields don't match canonical enums)
#   4  missing required field
#
# Origin: #248 Phase A wire-up. Operator-authorized 2026-05-27 TEND cycle.
# Pin: scripts/lab/labels.schema.json.pin (bumped @1a0a776 → @2bd219ad 2026-05-27)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA="${HIVEMIND_SCHEMA:-$SCRIPT_DIR/labels.schema.json}"
EXTRACT="$SCRIPT_DIR/extract-hivemind-block.sh"

usage() {
  cat <<EOF >&2
usage:
  $0 <markdown-file>
  $0 --issue <number> [--repo <owner/repo>]
  $0 --stdin
EOF
  exit 2
}

# ---------- input resolution ----------
mode="file"
input=""
issue_num=""
repo="${LAB_VALIDATE_REPO:-0xHoneyJar/loa-constructs}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --issue)
      mode="issue"
      issue_num="${2:-}"
      shift 2
      ;;
    --repo)
      repo="${2:-}"
      shift 2
      ;;
    --stdin)
      mode="stdin"
      shift
      ;;
    -h|--help)
      usage
      ;;
    -*)
      echo "unknown flag: $1" >&2
      usage
      ;;
    *)
      input="$1"
      shift
      ;;
  esac
done

# ---------- preflight ----------
for bin in yq jq; do
  command -v "$bin" >/dev/null 2>&1 || { echo "$0: missing required binary: $bin" >&2; exit 2; }
done

if [[ ! -r "$SCHEMA" ]]; then
  echo "$0: schema not found at $SCHEMA" >&2
  exit 2
fi

# ---------- extract YAML block ----------
yaml_block=""
case "$mode" in
  file)
    [[ -z "$input" ]] && usage
    yaml_block=$(bash "$EXTRACT" "$input") || exit $?
    ;;
  issue)
    [[ -z "$issue_num" ]] && { echo "$0: --issue requires a number" >&2; exit 2; }
    command -v gh >/dev/null 2>&1 || { echo "$0: gh CLI required for --issue mode" >&2; exit 2; }
    tmp=$(mktemp)
    trap 'rm -f "$tmp"' EXIT
    gh issue view "$issue_num" --repo "$repo" --json body 2>/dev/null | jq -r '.body' > "$tmp"
    yaml_block=$(bash "$EXTRACT" "$tmp") || exit $?
    ;;
  stdin)
    yaml_block=$(cat)
    [[ -z "$yaml_block" ]] && { echo "$0: empty stdin" >&2; exit 2; }
    ;;
esac

# ---------- YAML → JSON ----------
block_json=$(printf '%s\n' "$yaml_block" | yq -p yaml -o json 2>/dev/null) || {
  echo "$0: malformed YAML in extracted block" >&2
  exit 2
}

# ---------- validate ----------
required_fields=(artifact_type workstream priority product_area jtbd learning_status source)
drift_count=0
match_count=0
missing_count=0
report=""

check_enum_field() {
  local field="$1"
  local actual
  actual=$(echo "$block_json" | jq -r --arg f "$field" '.[$f] // empty')
  if [[ -z "$actual" ]]; then
    missing_count=$((missing_count + 1))
    report+=$(printf "  %-16s MISSING\n" "$field")
    report+=$'\n'
    return
  fi
  local enum_match
  enum_match=$(jq -r --arg f "$field" --arg v "$actual" '
    .properties[$f].enum // [] | if (any(. == $v)) then "yes" else "no" end
  ' "$SCHEMA")
  if [[ "$enum_match" == "yes" ]]; then
    match_count=$((match_count + 1))
    report+=$(printf "  %-16s MATCH    '%s'\n" "$field" "$actual")
    report+=$'\n'
  else
    drift_count=$((drift_count + 1))
    local allowed
    allowed=$(jq -r --arg f "$field" '.properties[$f].enum // [] | join(" | ")' "$SCHEMA")
    report+=$(printf "  %-16s DRIFT    got '%s' — allowed: %s\n" "$field" "$actual" "$allowed")
    report+=$'\n'
  fi
}

check_free_field() {
  local field="$1"
  local actual
  actual=$(echo "$block_json" | jq -r --arg f "$field" '.[$f] // empty')
  if [[ -z "$actual" || "$actual" == "null" ]]; then
    missing_count=$((missing_count + 1))
    report+=$(printf "  %-16s MISSING\n" "$field")
    report+=$'\n'
  else
    match_count=$((match_count + 1))
    local truncated="$actual"
    [[ ${#truncated} -gt 50 ]] && truncated="${truncated:0:47}…"
    report+=$(printf "  %-16s MATCH    '%s'\n" "$field" "$truncated")
    report+=$'\n'
  fi
}

check_jtbd_field() {
  local cat desc match_cat
  cat=$(echo "$block_json" | jq -r '.jtbd.category // empty')
  desc=$(echo "$block_json" | jq -r '.jtbd.description // empty')
  if [[ -z "$cat" && -z "$desc" ]]; then
    missing_count=$((missing_count + 1))
    report+=$(printf "  %-16s MISSING\n" "jtbd")
    report+=$'\n'
    return
  fi
  if [[ -z "$cat" || -z "$desc" ]]; then
    drift_count=$((drift_count + 1))
    report+=$(printf "  %-16s DRIFT    jtbd needs both 'category' and 'description'\n" "jtbd")
    report+=$'\n'
    return
  fi
  match_cat=$(jq -r --arg v "$cat" '.properties.jtbd.properties.category.enum | if (any(. == $v)) then "yes" else "no" end' "$SCHEMA")
  if [[ "$match_cat" != "yes" ]]; then
    drift_count=$((drift_count + 1))
    local allowed
    allowed=$(jq -r '.properties.jtbd.properties.category.enum | join(" | ")' "$SCHEMA")
    report+=$(printf "  %-16s DRIFT    category '%s' — allowed: %s\n" "jtbd" "$cat" "$allowed")
    report+=$'\n'
  else
    match_count=$((match_count + 1))
    local desc_truncated="$desc"
    [[ ${#desc_truncated} -gt 30 ]] && desc_truncated="${desc_truncated:0:27}…"
    report+=$(printf "  %-16s MATCH    {%s: \"%s\"}\n" "jtbd" "$cat" "$desc_truncated")
    report+=$'\n'
  fi
}

# Run all checks
for f in artifact_type workstream priority learning_status source; do
  check_enum_field "$f"
done
check_free_field "product_area"
check_jtbd_field

# ---------- emit ----------
echo "hivemind-labels-validate (loa-constructs · vendored schema $(jq -r '.schema_version // "unknown"' "$SCHEMA"))"
echo
echo "  FIELD            STATUS   DETAIL"
printf '%s' "$report"
echo

# Determine exit code per canonical contract
if [[ $missing_count -gt 0 ]]; then
  echo "  RESULT: $drift_count drifted, $match_count match, $missing_count missing → exit 4"
  exit 4
elif [[ $drift_count -gt 0 ]]; then
  echo "  RESULT: $drift_count drifted, $match_count match, $missing_count missing → exit 3"
  exit 3
else
  echo "  RESULT: 0 drifted, $match_count match, 0 missing → exit 0"
  exit 0
fi
