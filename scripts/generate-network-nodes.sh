#!/usr/bin/env bash
# Generate Obsidian-navigable markdown nodes for each construct
# Each file becomes a node in the Obsidian graph view
# Wiki-links ([[target]]) create edges that the graph renders

set -euo pipefail

NETWORK_DIR="grimoires/network"
CACHE_DIR=".cache/construct-repos"

# Ensure network dir exists
mkdir -p "$NETWORK_DIR"

# Helper: extract yaml value (simple single-line)
yaml_val() {
  local file="$1" key="$2"
  grep "^${key}:" "$file" 2>/dev/null | head -1 | sed "s/^${key}:[[:space:]]*//" | sed 's/^"//' | sed 's/"$//' || true
}

# Helper: extract yaml list items — handles both simple (- value) and object (- slug: value)
yaml_list() {
  local file="$1" key="$2"
  awk "/^${key}:/{found=1; next} found && /^  - /{line=\$0; gsub(/^  - /,\"\",line); print line} found && /^[^ ]/{found=0}" "$file" | sed 's/^slug: //' | sed 's/^name: //' | sed 's/ .*//'
}

# Helper: extract nested list under a parent key (e.g. composition_paths.reads)
yaml_nested_list() {
  local file="$1" parent="$2" key="$3"
  awk "/^${parent}:/{p=1; next} p && /^  ${key}:/{found=1; next} found && /^    -/{line=\$0; gsub(/^    - /,\"\",line); print line} found && /^  [^ ]/{found=0} p && /^[^ ]/{p=0; found=0}" "$file"
}

