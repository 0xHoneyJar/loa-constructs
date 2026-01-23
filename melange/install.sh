#!/usr/bin/env bash
# Melange Protocol v2 - Install Script
# One-command install for any Loa-powered Construct
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/0xHoneyJar/loa-constructs/main/melange/install.sh | bash
#
# Or with options:
#   ./install.sh --repo myorg/myrepo --construct myname

set -euo pipefail

# === Colors ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[melange]${NC} $*"; }
warn() { echo -e "${YELLOW}[melange]${NC} $*"; }
err() { echo -e "${RED}[melange]${NC} ERROR: $*" >&2; exit 1; }
info() { echo -e "${CYAN}[melange]${NC} $*"; }

# === Configuration ===
MELANGE_URL="https://raw.githubusercontent.com/0xHoneyJar/loa-constructs/main/melange"
REGISTRY_API="https://loa-constructs-api.fly.dev/v1"
REPO=""
CONSTRUCT=""
SKIP_LABELS=false
SKIP_SECRET=false

# === Argument Parsing ===
while [[ $# -gt 0 ]]; do
  case $1 in
    --repo)
      REPO="$2"
      shift 2
      ;;
    --construct)
      CONSTRUCT="$2"
      shift 2
      ;;
    --skip-labels)
      SKIP_LABELS=true
      shift
      ;;
    --skip-secret)
      SKIP_SECRET=true
      shift
      ;;
    -h|--help)
      echo "Melange Protocol v2 - Install Script"
      echo ""
      echo "Usage: ./install.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --repo OWNER/REPO     Target repository (auto-detected if in git repo)"
      echo "  --construct NAME      Construct name for this repo"
      echo "  --skip-labels         Don't create GitHub labels"
      echo "  --skip-secret         Don't prompt for Discord webhook secret"
      echo "  -h, --help            Show this help"
      exit 0
      ;;
    *)
      warn "Unknown option: $1"
      shift
      ;;
  esac
done

# === Pre-flight Checks ===
command -v gh >/dev/null 2>&1 || err "GitHub CLI (gh) not found. Install: https://cli.github.com/"
command -v curl >/dev/null 2>&1 || err "curl not found"

# Auto-detect repo if not provided
if [[ -z "$REPO" ]]; then
  if git rev-parse --git-dir >/dev/null 2>&1; then
    REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null) || true
  fi
  if [[ -z "$REPO" ]]; then
    err "Could not detect repository. Use --repo OWNER/REPO"
  fi
fi

log "Installing Melange Protocol v2 to $REPO"

# === Fetch Constructs from Registry ===
info "Fetching construct list from registry..."
CONSTRUCTS=$(curl -sf "$REGISTRY_API/constructs" | jq -r '.constructs[].name' 2>/dev/null) || {
  warn "Could not fetch from registry, using defaults"
  CONSTRUCTS="sigil loa loa-constructs hivemind ruggy"
}
log "Found constructs: $(echo $CONSTRUCTS | tr '\n' ' ')"

# === Create Directories ===
mkdir -p .github/workflows
mkdir -p .github/ISSUE_TEMPLATE

# === Download Workflow Files ===
info "Downloading workflow files..."

curl -sfL "$MELANGE_URL/.github/workflows/melange-notify.yml" -o .github/workflows/melange-notify.yml || {
  err "Failed to download melange-notify.yml"
}
log "Downloaded melange-notify.yml"

curl -sfL "$MELANGE_URL/.github/workflows/melange-resolve.yml" -o .github/workflows/melange-resolve.yml || {
  err "Failed to download melange-resolve.yml"
}
log "Downloaded melange-resolve.yml"

# === Download Issue Template ===
curl -sfL "$MELANGE_URL/.github/ISSUE_TEMPLATE/melange.yml" -o .github/ISSUE_TEMPLATE/melange.yml || {
  warn "Failed to download issue template (optional)"
}
log "Downloaded issue template"

# === Create Labels ===
if [[ "$SKIP_LABELS" != "true" ]]; then
  info "Creating GitHub labels..."

  # Download and run label script
  LABEL_SCRIPT=$(mktemp)
  curl -sfL "$MELANGE_URL/scripts/create-labels.sh" -o "$LABEL_SCRIPT"
  chmod +x "$LABEL_SCRIPT"

  # Run with constructs
  bash "$LABEL_SCRIPT" "$REPO" $CONSTRUCTS || warn "Some labels may already exist"
  rm -f "$LABEL_SCRIPT"
fi

# === Set Discord Webhook Secret ===
if [[ "$SKIP_SECRET" != "true" ]]; then
  echo ""
  info "Discord webhook setup required for notifications."
  echo -e "${CYAN}To get a webhook URL:${NC}"
  echo "  1. Open Discord → Server Settings → Integrations → Webhooks"
  echo "  2. Create new webhook for your Melange channel"
  echo "  3. Copy the webhook URL"
  echo ""
  read -p "Enter Discord webhook URL (or press Enter to skip): " WEBHOOK_URL

  if [[ -n "$WEBHOOK_URL" ]]; then
    gh secret set MELANGE_DISCORD_WEBHOOK --repo "$REPO" --body "$WEBHOOK_URL" || {
      warn "Failed to set secret. Run manually:"
      echo "  gh secret set MELANGE_DISCORD_WEBHOOK --repo $REPO"
    }
    log "Discord webhook secret configured"
  else
    warn "Skipped webhook setup. Discord notifications won't work until configured."
    echo "  Run: gh secret set MELANGE_DISCORD_WEBHOOK --repo $REPO"
  fi
fi

# === Update .loa.config.yaml if exists ===
if [[ -f ".loa.config.yaml" ]]; then
  if ! grep -q "^construct:" .loa.config.yaml; then
    info "Adding construct block to .loa.config.yaml..."

    # Determine construct name
    if [[ -z "$CONSTRUCT" ]]; then
      CONSTRUCT=$(basename "$REPO")
    fi

    cat >> .loa.config.yaml << EOF

# =============================================================================
# Construct Identity (Melange Protocol)
# =============================================================================
construct:
  name: $CONSTRUCT
  operator: $(gh api user --jq '.login' 2>/dev/null || echo "your-name")
  repo: $REPO
  org: $(dirname "$REPO")
  known_constructs:
    - loa
    - loa-constructs
    - sigil
    - hivemind
    - ruggy
    - human
EOF
    log "Added construct identity to config"
  else
    log "Construct block already exists in config"
  fi
fi

# === Summary ===
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Melange Protocol v2 installed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo "Files created:"
echo "  • .github/workflows/melange-notify.yml"
echo "  • .github/workflows/melange-resolve.yml"
echo "  • .github/ISSUE_TEMPLATE/melange.yml"
echo ""
echo "Next steps:"
echo "  1. Commit and push the new files"
echo "  2. Use /send <construct> \"message\" to send feedback"
echo "  3. Use /inbox to triage incoming Issues"
echo ""
if [[ "$SKIP_SECRET" == "true" ]] || [[ -z "${WEBHOOK_URL:-}" ]]; then
  echo -e "${YELLOW}⚠ Discord webhook not configured. Run:${NC}"
  echo "  gh secret set MELANGE_DISCORD_WEBHOOK --repo $REPO"
  echo ""
fi
