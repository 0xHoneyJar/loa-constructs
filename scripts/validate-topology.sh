#!/usr/bin/env bash
# validate-topology.sh — Topology contamination regression prevention
# SDD Reference: §6.1 (Constructs Network Phase 2)
#
# 8-check validation script that prevents topology contamination in skill packs.
# Runs in --strict mode (CI, no allowlist) or --relaxed mode (local, with allowlist).
#
# Exit codes:
#   0 — All checks pass
#   1 — Topology contamination found
#   2 — Missing metadata

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PACKS_DIR="apps/sandbox/packs"
CONSTRUCTS_DIR=".claude/constructs/packs"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

MODE="strict"   # strict (CI) or relaxed (local)
ALLOWLIST_FILE=""
VERBOSE=false
JSON_OUTPUT=false

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

VIOLATIONS=()
WARNINGS=()
EXIT_CODE=0

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------

usage() {
  cat <<'USAGE'
Usage: validate-topology.sh [OPTIONS]

Options:
  --strict          CI mode, no allowlist (default)
  --relaxed         Local mode, reads allowlist file
  --allowlist FILE  Path to allowlist file (implies --relaxed)
  --verbose         Show detailed output
  --json            Output results as JSON
  -h, --help        Show this help

Exit Codes:
  0  All checks pass
  1  Topology contamination found
  2  Missing metadata
USAGE
}

# ---------------------------------------------------------------------------
# Argument Parsing
# ---------------------------------------------------------------------------

while [[ $# -gt 0 ]]; do
  case "$1" in
    --strict)     MODE="strict"; shift ;;
    --relaxed)    MODE="relaxed"; shift ;;
    --allowlist)  ALLOWLIST_FILE="$2"; MODE="relaxed"; shift 2 ;;
    --verbose)    VERBOSE=true; shift ;;
    --json)       JSON_OUTPUT=true; shift ;;
    -h|--help)    usage; exit 0 ;;
    *)            echo "Unknown option: $1"; usage; exit 1 ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log() { [[ "$VERBOSE" == true ]] && echo "$@" || true; }

add_violation() {
  local check="$1" file="$2" detail="$3"
  VIOLATIONS+=("${check}|${file}|${detail}")
  [[ "$VERBOSE" == true ]] && echo -e "${RED}  FAIL${NC} [$check] $file: $detail"
}

add_warning() {
  local check="$1" file="$2" detail="$3"
  WARNINGS+=("${check}|${file}|${detail}")
  [[ "$VERBOSE" == true ]] && echo -e "${YELLOW}  WARN${NC} [$check] $file: $detail"
}