generate_node() {
  local slug="$1"
  local repo_dir="${CACHE_DIR}/construct-${slug}"
  local manifest=""
  local output="${NETWORK_DIR}/${slug}.md"

  # Find manifest
  if [[ -f "${repo_dir}/construct.yaml" ]]; then
    manifest="${repo_dir}/construct.yaml"
  elif [[ -f "${repo_dir}/manifest.json" ]]; then
    # Legacy — minimal info
    cat > "$output" << LEGACY
---
name: $(basename "$repo_dir" | sed 's/construct-//')
slug: ${slug}
version: "1.0.0"
category: design
schema_version: 1
tags:
  - construct
  - category/design
  - schema/legacy
---

# ${slug}

> ⚠ Legacy construct — still on \`manifest.json\` schema_version 1. Needs migration to \`construct.yaml\` v3.

## Relationships

None declared (island).

## Status

- Schema: v1 (legacy)
- No governance, no dependencies, no composition edges
- See [[_health]] SCH-001
LEGACY
    echo "  generated (legacy): ${slug}"
    return
  else
    echo "  SKIP (no manifest): ${slug}"
    return
  fi

  local name version description schema_version
  name=$(yaml_val "$manifest" "name")
  version=$(yaml_val "$manifest" "version")
  description=$(yaml_val "$manifest" "description")
  schema_version=$(yaml_val "$manifest" "schema_version")

  # Category from domain list or category field
  local category
  category=$(yaml_list "$manifest" "domain" | head -1)
  if [[ -z "$category" ]]; then
    category=$(yaml_val "$manifest" "category")
  fi
  category="${category:-unknown}"

  # Map legacy categories
  case "$category" in
    gtm) category="marketing" ;;
    web3) category="development" ;;
    observability) category="analytics" ;;
    game-design) category="design" ;;
    aesthetics) category="design" ;;
    communication) category="documentation" ;;
  esac

  local construct_type
  construct_type=$(yaml_val "$manifest" "type")
  construct_type="${construct_type:-untyped}"

  # Relationships
  local governs governed_by depends_on composes_with
  governs=$(yaml_list "$manifest" "governs")
  governed_by=$(yaml_val "$manifest" "governed_by")
  composes_with=$(yaml_list "$manifest" "compose_with")
  if [[ -z "$composes_with" ]]; then
    composes_with=$(yaml_list "$manifest" "composes_with")
  fi

  # Dependencies — can be simple list or objects with name/slug/optional
  depends_on=$(yaml_list "$manifest" "pack_dependencies" 2>/dev/null || true)

  # Skill count
  local skill_count cmd_count
  skill_count=$(find "${repo_dir}/skills/" -name "index.yaml" 2>/dev/null | wc -l | tr -d ' ' || echo "0")
  cmd_count=$(yaml_list "$manifest" "commands" 2>/dev/null | wc -l | tr -d ' ' || echo "0")

  # Composition paths
  local reads writes
  reads=$(yaml_nested_list "$manifest" "composition_paths" "reads" 2>/dev/null || true)
  writes=$(yaml_nested_list "$manifest" "composition_paths" "writes" 2>/dev/null || true)

  # Build tags
  local tags="  - construct\n  - category/${category}"
  if [[ -n "$governs" ]]; then
    tags="${tags}\n  - governance/root"
  fi
  if [[ -n "$governed_by" ]]; then
    tags="${tags}\n  - governance/governed"
  fi
  if [[ "$construct_type" != "untyped" ]]; then
    tags="${tags}\n  - type/${construct_type}"
  fi

  # Check if it's an island
  local is_island=true
  [[ -n "$governs" || -n "$governed_by" || -n "$depends_on" || -n "$composes_with" ]] && is_island=false
  if $is_island; then
    tags="${tags}\n  - topology/island"
  fi

  # Build relationships section
  local rels=""

  if [[ -n "$governed_by" ]]; then
    rels="${rels}\n### Governed By\n- [[${governed_by}]]\n"
  fi

  if [[ -n "$governs" ]]; then
    rels="${rels}\n### Governs\n"
    while IFS= read -r g; do
      [[ -n "$g" ]] && rels="${rels}- [[${g}]]\n"
    done <<< "$governs"
  fi

  if [[ -n "$depends_on" ]]; then
    rels="${rels}\n### Depends On\n"
    while IFS= read -r d; do
      [[ -n "$d" ]] && rels="${rels}- [[${d}]]\n"
    done <<< "$depends_on"
  fi

  if [[ -n "$composes_with" ]]; then
    rels="${rels}\n### Composes With\n"
    while IFS= read -r c; do
      [[ -n "$c" ]] && rels="${rels}- [[${c}]]\n"
    done <<< "$composes_with"
  fi

  if [[ -z "$rels" ]]; then
    rels="\nNo declared relationships. See [[_topology]] Islands section.\n"
  fi

  # Build composition paths section
  local paths=""
  if [[ -n "$reads" || -n "$writes" ]]; then
    paths="\n## Composition Paths\n"
    if [[ -n "$reads" ]]; then
      paths="${paths}\n**Reads from:**\n"
      while IFS= read -r r; do
        [[ -n "$r" ]] && paths="${paths}- \`${r}\`\n"
      done <<< "$reads"
    fi
    if [[ -n "$writes" ]]; then
      paths="${paths}\n**Writes to:**\n"
      while IFS= read -r w; do
        [[ -n "$w" ]] && paths="${paths}- \`${w}\`\n"
      done <<< "$writes"
    fi
  fi

  # Write the file
  printf -- "---
name: ${name}
slug: ${slug}
version: \"${version}\"
category: ${category}
type: ${construct_type}
schema_version: ${schema_version}
skills: ${skill_count}
commands: ${cmd_count}
tags:
$(echo -e "$tags")
---

# ${name}

> ${description}

**Version**: ${version} · **Category**: ${category} · **Skills**: ${skill_count} · **Commands**: ${cmd_count}

## Relationships
$(echo -e "$rels")$(echo -e "$paths")
## Source

- Repo: \`0xHoneyJar/construct-${slug}\`
- Cache: \`.cache/construct-repos/construct-${slug}/\`
- Grimoire: \`grimoires/${slug}/\` (if exists)

## Navigation

← [[_index]] · [[_topology]] · [[_health]]
" > "$output"

  echo "  generated: ${slug} (${name})"
}

echo "Generating construct network nodes..."
echo ""

# All 23 constructs
for repo_dir in ${CACHE_DIR}/construct-*; do
  slug=$(basename "$repo_dir" | sed 's/construct-//')
  generate_node "$slug"
done

echo ""
echo "Done. $(ls ${NETWORK_DIR}/*.md 2>/dev/null | wc -l | tr -d ' ') files in ${NETWORK_DIR}/"
echo "Open Obsidian → Graph View (Cmd+G) to see the topology."
