#!/usr/bin/env bash
# =============================================================================
# validate-mcp-deps.sh - Validate MCP dependencies resolve against registry
# =============================================================================
# Usage:
#   validate-mcp-deps.sh           # Validate all packs
#   validate-mcp-deps.sh --json    # JSON output
#
# Checks:
#   1. All pack mcp_dependencies keys exist in mcp-registry.yaml
#   2. All skill integrations names exist in mcp-registry.yaml
#   3. required_scopes are subsets of registry scopes
#
# Requires: yq (mikefarah/yq), jq

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REGISTRY="$ROOT_DIR/.claude/mcp-registry.yaml"
PACKS_DIR="$ROOT_DIR/apps/sandbox/packs"
JSON_MODE=false

[[ "${1:-}" == "--json" ]] && JSON_MODE=true

# Check dependencies
for cmd in yq jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd is required but not installed"
    exit 2
  fi
done

if [[ ! -f "$REGISTRY" ]]; then
  echo "ERROR: MCP registry not found at $REGISTRY"
  exit 2
fi

# Get known server keys from registry
KNOWN_SERVERS=$(yq '.servers | keys | .[]' "$REGISTRY" 2>/dev/null)

errors=0
warnings=0

log_error() {
  if [[ "$JSON_MODE" == false ]]; then
    echo "  ERROR: $1"
  fi
  ((errors++)) || true
}

log_warn() {
  if [[ "$JSON_MODE" == false ]]; then
    echo "  WARN:  $1"
  fi
  ((warnings++)) || true
}

log_pass() {
  if [[ "$JSON_MODE" == false ]]; then
    echo "  PASS:  $1"
  fi
}

echo "Validating MCP dependencies against registry..."
echo ""

# Check 1: Pack-level mcp_dependencies
for pack_dir in "$PACKS_DIR"/*/; do
  [[ -d "$pack_dir" ]] || continue
  pack_name=$(basename "$pack_dir")
  manifest="$pack_dir/manifest.json"

  [[ -f "$manifest" ]] || continue

  # Check if pack has mcp_dependencies
  deps=$(jq -r '.mcp_dependencies // {} | keys[]' "$manifest" 2>/dev/null) || deps=""

  if [[ -z "$deps" ]]; then
    log_pass "$pack_name — no MCP dependencies"
    continue
  fi

  for dep in $deps; do
    if ! echo "$KNOWN_SERVERS" | grep -qx "$dep"; then
      required=$(jq -r ".mcp_dependencies.\"$dep\".required // false" "$manifest")
      if [[ "$required" == "true" ]]; then
        log_error "$pack_name — required MCP dependency '$dep' not found in registry"
      else
        log_warn "$pack_name — optional MCP dependency '$dep' not found in registry"
      fi
      continue
    fi

    # Check scopes are subsets
    required_scopes=$(jq -r ".mcp_dependencies.\"$dep\".required_scopes // [] | .[]" "$manifest" 2>/dev/null) || required_scopes=""
    registry_scopes=$(yq ".servers.\"$dep\".scopes[]" "$REGISTRY" 2>/dev/null) || registry_scopes=""

    if [[ -n "$required_scopes" ]]; then
      for scope in $required_scopes; do
        if ! echo "$registry_scopes" | grep -qx "$scope"; then
          log_warn "$pack_name — scope '$scope' for '$dep' not found in registry scopes"
        fi
      done
    fi

    log_pass "$pack_name — '$dep' dependency resolves"
  done
done

echo ""

# Check 2: Skill-level integrations
echo "Validating skill integrations..."
echo ""

for pack_dir in "$PACKS_DIR"/*/; do
  [[ -d "$pack_dir" ]] || continue
  pack_name=$(basename "$pack_dir")
  skills_dir="$pack_dir/skills"
  [[ -d "$skills_dir" ]] || continue

  for skill_dir in "$skills_dir"/*/; do
    [[ -d "$skill_dir" ]] || continue
    skill_name=$(basename "$skill_dir")
    index_yaml="$skill_dir/index.yaml"

    [[ -f "$index_yaml" ]] || continue

    # Extract integration names (optional + required)
    integrations=$(yq '
      (.integrations.optional // [] | .[].name),
      (.integrations.required // [] | .[].name)
    ' "$index_yaml" 2>/dev/null | grep -v "^null$" | grep -v "^$") || integrations=""

    if [[ -z "$integrations" ]]; then
      continue
    fi

    for integration in $integrations; do
      if ! echo "$KNOWN_SERVERS" | grep -qx "$integration"; then
        log_warn "$pack_name/$skill_name — integration '$integration' not in registry"
      fi
    done
  done
done

echo ""
echo "MCP Dependency Validation Summary"
echo "================================="
echo "  Errors:   $errors"
echo "  Warnings: $warnings"
echo ""

if [[ $errors -gt 0 ]]; then
  echo "FAILED: $errors unresolvable required dependencies"
  exit 1
fi

echo "All MCP dependencies resolve."
exit 0
