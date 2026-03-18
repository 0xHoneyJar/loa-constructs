#!/usr/bin/env bash
# =============================================================================
# loa-credentials.sh — Unified credential management for the construct ecosystem
# =============================================================================
# Single store: ~/.loa/credentials.json (chmod 600)
# Single accessor: construct-runtime.ts resolveCredential()
#
# Usage:
#   loa-credentials.sh status              # Show configured keys (names only)
#   loa-credentials.sh set KEY value       # Add or update a key
#   loa-credentials.sh delete KEY          # Remove a key
#   loa-credentials.sh import <.env>       # Import AI keys from a .env file
#   loa-credentials.sh get KEY             # Print value (for piping)
#   loa-credentials.sh test                # Verify keys work (dry-run API calls)
#
# The cascade (in construct-runtime.ts resolveCredential):
#   1. Shell environment (process.env)
#   2. Project .env file (walk-up from cwd)
#   3. ~/.loa/credentials.json (this store)
#
# Keys are never logged to stdout except via explicit 'get'.
# =============================================================================

set -euo pipefail

CRED_FILE="${HOME}/.loa/credentials.json"

# Known AI provider keys — used for import filtering and test routing
AI_KEYS=(
  GEMINI_API_KEY GOOGLE_API_KEY
  OPENAI_API_KEY
  ANTHROPIC_API_KEY
  FIRECRAWL_API_KEY
  PERPLEXITY_API_KEY
  FAL_KEY
)

# =============================================================================
# Helpers
# =============================================================================

ensure_store() {
  mkdir -p "$(dirname "$CRED_FILE")"
  if [[ ! -f "$CRED_FILE" ]]; then
    echo '{}' > "$CRED_FILE"
  fi
  chmod 600 "$CRED_FILE"
}

read_store() {
  ensure_store
  cat "$CRED_FILE"
}

write_store() {
  local json="$1"
  ensure_store
  echo "$json" > "$CRED_FILE"
  chmod 600 "$CRED_FILE"
}

mask_value() {
  local val="$1"
  local len=${#val}
  if [[ $len -le 8 ]]; then
    echo "****"
  else
    echo "${val:0:4}...${val: -4}"
  fi
}

# =============================================================================
# Commands
# =============================================================================

cmd_status() {
  ensure_store
  local store
  store=$(read_store)
  local count
  count=$(echo "$store" | jq 'to_entries | map(select(.value | type == "string" and length > 0)) | length')

  echo "Credential store: $CRED_FILE"
  echo "Keys configured: $count"
  echo ""

  if [[ "$count" -eq 0 ]]; then
    echo "  (empty — run 'loa-credentials.sh import <.env>' to populate)"
    return
  fi

  echo "$store" | jq -r 'to_entries[] | select(.value | type == "string" and length > 0) | .key' | while read -r key; do
    local val
    val=$(echo "$store" | jq -r --arg k "$key" '.[$k]')
    local masked
    masked=$(mask_value "$val")
    printf "  %-24s %s\n" "$key" "$masked"
  done
}

cmd_set() {
  local key="$1"
  local value="$2"

  if [[ -z "$key" || -z "$value" ]]; then
    echo "Usage: loa-credentials.sh set KEY value" >&2
    exit 2
  fi

  local store
  store=$(read_store)
  local updated
  updated=$(echo "$store" | jq --arg k "$key" --arg v "$value" '.[$k] = $v')
  write_store "$updated"
  echo "Set $key ($(mask_value "$value"))"
}

cmd_delete() {
  local key="$1"

  if [[ -z "$key" ]]; then
    echo "Usage: loa-credentials.sh delete KEY" >&2
    exit 2
  fi

  local store
  store=$(read_store)
  local updated
  updated=$(echo "$store" | jq --arg k "$key" 'del(.[$k])')
  write_store "$updated"
  echo "Deleted $key"
}

cmd_get() {
  local key="$1"

  if [[ -z "$key" ]]; then
    echo "Usage: loa-credentials.sh get KEY" >&2
    exit 2
  fi

  local store
  store=$(read_store)
  local val
  val=$(echo "$store" | jq -r --arg k "$key" '.[$k] // empty')

  if [[ -z "$val" ]]; then
    echo "Key not found: $key" >&2
    exit 1
  fi

  # Raw value to stdout (for piping)
  echo "$val"
}

cmd_import() {
  local env_file="$1"

  if [[ ! -f "$env_file" ]]; then
    echo "File not found: $env_file" >&2
    exit 2
  fi

  local store
  store=$(read_store)
  local imported=0

  while IFS= read -r line; do
    # Skip comments and empty lines
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$line" ]] && continue

    # Parse KEY=VALUE
    if [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)=(.*) ]]; then
      local key="${BASH_REMATCH[1]}"
      local value="${BASH_REMATCH[2]}"
      # Strip wrapping quotes
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"

      # Only import known AI/API keys (skip DATABASE_URL, NODE_ENV, etc.)
      local is_ai_key=false
      for ai_key in "${AI_KEYS[@]}"; do
        if [[ "$key" == "$ai_key" ]]; then
          is_ai_key=true
          break
        fi
      done

      # Also import anything with API_KEY or _KEY suffix
      if [[ "$key" == *"API_KEY"* || "$key" == *"_KEY" ]]; then
        is_ai_key=true
      fi

      if [[ "$is_ai_key" == "true" && -n "$value" && "$value" != "your-key-here" && "$value" != "sk_your_api_key_here" ]]; then
        store=$(echo "$store" | jq --arg k "$key" --arg v "$value" '.[$k] = $v')
        printf "  + %-24s %s\n" "$key" "$(mask_value "$value")"
        imported=$((imported + 1))
      fi
    fi
  done < "$env_file"

  if [[ $imported -gt 0 ]]; then
    write_store "$store"
    echo ""
    echo "Imported $imported key(s) from $env_file"
  else
    echo "No importable keys found in $env_file"
  fi
}

