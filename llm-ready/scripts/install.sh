#!/bin/bash
#
# install.sh - Install llm-ready pack for a project
#
# Usage:
#   ./install.sh [PROJECT_ROOT]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACK_DIR="$(dirname "$SCRIPT_DIR")"

PROJECT_ROOT="${1:-.}"

echo "╭───────────────────────────────────────────────────────╮"
echo "│  LLM-READY PACK INSTALLER                             │"
echo "╰───────────────────────────────────────────────────────╯"
echo ""

# Create grimoire structure
GRIMOIRE_DIR="$PROJECT_ROOT/grimoires/llm-ready"
mkdir -p "$GRIMOIRE_DIR/audits"
mkdir -p "$GRIMOIRE_DIR/exports"
mkdir -p "$GRIMOIRE_DIR/optimizations"

echo "✓ Created grimoire structure at $GRIMOIRE_DIR"

# Initialize state.yaml if not exists
STATE_FILE="$GRIMOIRE_DIR/state.yaml"
if [ ! -f "$STATE_FILE" ]; then
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    cat > "$STATE_FILE" << YAML
# LLM-Ready State
# Tracks audits, exports, and optimizations

version: "1.0.0"
initialized: "$TIMESTAMP"
last_activity: null

audits:
  count: 0
  last_audit: null
  pages: {}

exports:
  count: 0
  last_generation: null
  pages: {}

optimizations:
  count: 0
  last_optimization: null
  pages: {}
YAML
    echo "✓ Initialized state.yaml"
else
    echo "✓ Preserved existing state.yaml"
fi

echo ""
echo "╭───────────────────────────────────────────────────────╮"
echo "│  INSTALLATION COMPLETE                                │"
echo "╰───────────────────────────────────────────────────────╯"
echo ""
echo "Available commands:"
echo "  /audit-llm [path]           - Audit page for LLM trust signals"
echo "  /add-markdown [path]        - Add markdown export capability"
echo "  /optimize-chunks [path]     - Optimize content for AI retrieval"
echo ""
echo "Quick start:"
echo "  1. /audit-llm /pricing      # Audit a page"
echo "  2. /optimize-chunks /pricing # Fix weak content"
echo "  3. /add-markdown /pricing   # Add markdown export"
echo ""
echo "Grimoire location: $GRIMOIRE_DIR"
echo ""