# Check if a line is inside an exempt block (example or counterfactual)
# Returns 0 if exempt, 1 otherwise
#
# Exempt patterns:
#   - Fenced code blocks with "# Example" headers
#   - Fenced code blocks inside counterfactual sections (Near Miss / Category Error)
#   - Markdown tables under "# Example" headers (until next heading)
is_in_example_block() {
  local file="$1" target_line="$2"
  local in_fence=false
  local is_example_fence=false
  local is_counterfactual_section=false
  local in_example_table_zone=false
  local line_num=0

  while IFS= read -r line; do
    line_num=$((line_num + 1))

    # Detect counterfactual sections (Near Miss / Category Error)
    if [[ "$line" =~ ^###.*Near\ Miss ]] || [[ "$line" =~ ^###.*Category\ Error ]]; then
      is_counterfactual_section=true
    elif [[ "$line" =~ ^##\  ]] && [[ ! "$line" =~ ^###\  ]]; then
      # New H2 section ends counterfactual context
      is_counterfactual_section=false
    fi

    # Detect "# Example" headers outside fences (for table exemptions)
    if [[ "$in_fence" == false ]] && [[ "$line" =~ ^#\ Example ]]; then
      in_example_table_zone=true
    elif [[ "$in_fence" == false ]] && [[ "$line" =~ ^#  ]] && [[ ! "$line" =~ ^#\ Example ]]; then
      # Any other heading ends the example table zone
      in_example_table_zone=true  # keep true for "# Example" subsections
      if [[ ! "$line" =~ Example ]]; then
        in_example_table_zone=false
      fi
    fi

    # Detect fence boundaries
    if [[ "$line" =~ ^\`\`\` ]]; then
      if [[ "$in_fence" == true ]]; then
        in_fence=false
        is_example_fence=false
      else
        in_fence=true
        is_example_fence=false
      fi
      continue
    fi

    # Detect # Example header inside fence
    if [[ "$in_fence" == true ]] && [[ "$line" =~ ^#\ Example ]]; then
      is_example_fence=true
    fi

    # Check if target line is reached
    if [[ $line_num -eq $target_line ]]; then
      # Exempt if: in fenced example block, in fenced counterfactual block,
      # or in a markdown table under an Example heading
      if [[ "$in_fence" == true ]] && [[ "$is_example_fence" == true ]]; then
        return 0
      fi
      if [[ "$in_fence" == true ]] && [[ "$is_counterfactual_section" == true ]]; then
        return 0
      fi
      if [[ "$in_fence" == false ]] && [[ "$in_example_table_zone" == true ]]; then
        return 0
      fi
      if [[ "$is_counterfactual_section" == true ]]; then
        return 0
      fi
      return 1
    fi
  done < "$file"
  return 1
}

# Check if a path is in the allowlist
is_allowed() {
  local file="$1"
  if [[ "$MODE" == "strict" ]] || [[ -z "$ALLOWLIST_FILE" ]]; then
    return 1
  fi
  if [[ -f "$ALLOWLIST_FILE" ]]; then
    grep -qF "$file" "$ALLOWLIST_FILE" 2>/dev/null && return 0
  fi
  return 1
}

# Resolve pack search directories (check both sandbox and constructs)
get_pack_dirs() {
  local dirs=()
  [[ -d "$ROOT_DIR/$PACKS_DIR" ]] && dirs+=("$ROOT_DIR/$PACKS_DIR")
  [[ -d "$ROOT_DIR/$CONSTRUCTS_DIR" ]] && dirs+=("$ROOT_DIR/$CONSTRUCTS_DIR")
  echo "${dirs[@]}"
}

# ---------------------------------------------------------------------------
# Check 1: Hardcoded Address Scan
# ---------------------------------------------------------------------------

check_hardcoded_addresses() {
  log "Check 1: Hardcoded address scan..."
  local count=0

  for pack_root in $(get_pack_dirs); do
    while IFS= read -r -d '' file; do
      # Skip allowlisted files
      local rel_path="${file#"$ROOT_DIR/"}"
      is_allowed "$rel_path" && continue

      # Skip .example and .schema.json files
      [[ "$file" == *.example ]] && continue
      [[ "$file" == *.schema.json ]] && continue

      local line_num=0
      while IFS= read -r line; do
        line_num=$((line_num + 1))
        if [[ "$line" =~ 0x[a-fA-F0-9]{40} ]]; then
          # Check if in example block
          if is_in_example_block "$file" "$line_num"; then
            continue
          fi
          # Skip placeholder addresses (0x_YOUR_, 0x0000)
          if [[ "$line" =~ 0x_YOUR_ ]] || [[ "$line" =~ 0x0{40} ]]; then
            continue
          fi
          add_violation "hardcoded-address" "$rel_path:$line_num" "Found Ethereum address pattern"
          count=$((count + 1))
        fi
      done < "$file"
    done < <(find "$pack_root" -path "*/skills/*/SKILL.md" -print0 2>/dev/null)
  done

  [[ $count -gt 0 ]] && EXIT_CODE=1
  log "  Found $count hardcoded address violations"
}

# ---------------------------------------------------------------------------
# Check 2: Localhost Scan
# ---------------------------------------------------------------------------

check_localhost() {
  log "Check 2: Localhost scan..."
  local count=0

  for pack_root in $(get_pack_dirs); do
    while IFS= read -r -d '' file; do
      local rel_path="${file#"$ROOT_DIR/"}"
      is_allowed "$rel_path" && continue

      local line_num=0
      while IFS= read -r line; do
        line_num=$((line_num + 1))
        if [[ "$line" =~ localhost:[0-9]+ ]] || [[ "$line" =~ 127\.0\.0\.1 ]]; then
          if is_in_example_block "$file" "$line_num"; then
            continue
          fi
          add_violation "localhost" "$rel_path:$line_num" "Found localhost reference"
          count=$((count + 1))
        fi
      done < "$file"
    done < <(find "$pack_root" -path "*/skills/*/SKILL.md" -print0 2>/dev/null)
  done

  [[ $count -gt 0 ]] && EXIT_CODE=1
  log "  Found $count localhost violations"
}

# ---------------------------------------------------------------------------
# Check 3: Chain ID Scan
# ---------------------------------------------------------------------------

check_chain_ids() {
  log "Check 3: Chain ID scan..."
  local count=0

  for pack_root in $(get_pack_dirs); do
    while IFS= read -r -d '' file; do
      local rel_path="${file#"$ROOT_DIR/"}"
      is_allowed "$rel_path" && continue

      # Skip overlay examples and schema files
      [[ "$file" == *contexts/overlays/*.example ]] && continue
      [[ "$file" == *contexts/schemas/* ]] && continue

      local line_num=0
      while IFS= read -r line; do
        line_num=$((line_num + 1))
        if [[ "$line" =~ eip155:[0-9]+ ]]; then
          if is_in_example_block "$file" "$line_num"; then
            continue
          fi
          add_violation "chain-id" "$rel_path:$line_num" "Found hardcoded chain ID"
          count=$((count + 1))
        fi
      done < "$file"
    done < <(find "$pack_root" -path "*/skills/*/SKILL.md" -print0 2>/dev/null)
  done

  [[ $count -gt 0 ]] && EXIT_CODE=1
  log "  Found $count chain ID violations"
}

# ---------------------------------------------------------------------------
# Check 4: Capability Metadata Check
# ---------------------------------------------------------------------------

check_capability_metadata() {
  log "Check 4: Capability metadata check..."
  local count=0
  local missing_exit=false

  for pack_root in $(get_pack_dirs); do
    while IFS= read -r -d '' file; do
      local rel_path="${file#"$ROOT_DIR/"}"
      is_allowed "$rel_path" && continue

      # Check for capabilities key using structured YAML parsing
      if command -v yq &>/dev/null; then
        if ! yq -e '.capabilities' "$file" &>/dev/null; then
          add_violation "capability-metadata" "$rel_path" "Missing 'capabilities' key"
          count=$((count + 1))
          missing_exit=true
        fi
      else
        # Fallback: basic check
        if ! grep -q "^capabilities:" "$file"; then
          add_violation "capability-metadata" "$rel_path" "Missing 'capabilities' key"
          count=$((count + 1))
          missing_exit=true
        fi
      fi
    done < <(find "$pack_root" -name "index.yaml" -path "*/skills/*/index.yaml" -print0 2>/dev/null)
  done

  [[ "$missing_exit" == true ]] && [[ $EXIT_CODE -eq 0 ]] && EXIT_CODE=2
  log "  Found $count missing capability metadata"
}

# ---------------------------------------------------------------------------
# Check 5: Manifest v3 Check
# ---------------------------------------------------------------------------

check_manifest_v3() {
  log "Check 5: Manifest v3 check..."
  local count=0
  local missing_exit=false

  for pack_root in $(get_pack_dirs); do
    while IFS= read -r -d '' file; do
      local rel_path="${file#"$ROOT_DIR/"}"
      is_allowed "$rel_path" && continue

      # Parse JSON structurally
      local schema_version
      schema_version=$(jq -r '.schema_version // 0' "$file" 2>/dev/null)
      if [[ "$schema_version" -lt 3 ]]; then
        add_violation "manifest-v3" "$rel_path" "schema_version=$schema_version (need >=3)"
        count=$((count + 1))
        missing_exit=true
      fi

      # Check pack_dependencies key exists
      if ! jq -e '.pack_dependencies' "$file" &>/dev/null; then
        add_violation "manifest-v3" "$rel_path" "Missing 'pack_dependencies' key"
        count=$((count + 1))
        missing_exit=true
      fi
    done < <(find "$pack_root" -name "manifest.json" -maxdepth 2 -print0 2>/dev/null)
  done

  [[ "$missing_exit" == true ]] && [[ $EXIT_CODE -eq 0 ]] && EXIT_CODE=2
  log "  Found $count manifest v3 violations"
}

# ---------------------------------------------------------------------------
# Check 6: Context Slot Check
# ---------------------------------------------------------------------------

check_context_slots() {
  log "Check 6: Context slot check..."
  local count=0

  for pack_root in $(get_pack_dirs); do
    while IFS= read -r -d '' file; do
      local rel_path="${file#"$ROOT_DIR/"}"
      local pack_dir
      pack_dir=$(dirname "$file")
      is_allowed "$rel_path" && continue

      # Check if manifest declares required_slots
      local required_slots
      required_slots=$(jq -r '.required_slots // [] | .[]' "$file" 2>/dev/null)

      for slot in $required_slots; do
        local schema_file="$pack_dir/contexts/schemas/${slot}.schema.json"
        if [[ ! -f "$schema_file" ]]; then
          add_violation "context-slots" "$rel_path" "Required slot '$slot' missing schema at contexts/schemas/${slot}.schema.json"
          count=$((count + 1))
        fi
      done
    done < <(find "$pack_root" -name "manifest.json" -maxdepth 2 -print0 2>/dev/null)
  done

  [[ $count -gt 0 ]] && [[ $EXIT_CODE -eq 0 ]] && EXIT_CODE=2
  log "  Found $count context slot violations"
}

# ---------------------------------------------------------------------------
# Check 7: Melange Scan
# ---------------------------------------------------------------------------

check_melange_references() {
  log "Check 7: Melange scan..."
  local count=0

  # Scan .claude/, grimoires/, .loa.config.yaml for melange references
  # Allowed only in docs/archive/ and audits/
  local search_paths=()
  [[ -d "$ROOT_DIR/.claude" ]] && search_paths+=("$ROOT_DIR/.claude")
  [[ -d "$ROOT_DIR/grimoires" ]] && search_paths+=("$ROOT_DIR/grimoires")
  [[ -f "$ROOT_DIR/.loa.config.yaml" ]] && search_paths+=("$ROOT_DIR/.loa.config.yaml")

  if [[ ${#search_paths[@]} -gt 0 ]]; then
    while IFS=: read -r file line_content; do
      [[ -z "$file" ]] && continue
      local rel_path="${file#"$ROOT_DIR/"}"

      # Allow in archive, audit, and grimoire state directories
      # Grimoires contain planning docs that reference Melange removal — not active code
      [[ "$rel_path" == docs/archive/* ]] && continue
      [[ "$rel_path" == audits/* ]] && continue
      [[ "$rel_path" == grimoires/* ]] && continue

      is_allowed "$rel_path" && continue

      add_violation "melange" "$rel_path" "Found Melange reference: $(echo "$line_content" | head -c 80)"
      count=$((count + 1))
    done < <(grep -rni "melange" "${search_paths[@]}" 2>/dev/null || true)
  fi

  [[ $count -gt 0 ]] && EXIT_CODE=1
  log "  Found $count Melange reference violations"
}

# ---------------------------------------------------------------------------
# Check 8: Overlay Security Check
# ---------------------------------------------------------------------------

check_overlay_security() {
  log "Check 8: Overlay security check..."
  local count=0

  for pack_root in $(get_pack_dirs); do
    # Find any .json files (non-.example) in overlays directories tracked by git
    while IFS= read -r -d '' file; do
      local rel_path="${file#"$ROOT_DIR/"}"

      # Skip .example files
      [[ "$file" == *.example ]] && continue
      [[ "$file" == *.schema.json ]] && continue

      # Check if tracked by git
      if git -C "$ROOT_DIR" ls-files --error-unmatch "$rel_path" &>/dev/null; then
        add_violation "overlay-security" "$rel_path" "Non-example overlay file tracked in git"
        count=$((count + 1))
      fi
    done < <(find "$pack_root" -path "*/contexts/overlays/*.json" -print0 2>/dev/null)
  done

  [[ $count -gt 0 ]] && EXIT_CODE=1
  log "  Found $count overlay security violations"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  cd "$ROOT_DIR"

  if [[ "$JSON_OUTPUT" != true ]]; then
    echo "=== Topology Validation ==="
    echo "Mode: $MODE"
    echo ""
  fi

  check_hardcoded_addresses
  check_localhost
  check_chain_ids
  check_capability_metadata
  check_manifest_v3
  check_context_slots
  check_melange_references
  check_overlay_security

  # Output results
  if [[ "$JSON_OUTPUT" == true ]]; then
    local violations_json="["
    local first=true
    for v in "${VIOLATIONS[@]}"; do
      IFS='|' read -r check file detail <<< "$v"
      [[ "$first" == true ]] && first=false || violations_json+=","
      violations_json+="{\"check\":\"$check\",\"file\":\"$file\",\"detail\":\"$detail\"}"
    done
    violations_json+="]"

    echo "{\"exit_code\":$EXIT_CODE,\"violations\":${#VIOLATIONS[@]},\"warnings\":${#WARNINGS[@]},\"details\":$violations_json}"
  else
    echo ""
    echo "=== Results ==="

    if [[ ${#VIOLATIONS[@]} -eq 0 ]]; then
      echo -e "${GREEN}All 8 checks passed${NC}"
    else
      echo -e "${RED}${#VIOLATIONS[@]} violation(s) found:${NC}"
      echo ""
      for v in "${VIOLATIONS[@]}"; do
        IFS='|' read -r check file detail <<< "$v"
        echo -e "  ${RED}FAIL${NC} [$check] $file"
        echo "       $detail"
      done
    fi

    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
      echo ""
      echo -e "${YELLOW}${#WARNINGS[@]} warning(s):${NC}"
      for w in "${WARNINGS[@]}"; do
        IFS='|' read -r check file detail <<< "$w"
        echo -e "  ${YELLOW}WARN${NC} [$check] $file: $detail"
      done
    fi

    echo ""
    case $EXIT_CODE in
      0) echo -e "${GREEN}Exit code: 0 (pass)${NC}" ;;
      1) echo -e "${RED}Exit code: 1 (topology contamination)${NC}" ;;
      2) echo -e "${YELLOW}Exit code: 2 (missing metadata)${NC}" ;;
    esac
  fi

  exit $EXIT_CODE
}

main "$@"
