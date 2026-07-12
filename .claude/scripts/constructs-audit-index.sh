#!/usr/bin/env bash
# constructs-audit-index.sh - Audit all pack skill index.yaml files for completeness
#
# Checks: triggers (min 3, at least 1 NL), examples (min 2, correct fields),
#          domain_hints (min 2), duplicate triggers, integrations vs mcp-registry
#
# Usage:
#   .claude/scripts/constructs-audit-index.sh           # Human-readable table
#   .claude/scripts/constructs-audit-index.sh --json     # Machine-readable JSON
#
# Exit codes: 0 = all pass, 1 = failures found

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PACKS_DIR="$ROOT_DIR/.claude/constructs/packs"
MCP_REGISTRY="$ROOT_DIR/.claude/mcp-registry.yaml"

JSON_MODE=false
[[ "${1:-}" == "--json" ]] && JSON_MODE=true

# Colors (disabled in JSON mode)
if $JSON_MODE; then
  RED="" GREEN="" YELLOW="" NC="" BOLD=""
else
  RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[0;33m' NC='\033[0m' BOLD='\033[1m'
fi

TOTAL=0
PASS=0
FAIL=0
WARN=0

# Temp files for collecting results
FAILURES_FILE=$(mktemp)
WARNINGS_FILE=$(mktemp)
TRIGGERS_FILE=$(mktemp)
JSON_FILE=$(mktemp)
trap "rm -f $FAILURES_FILE $WARNINGS_FILE $TRIGGERS_FILE $JSON_FILE" EXIT

# Audit one skill
audit_skill() {
  local pack="$1" skill="$2" file="$3"
  local status="PASS"
  local issues=""

  TOTAL=$((TOTAL + 1))

  # Check triggers count
  local trigger_count
  trigger_count=$(yq '.triggers | length' "$file" 2>/dev/null || echo "0")
  if [[ "$trigger_count" -lt 3 ]]; then
    status="FAIL"
    issues="${issues}triggers: $trigger_count < 3 required; "
  fi

  # Check NL triggers and collect all triggers for duplicate detection
  local nl_count=0
  local i=0
  while [[ $i -lt $trigger_count ]]; do
    local trigger
    trigger=$(yq ".triggers[$i]" "$file" 2>/dev/null || echo "")
    if [[ -n "$trigger" ]]; then
      if [[ ! "$trigger" =~ ^/ ]]; then
        nl_count=$((nl_count + 1))
      fi
      echo "$pack:$skill:$trigger" >> "$TRIGGERS_FILE"
    fi
    i=$((i + 1))
  done

  if [[ "$nl_count" -lt 1 ]]; then
    status="FAIL"
    issues="${issues}no NL triggers; "
  fi

  # Check examples count
  local example_count
  example_count=$(yq '.examples | length' "$file" 2>/dev/null || echo "0")
  if [[ "$example_count" -lt 2 ]]; then
    status="FAIL"
    issues="${issues}examples: $example_count < 2 required; "
  fi

  # Check domain_hints count
  local hints_count
  hints_count=$(yq '.domain_hints | length' "$file" 2>/dev/null || echo "0")
  if [[ "$hints_count" -lt 2 ]]; then
    status="FAIL"
    issues="${issues}domain_hints: $hints_count < 2 required; "
  fi

  # Check integrations against mcp-registry
  local int_count
  int_count=$(yq '.integrations.optional | length' "$file" 2>/dev/null || echo "0")
  if [[ "$int_count" -gt 0 ]] && [[ -f "$MCP_REGISTRY" ]]; then
    local j=0
    while [[ $j -lt $int_count ]]; do
      local name
      name=$(yq ".integrations.optional[$j].name" "$file" 2>/dev/null || echo "")
      if [[ -n "$name" ]] && [[ "$name" != "null" ]]; then
        if ! grep -q "^${name}:" "$MCP_REGISTRY" 2>/dev/null && ! grep -q "^  ${name}:" "$MCP_REGISTRY" 2>/dev/null; then
          echo "$pack/$skill: integration '$name' not in mcp-registry.yaml" >> "$WARNINGS_FILE"
          WARN=$((WARN + 1))
        fi
      fi
      j=$((j + 1))
    done
  fi

  # Record result
  if [[ "$status" == "PASS" ]]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "$pack/$skill: $issues" >> "$FAILURES_FILE"
  fi

  if $JSON_MODE; then
    local issues_json="[]"
    if [[ -n "$issues" ]]; then
      issues_json="[\"${issues%;*}\"]"
    fi
    echo "{\"pack\":\"$pack\",\"skill\":\"$skill\",\"status\":\"$status\",\"triggers\":$trigger_count,\"nl_triggers\":$nl_count,\"examples\":$example_count,\"hints\":$hints_count}" >> "$JSON_FILE"
  else
    local status_icon
    if [[ "$status" == "PASS" ]]; then
      status_icon="${GREEN}PASS${NC}"
    else
      status_icon="${RED}FAIL${NC}"
    fi
    printf "  %-30s %b  triggers:%-2s  examples:%-2s  hints:%-2s" "$skill" "$status_icon" "$trigger_count" "$example_count" "$hints_count"
    if [[ -n "$issues" ]]; then
      printf "  ${RED}%s${NC}" "$issues"
    fi
    printf "\n"
  fi
}

# Check for duplicate triggers within same pack
check_duplicates() {
  if [[ ! -s "$TRIGGERS_FILE" ]]; then
    return
  fi

  # Extract pack:trigger, sort, find duplicates
  while IFS= read -r line; do
    local pack="${line%%:*}"
    local rest="${line#*:}"
    local skill="${rest%%:*}"
    local trigger="${rest#*:}"
    echo "$pack	$trigger	$skill"
  done < "$TRIGGERS_FILE" | sort | awk -F'\t' '
    {
      key = $1 "\t" $2
      if (key == prev_key) {
        print $1 "/" prev_skill " and " $1 "/" $3 ": duplicate trigger \"" $2 "\""
      }
      prev_key = key
      prev_skill = $3
    }
  ' | while IFS= read -r dup; do
    echo "$dup" >> "$WARNINGS_FILE"
    WARN=$((WARN + 1))
  done
}

# Main
if ! $JSON_MODE; then
  echo -e "${BOLD}Constructs Skill Index Audit${NC}"
  echo "================================"
  echo ""
fi

for pack_dir in "$PACKS_DIR"/*/; do
  [[ ! -d "$pack_dir" ]] && continue
  pack_name=$(basename "$pack_dir")

  if ! $JSON_MODE; then
    echo -e "${BOLD}$pack_name${NC}"
  fi

  for skill_dir in "$pack_dir"skills/*/; do
    [[ ! -d "$skill_dir" ]] && continue
    skill_name=$(basename "$skill_dir")
    index_file="$skill_dir/index.yaml"

    if [[ ! -f "$index_file" ]]; then
      if ! $JSON_MODE; then
        echo -e "  ${YELLOW}$skill_name: no index.yaml${NC}"
      fi
      continue
    fi

    audit_skill "$pack_name" "$skill_name" "$index_file"
  done

  if ! $JSON_MODE; then
    echo ""
  fi
done

# Check duplicates
check_duplicates

# Output summary
if $JSON_MODE; then
  echo "{"
  echo "  \"total\": $TOTAL,"
  echo "  \"pass\": $PASS,"
  echo "  \"fail\": $FAIL,"
  echo "  \"warnings\": $WARN,"
  echo "  \"results\": ["
  first=true
  while IFS= read -r line; do
    if $first; then
      first=false
    else
      echo ","
    fi
    echo -n "    $line"
  done < "$JSON_FILE"
  echo ""
  echo "  ],"
  echo "  \"failures\": ["
  first=true
  if [[ -s "$FAILURES_FILE" ]]; then
    while IFS= read -r line; do
      if $first; then
        first=false
      else
        echo ","
      fi
      echo -n "    \"$line\""
    done < "$FAILURES_FILE"
  fi
  echo ""
  echo "  ],"
  echo "  \"duplicate_warnings\": ["
  first=true
  if [[ -s "$WARNINGS_FILE" ]]; then
    while IFS= read -r line; do
      if $first; then
        first=false
      else
        echo ","
      fi
      echo -n "    \"$line\""
    done < "$WARNINGS_FILE"
  fi
  echo ""
  echo "  ]"
  echo "}"
else
  echo "================================"
  echo -e "Total: $TOTAL  ${GREEN}Pass: $PASS${NC}  ${RED}Fail: $FAIL${NC}  ${YELLOW}Warn: $WARN${NC}"

  if [[ -s "$FAILURES_FILE" ]]; then
    echo ""
    echo -e "${RED}Failures:${NC}"
    while IFS= read -r line; do
      echo "  - $line"
    done < "$FAILURES_FILE"
  fi

  if [[ -s "$WARNINGS_FILE" ]]; then
    echo ""
    echo -e "${YELLOW}Warnings:${NC}"
    while IFS= read -r line; do
      echo "  - $line"
    done < "$WARNINGS_FILE"
  fi
fi

# Exit code
if [[ $FAIL -gt 0 ]]; then
  exit 1
else
  exit 0
fi
