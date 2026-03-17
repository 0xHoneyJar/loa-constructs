#!/bin/bash
# Sync grimoires/network/ → apps/docs/ content directories
# Transforms [[wiki-links]] to VitePress-compatible [links](./path)

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SRC="$REPO_ROOT/grimoires/network"
DOCS="$REPO_ROOT/apps/docs"

# Create target directories
mkdir -p "$DOCS/constructs"
mkdir -p "$DOCS/architecture"
mkdir -p "$DOCS/verification"
mkdir -p "$DOCS/network"

# Map structural files to sections
declare -A SECTION_MAP
SECTION_MAP[_ecs]="architecture"
SECTION_MAP[_topology]="architecture"
SECTION_MAP[_echelon]="verification"
SECTION_MAP[_verification-guide]="verification"
SECTION_MAP[_health]="network"
SECTION_MAP[_operator]="network"
SECTION_MAP[_personas]="network"
SECTION_MAP[_audit-2026-03-17]="network"
SECTION_MAP[_index]="network"

# Function to transform wiki-links and clean content for VitePress
transform_file() {
  local src="$1"
  local dest="$2"

  sed -E '
    # Transform structural wiki-links FIRST (more specific patterns)
    s/\[\[_ecs\]\]/[ECS Architecture](\/architecture\/ecs)/g
    s/\[\[_topology\]\]/[Topology](\/architecture\/topology)/g
    s/\[\[_echelon\]\]/[Echelon](\/verification\/echelon)/g
    s/\[\[_verification-guide\]\]/[Verification Guide](\/verification\/verification-guide)/g
    s/\[\[_health\]\]/[Network Health](\/network\/health)/g
    s/\[\[_operator\]\]/[Operator OS](\/network\/operator)/g
    s/\[\[_personas\]\]/[Personas](\/network\/personas)/g
    s/\[\[_audit-2026-03-17\]\]/[Network Audit](\/network\/audit-2026-03-17)/g
    s/\[\[_index\]\]/[Index](\/network\/)/g

    # Transform construct wiki-links (no underscore prefix)
    s/\[\[([a-z][a-z0-9-]*)\]\]/[\1](\/constructs\/\1)/g

    # Transform any remaining [[path/to/thing]] as plain text links
    s/\[\[([^\]]+)\]\]/[\1]/g
  ' "$src" > "$dest"
}

# Sync construct files (no underscore prefix)
for f in "$SRC"/[a-z]*.md; do
  name=$(basename "$f" .md)
  transform_file "$f" "$DOCS/constructs/$name.md"
done

# Sync structural files to their sections
for key in "${!SECTION_MAP[@]}"; do
  section="${SECTION_MAP[$key]}"
  src_file="$SRC/${key}.md"
  # Remove underscore prefix for the destination filename
  dest_name="${key#_}"
  if [ -f "$src_file" ]; then
    transform_file "$src_file" "$DOCS/$section/$dest_name.md"
  fi
done

# Count results
construct_count=$(ls "$DOCS/constructs/"*.md 2>/dev/null | wc -l | tr -d ' ')
arch_count=$(ls "$DOCS/architecture/"*.md 2>/dev/null | wc -l | tr -d ' ')
verif_count=$(ls "$DOCS/verification/"*.md 2>/dev/null | wc -l | tr -d ' ')
net_count=$(ls "$DOCS/network/"*.md 2>/dev/null | wc -l | tr -d ' ')

echo "Synced $construct_count construct pages → constructs/"
echo "Synced $arch_count architecture pages → architecture/"
echo "Synced $verif_count verification pages → verification/"
echo "Synced $net_count network pages → network/"
