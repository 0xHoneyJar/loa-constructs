#!/usr/bin/env bash
# check-gh-auth.sh - Verify GitHub CLI is authenticated
# Used as pre-flight check for Melange commands (/send, /inbox)

set -euo pipefail

# Check if gh is installed
if ! command -v gh &>/dev/null; then
  echo "GitHub CLI (gh) not found. Install: https://cli.github.com/" >&2
  exit 1
fi

# Check if gh is authenticated
if ! gh auth status &>/dev/null; then
  echo "GitHub CLI not authenticated. Run: gh auth login" >&2
  exit 1
fi

exit 0