cmd_test() {
  local store
  store=$(read_store)
  local tested=0
  local passed=0

  echo "Testing credentials..."
  echo ""

  # Gemini
  local gemini_key
  gemini_key=$(echo "$store" | jq -r '.GEMINI_API_KEY // .GOOGLE_API_KEY // empty')
  if [[ -n "$gemini_key" ]]; then
    tested=$((tested + 1))
    printf "  %-20s " "Gemini"
    local resp
    resp=$(curl -s -o /dev/null -w "%{http_code}" \
      "https://generativelanguage.googleapis.com/v1beta/models?key=${gemini_key}" 2>/dev/null || echo "000")
    if [[ "$resp" == "200" ]]; then
      echo "OK"
      passed=$((passed + 1))
    else
      echo "FAIL (HTTP $resp)"
    fi
  fi

  # OpenAI
  local openai_key
  openai_key=$(echo "$store" | jq -r '.OPENAI_API_KEY // empty')
  if [[ -n "$openai_key" ]]; then
    tested=$((tested + 1))
    printf "  %-20s " "OpenAI"
    local resp
    resp=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer ${openai_key}" \
      "https://api.openai.com/v1/models" 2>/dev/null || echo "000")
    if [[ "$resp" == "200" ]]; then
      echo "OK"
      passed=$((passed + 1))
    else
      echo "FAIL (HTTP $resp)"
    fi
  fi

  # Anthropic
  local anthropic_key
  anthropic_key=$(echo "$store" | jq -r '.ANTHROPIC_API_KEY // empty')
  if [[ -n "$anthropic_key" ]]; then
    tested=$((tested + 1))
    printf "  %-20s " "Anthropic"
    local resp
    resp=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "x-api-key: ${anthropic_key}" \
      -H "anthropic-version: 2023-06-01" \
      "https://api.anthropic.com/v1/models" 2>/dev/null || echo "000")
    if [[ "$resp" == "200" ]]; then
      echo "OK"
      passed=$((passed + 1))
    else
      echo "FAIL (HTTP $resp)"
    fi
  fi

  echo ""
  echo "$passed/$tested passed"
}

# =============================================================================
# Dispatch
# =============================================================================

case "${1:-status}" in
  status)   cmd_status ;;
  set)      cmd_set "${2:-}" "${3:-}" ;;
  delete)   cmd_delete "${2:-}" ;;
  get)      cmd_get "${2:-}" ;;
  import)   cmd_import "${2:-}" ;;
  test)     cmd_test ;;
  --help|-h)
    echo "loa-credentials.sh — Unified credential management"
    echo ""
    echo "Commands:"
    echo "  status              Show configured keys"
    echo "  set KEY value       Add or update a key"
    echo "  delete KEY          Remove a key"
    echo "  import <.env>       Import AI keys from .env file"
    echo "  get KEY             Print value (for piping)"
    echo "  test                Verify keys work"
    echo ""
    echo "Store: ~/.loa/credentials.json"
    echo "Accessor: construct-runtime.ts resolveCredential()"
    ;;
  *)
    echo "Unknown command: $1 (try --help)" >&2
    exit 2
    ;;
esac
