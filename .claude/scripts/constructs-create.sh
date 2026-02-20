#!/usr/bin/env bash
# =============================================================================
# Loa Constructs - Scaffold Script
# =============================================================================
# Create new construct projects from templates.
#
# Usage:
#   constructs-create.sh new --name <name> --type <type>   # Scaffold new construct
#   constructs-create.sh init --type <type>                # Initialize current directory
#
# Exit Codes:
#   0 = success
#   1 = general error
#   3 = directory already exists
#   5 = validation error
#
# @see grimoires/loa/sdd.md §5.6 Construct Scaffolding
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared library
if [[ -f "$SCRIPT_DIR/constructs-lib.sh" ]]; then
    source "$SCRIPT_DIR/constructs-lib.sh"
else
    echo "ERROR: constructs-lib.sh not found" >&2
    exit 1
fi

# =============================================================================
# Exit Codes
# =============================================================================

EXIT_SUCCESS=0
EXIT_ERROR=1
EXIT_EXISTS=3
EXIT_VALIDATION=5

# =============================================================================
# Constants
# =============================================================================

VALID_TYPES=("skill-pack" "tool-pack" "codex" "template")

# =============================================================================
# Helpers
# =============================================================================

# Derive slug from name: lowercase, replace spaces/underscores with hyphens
derive_slug() {
    local name="$1"
    echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' _' '-' | sed 's/[^a-z0-9-]//g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//'
}

# Validate construct type
validate_type() {
    local type="$1"
    for valid in "${VALID_TYPES[@]}"; do
        if [[ "$type" == "$valid" ]]; then
            return 0
        fi
    done
    return 1
}

# Generate construct.yaml for a given type
generate_manifest() {
    local slug="$1"
    local name="$2"
    local type="$3"
    local dir="$4"

    cat > "$dir/construct.yaml" << YAML
# Construct Manifest
# @see https://constructs.network/docs/manifest
name: "$name"
slug: "$slug"
version: "0.1.0"
type: "$type"
description: "TODO: Add description"
license: "MIT"

schema_version: 3
tier: free
YAML

    case "$type" in
        skill-pack)
            cat >> "$dir/construct.yaml" << 'YAML'

skills:
  - name: example
    description: "Example skill"

commands: []

pack_dependencies: {}

capabilities:
  model_tier: sonnet
  danger_level: safe
  effort_hint: small
  execution_hint: parallel
  requires:
    native_runtime: false
    tool_calling: true
    thinking_traces: false
    vision: false
YAML
            ;;
        tool-pack)
            cat >> "$dir/construct.yaml" << 'YAML'

runtime_requirements:
  runtime: "node"
  dependencies: {}
  external_tools: []

access_layer:
  type: mcp
  entrypoint: "src/index.ts"
  transport: stdio

skills: []
commands: []
pack_dependencies: {}
YAML
            ;;
        codex)
            cat >> "$dir/construct.yaml" << 'YAML'

paths:
  state: ".codex/state"
  cache: ".codex/cache"
  output: "output"

access_layer:
  type: file
  entrypoint: "index.md"

skills: []
commands: []
pack_dependencies: {}
YAML
            ;;
        template)
            cat >> "$dir/construct.yaml" << 'YAML'

skills: []
commands: []
pack_dependencies: {}
YAML
            ;;
    esac
}

# Generate .gitignore with stealth defaults
generate_gitignore() {
    local dir="$1"
    cat > "$dir/.gitignore" << 'GITIGNORE'
# Loa Construct — Stealth Defaults
.ck/
.construct/
.run/
node_modules/
dist/
*.log
.env
.env.*
.DS_Store
GITIGNORE
}

