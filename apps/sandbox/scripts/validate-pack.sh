#!/usr/bin/env bash
# validate-pack.sh - Validate a skill pack's structure and manifest
#
# Usage: ./scripts/validate-pack.sh [pack_dir]
#        ./scripts/validate-pack.sh packs/artisan

set -euo pipefail

PACK_DIR="${1:-.}"

# Remove trailing slash if present
PACK_DIR="${PACK_DIR%/}"

echo "Validating pack: $PACK_DIR"

# 1. Check manifest.json exists
if [[ ! -f "$PACK_DIR/manifest.json" ]]; then
    echo "ERROR: manifest.json not found in $PACK_DIR"
    exit 1
fi

# 2. Validate JSON syntax
if ! jq empty "$PACK_DIR/manifest.json" 2>/dev/null; then
    echo "ERROR: manifest.json is not valid JSON"
    exit 1
fi
echo "  [OK] manifest.json is valid JSON"

# 3. Check required manifest fields
REQUIRED_FIELDS=("schema_version" "name" "slug" "version" "description")
for field in "${REQUIRED_FIELDS[@]}"; do
    if ! jq -e ".$field" "$PACK_DIR/manifest.json" >/dev/null 2>&1; then
        echo "ERROR: Missing required field '$field' in manifest.json"
        exit 1
    fi
done
echo "  [OK] All required manifest fields present"

# 4. Validate skill directories
SKILLS_DIR="$PACK_DIR/skills"
if [[ -d "$SKILLS_DIR" ]]; then
    skill_count=0
    for skill_dir in "$SKILLS_DIR"/*/; do
        [[ -d "$skill_dir" ]] || continue
        skill_name=$(basename "$skill_dir")
        skill_count=$((skill_count + 1))

        # Each skill must have index.yaml
        if [[ ! -f "$skill_dir/index.yaml" ]]; then
            echo "ERROR: Missing index.yaml in skill '$skill_name'"
            exit 1
        fi

        # Each skill must have SKILL.md
        if [[ ! -f "$skill_dir/SKILL.md" ]]; then
            echo "ERROR: Missing SKILL.md in skill '$skill_name'"
            exit 1
        fi
    done
    echo "  [OK] $skill_count skills validated"
else
    echo "  [WARN] No skills directory found"
fi

# 5. Extract and display pack info
pack_name=$(jq -r '.name' "$PACK_DIR/manifest.json")
pack_version=$(jq -r '.version' "$PACK_DIR/manifest.json")
echo ""
echo "Pack '$pack_name' v$pack_version is valid"
