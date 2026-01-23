#!/usr/bin/env bash
# Melange Protocol - Setup/Validation Script
# Called by Melange skills on first use when auto_install: true
#
# Usage:
#   ./melange-setup.sh check     # Check if Melange is installed
#   ./melange-setup.sh install   # Install Melange workflows
#   ./melange-setup.sh status    # Show full status

set -euo pipefail

# === Colors ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# === Configuration ===
CONFIG_FILE=".loa.config.yaml"
MELANGE_URL="https://raw.githubusercontent.com/0xHoneyJar/loa-constructs/main/melange"

# === Helpers ===
log() { echo -e "${GREEN}[melange]${NC} $*"; }
warn() { echo -e "${YELLOW}[melange]${NC} $*"; }
err() { echo -e "${RED}[melange]${NC} $*" >&2; }

# yq compatibility
yq_read() {
  local file="$1"
  local path="$2"
  local default="${3:-}"

  if yq --version 2>&1 | grep -q "mikefarah"; then
    yq eval "${path} // \"${default}\"" "$file" 2>/dev/null
  else
    yq -r "${path} // \"${default}\"" "$file" 2>/dev/null
  fi
}

# === Check if Melange is enabled ===
check_enabled() {
  if [[ ! -f "$CONFIG_FILE" ]]; then
    err "Config file not found: $CONFIG_FILE"
    return 1
  fi

  local enabled
  enabled=$(yq_read "$CONFIG_FILE" ".melange.enabled" "false")

  if [[ "$enabled" != "true" ]]; then
    err "Melange is disabled in config. Set melange.enabled: true"
    return 1
  fi

  return 0
}

# === Check if workflows are installed ===
check_workflows() {
  local missing=0

  if [[ ! -f ".github/workflows/melange-notify.yml" ]]; then
    missing=1
  fi

  if [[ ! -f ".github/workflows/melange-resolve.yml" ]]; then
    missing=1
  fi

  return $missing
}

# === Check if labels exist ===
check_labels() {
  local repo
  repo=$(yq_read "$CONFIG_FILE" ".melange.construct.repo" "")

  if [[ -z "$repo" ]]; then
    return 1
  fi

  # Check for melange label
  if gh label list --repo "$repo" --json name -q '.[].name' 2>/dev/null | grep -q "^melange$"; then
    return 0
  fi

  return 1
}

# === Install Melange ===
install() {
  log "Installing Melange Protocol v2..."

  # Create directories
  mkdir -p .github/workflows
  mkdir -p .github/ISSUE_TEMPLATE

  # Download workflows
  log "Downloading workflows..."
  curl -sfL "$MELANGE_URL/.github/workflows/melange-notify.yml" -o .github/workflows/melange-notify.yml || {
    err "Failed to download melange-notify.yml"
    return 1
  }

  curl -sfL "$MELANGE_URL/.github/workflows/melange-resolve.yml" -o .github/workflows/melange-resolve.yml || {
    err "Failed to download melange-resolve.yml"
    return 1
  }

  # Download issue template (optional)
  curl -sfL "$MELANGE_URL/.github/ISSUE_TEMPLATE/melange.yml" -o .github/ISSUE_TEMPLATE/melange.yml 2>/dev/null || true

  log "Workflows installed"

  # Create labels
  local repo
  repo=$(yq_read "$CONFIG_FILE" ".melange.construct.repo" "")

  if [[ -n "$repo" ]]; then
    log "Creating labels in $repo..."

    # Download and run label script
    local label_script
    label_script=$(mktemp)
    curl -sfL "$MELANGE_URL/scripts/create-labels.sh" -o "$label_script"
    chmod +x "$label_script"

    # Get constructs from config or use defaults
    local constructs
    constructs=$(yq_read "$CONFIG_FILE" ".melange.known_constructs | join(\" \")" "sigil loa loa-constructs hivemind ruggy")

    bash "$label_script" "$repo" $constructs 2>/dev/null || warn "Some labels may already exist"
    rm -f "$label_script"
  fi

  log "Melange Protocol v2 installed successfully"
  echo ""
  echo "Next steps:"
  echo "  1. Commit and push the workflow files"
  echo "  2. Set Discord webhook: gh secret set MELANGE_DISCORD_WEBHOOK"
  echo "  3. Use /send, /inbox, /threads commands"

  return 0
}

# === Show status ===
status() {
  echo ""
  echo "Melange Protocol Status"
  echo "========================"

  # Check enabled
  if check_enabled 2>/dev/null; then
    echo -e "Config:     ${GREEN}enabled${NC}"
  else
    echo -e "Config:     ${RED}disabled${NC}"
  fi

  # Check workflows
  if check_workflows 2>/dev/null; then
    echo -e "Workflows:  ${GREEN}installed${NC}"
  else
    echo -e "Workflows:  ${YELLOW}not installed${NC}"
  fi

  # Check labels
  if check_labels 2>/dev/null; then
    echo -e "Labels:     ${GREEN}created${NC}"
  else
    echo -e "Labels:     ${YELLOW}not found${NC}"
  fi

  # Show construct info
  local construct_name
  construct_name=$(yq_read "$CONFIG_FILE" ".melange.construct.name" "")
  if [[ -n "$construct_name" ]]; then
    echo -e "Construct:  ${CYAN}$construct_name${NC}"
  fi

  echo ""
}

# === Main ===
case "${1:-check}" in
  check)
    check_enabled || exit 1
    check_workflows || {
      auto_install=$(yq_read "$CONFIG_FILE" ".melange.auto_install" "false")
      if [[ "$auto_install" == "true" ]]; then
        warn "Workflows not found. Auto-installing..."
        install
      else
        err "Melange workflows not installed. Run: .claude/scripts/melange-setup.sh install"
        exit 1
      fi
    }
    log "Melange is ready"
    ;;
  install)
    check_enabled || exit 1
    install
    ;;
  status)
    status
    ;;
  *)
    echo "Usage: $0 {check|install|status}"
    exit 1
    ;;
esac