# Generate README
generate_readme() {
    local name="$1"
    local type="$2"
    local dir="$3"

    cat > "$dir/README.md" << README
# $name

> A Loa construct ($type)

## Installation

\`\`\`bash
/constructs install $name
\`\`\`

## Description

TODO: Add description

## License

MIT
README
}

# Generate starter skill for skill-pack
generate_starter_skill() {
    local slug="$1"
    local dir="$2"

    mkdir -p "$dir/skills/example"

    cat > "$dir/skills/example/index.yaml" << YAML
name: example
version: "0.1.0"
description: "Example skill — replace with your own"

model: sonnet
color: green

triggers:
  - pattern: "/example"
    description: "Run the example skill"

capabilities:
  model_tier: sonnet
  danger_level: safe
  effort_hint: small
  downgrade_allowed: true
  execution_hint: sequential
  requires:
    native_runtime: false
    tool_calling: true
    thinking_traces: false
    vision: false

dependencies: []

inputs: []
outputs: []

zones:
  system: read
  state: none
  app: none
YAML

    cat > "$dir/skills/example/SKILL.md" << 'SKILL'
# Example Skill

## Purpose

This is a starter skill. Replace this with your own skill implementation.

## Invocation

```bash
/example
```

## Workflow

1. Greet the user
2. Explain what this construct does

## Outputs

None — this is a template.
SKILL
}

# Generate starter tool entry for tool-pack
generate_starter_tool() {
    local dir="$1"

    mkdir -p "$dir/src"

    cat > "$dir/src/index.ts" << 'TOOL'
/**
 * Tool Pack Entry Point
 * Replace with your MCP server implementation.
 */

console.log("Tool pack initialized");
TOOL
}

# Generate starter codex structure
generate_starter_codex() {
    local dir="$1"

    mkdir -p "$dir/.codex/state" "$dir/.codex/cache" "$dir/output"

    cat > "$dir/index.md" << 'CODEX'
# Knowledge Base

This is a codex-type construct. Add your knowledge files here.

## Structure

- `index.md` — This entry point
- `.codex/state/` — State files (gitignored)
- `.codex/cache/` — Cache files (gitignored)
- `output/` — Generated output
CODEX
}

# =============================================================================
# Commands
# =============================================================================

# Scaffold a new construct directory
cmd_new() {
    local name=""
    local type=""
    local offline=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --name) name="$2"; shift 2 ;;
            --type) type="$2"; shift 2 ;;
            --offline) offline=true; shift ;;
            *) echo "ERROR: Unknown option: $1" >&2; exit $EXIT_VALIDATION ;;
        esac
    done

    if [[ -z "$name" ]]; then
        echo "ERROR: --name is required" >&2
        exit $EXIT_VALIDATION
    fi

    if [[ -z "$type" ]]; then
        echo "ERROR: --type is required (skill-pack|tool-pack|codex)" >&2
        exit $EXIT_VALIDATION
    fi

    if ! validate_type "$type"; then
        echo "ERROR: Invalid type '$type'. Must be one of: ${VALID_TYPES[*]}" >&2
        exit $EXIT_VALIDATION
    fi

    local slug
    slug=$(derive_slug "$name")
    validate_safe_identifier "$slug"

    local target_dir="$slug"
    if [[ -d "$target_dir" ]]; then
        echo "ERROR: Directory '$target_dir' already exists" >&2
        exit $EXIT_EXISTS
    fi

    echo "Creating construct: $name ($type)"
    echo "  Slug: $slug"
    echo "  Directory: $target_dir"
    echo ""

    mkdir -p "$target_dir"

    # Generate files
    generate_manifest "$slug" "$name" "$type" "$target_dir"
    generate_gitignore "$target_dir"
    generate_readme "$name" "$type" "$target_dir"

    case "$type" in
        skill-pack)
            generate_starter_skill "$slug" "$target_dir"
            ;;
        tool-pack)
            generate_starter_tool "$target_dir"
            ;;
        codex)
            generate_starter_codex "$target_dir"
            ;;
        template)
            # Template type — minimal scaffold, no type-specific files
            ;;
    esac

    # Initialize git repo
    (
        cd "$target_dir"
        git init -q
        git add -A
        git commit -q -m "Initial commit: $name ($type)"
    )

    echo "Construct '$name' created at ./$target_dir"
    echo ""
    echo "Next steps:"
    echo "  cd $target_dir"
    echo "  # Edit construct.yaml and skills/"
    echo "  /construct-publish --validate    # Validate before publishing"

    return $EXIT_SUCCESS
}

# Initialize current directory as a construct
cmd_init() {
    local type=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --type) type="$2"; shift 2 ;;
            *) echo "ERROR: Unknown option: $1" >&2; exit $EXIT_VALIDATION ;;
        esac
    done

    if [[ -z "$type" ]]; then
        echo "ERROR: --type is required (skill-pack|tool-pack|codex)" >&2
        exit $EXIT_VALIDATION
    fi

    if ! validate_type "$type"; then
        echo "ERROR: Invalid type '$type'. Must be one of: ${VALID_TYPES[*]}" >&2
        exit $EXIT_VALIDATION
    fi

    if [[ -f "construct.yaml" ]] || [[ -f "manifest.json" ]]; then
        echo "ERROR: This directory is already a construct (construct.yaml or manifest.json exists)" >&2
        exit $EXIT_EXISTS
    fi

    local dir_name
    dir_name=$(basename "$(pwd)")
    local slug
    slug=$(derive_slug "$dir_name")
    validate_safe_identifier "$slug"

    echo "Initializing construct in current directory"
    echo "  Name: $dir_name"
    echo "  Type: $type"
    echo "  Slug: $slug"
    echo ""

    generate_manifest "$slug" "$dir_name" "$type" "."

    # Only generate .gitignore if it doesn't exist
    if [[ ! -f ".gitignore" ]]; then
        generate_gitignore "."
    fi

    # Only generate README if it doesn't exist
    if [[ ! -f "README.md" ]]; then
        generate_readme "$dir_name" "$type" "."
    fi

    case "$type" in
        skill-pack)
            if [[ ! -d "skills" ]]; then
                generate_starter_skill "$slug" "."
            fi
            ;;
        tool-pack)
            if [[ ! -d "src" ]]; then
                generate_starter_tool "."
            fi
            ;;
        codex)
            generate_starter_codex "."
            ;;
        template)
            # Template type — minimal scaffold
            ;;
    esac

    echo "Construct initialized. Edit construct.yaml to customize."

    return $EXIT_SUCCESS
}

# =============================================================================
# Main Entry Point (source-vs-execute guard)
# =============================================================================

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ $# -lt 1 ]]; then
        echo "Usage: constructs-create.sh <command> [options]"
        echo ""
        echo "Commands:"
        echo "  new   --name <name> --type <type>   Scaffold new construct"
        echo "  init  --type <type>                 Initialize current directory"
        echo ""
        echo "Types: skill-pack, tool-pack, codex"
        exit $EXIT_VALIDATION
    fi

    command="$1"
    shift

    case "$command" in
        new)  cmd_new "$@" ;;
        init) cmd_init "$@" ;;
        *)
            echo "ERROR: Unknown command '$command'" >&2
            exit $EXIT_VALIDATION
            ;;
    esac
fi
