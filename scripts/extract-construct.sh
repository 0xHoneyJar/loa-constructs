#!/usr/bin/env bash
# extract-construct.sh — Extract a construct pack from monorepo to standalone repo
# Usage: ./scripts/extract-construct.sh --slug <slug> [options]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SCHEMA_SRC="$REPO_ROOT/.claude/schemas/construct.schema.json"
PERSONA_SCHEMA_SRC="$REPO_ROOT/.claude/schemas/persona.schema.json"
EXPERTISE_SCHEMA_SRC="$REPO_ROOT/.claude/schemas/expertise.schema.json"
ORG="0xHoneyJar"

# Defaults
SLUG=""
DRY_RUN=false
SKIP_REGISTER=false
SKIP_WEBHOOK=false
PRIVATE=false
TEMPLATE_REPO=""
OUTPUT_DIR=""

usage() {
  cat <<'EOF'
Usage: extract-construct.sh --slug <slug> [options]

Extract a construct pack from apps/sandbox/packs/<slug> into a standalone repo.

Options:
  --slug <slug>           Pack slug to extract (required)
  --dry-run               Generate output locally without creating GitHub repo
  --skip-register         Skip API registration
  --skip-webhook          Skip webhook configuration
  --private               Create private GitHub repo
  --template-repo <url>   GitHub template repo URL
  --output <dir>          Output directory (default: /tmp/construct-<slug>)
  -h, --help              Show this help
EOF
  exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug) SLUG="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --skip-register) SKIP_REGISTER=true; shift ;;
    --skip-webhook) SKIP_WEBHOOK=true; shift ;;
    --private) PRIVATE=true; shift ;;
    --template-repo) TEMPLATE_REPO="$2"; shift 2 ;;
    --output) OUTPUT_DIR="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$SLUG" ]]; then
  echo "ERROR: --slug is required" >&2
  exit 1
fi

# Validate slug format
if ! echo "$SLUG" | grep -qE '^[a-z0-9][a-z0-9-]*[a-z0-9]$'; then
  echo "ERROR: Invalid slug format: $SLUG (must be kebab-case)" >&2
  exit 1
fi

PACK_DIR="$REPO_ROOT/apps/sandbox/packs/$SLUG"
MANIFEST="$PACK_DIR/manifest.json"
REPO_NAME="construct-$SLUG"
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/$REPO_NAME}"

if [[ ! -f "$MANIFEST" ]]; then
  echo "ERROR: Manifest not found: $MANIFEST" >&2
  exit 1
fi

# Validate schema_version >= 3
SCHEMA_VERSION=$(jq -r '.schema_version // 0' "$MANIFEST")
if [[ "$SCHEMA_VERSION" -lt 3 ]]; then
  echo "ERROR: schema_version must be >= 3 (found: $SCHEMA_VERSION)" >&2
  exit 1
fi

echo "═══════════════════════════════════════════════════"
echo "  Extracting: $SLUG"
echo "  Source: $PACK_DIR"
echo "  Output: $OUTPUT_DIR"
echo "  Dry run: $DRY_RUN"
echo "═══════════════════════════════════════════════════"

# ─── Phase 1: Generate ─────────────────────────────────
echo ""
echo "Phase 1: GENERATE"

# Clean output dir (idempotent)
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Copy construct directories
for dir in skills commands contexts templates scripts identity; do
  if [[ -d "$PACK_DIR/$dir" ]]; then
    cp -r "$PACK_DIR/$dir" "$OUTPUT_DIR/$dir"
    echo "  ✓ Copied $dir/"
  fi
done

# Transform manifest.json → construct.yaml
echo "  Transforming manifest.json → construct.yaml..."

jq '{
  schema_version: .schema_version,
  name: .name,
  slug: .slug,
  version: "1.0.0",
  description: .description,
  author: .author,
  license: .license,
  skills: .skills,
  commands: .commands,
  repository: {
    url: ("https://github.com/'"$ORG"'/construct-" + .slug + ".git"),
    homepage: ("https://constructs.network/constructs/" + .slug)
  },
  events: (
    if .events then {
      emits: .events.emits,
      consumes: (if .events.consumes then [.events.consumes[] | {event: (.event // .type), delivery: .delivery, idempotency: .idempotency} | with_entries(select(.value != null))] else [] end)
    } else null end
  ),
  pack_dependencies: (
    if .pack_dependencies then
      [.pack_dependencies[] | {slug: (.slug // .pack), version: .version} | with_entries(select(.value != null))]
    else [] end
  ),
  identity: {
    persona: "identity/persona.yaml",
    expertise: "identity/expertise.yaml"
  },
  hooks: .hooks,
  quick_start: .quick_start
} | with_entries(select(.value != null and .value != []))' "$MANIFEST" | yq -P > "$OUTPUT_DIR/construct.yaml"

echo "  ✓ construct.yaml generated"

# Copy schema
mkdir -p "$OUTPUT_DIR/schemas"
cp "$SCHEMA_SRC" "$OUTPUT_DIR/schemas/construct.schema.json"
if [[ -f "$PERSONA_SCHEMA_SRC" ]]; then
  cp "$PERSONA_SCHEMA_SRC" "$OUTPUT_DIR/schemas/persona.schema.json"
fi
if [[ -f "$EXPERTISE_SCHEMA_SRC" ]]; then
  cp "$EXPERTISE_SCHEMA_SRC" "$OUTPUT_DIR/schemas/expertise.schema.json"
fi
echo "  ✓ Schemas copied to schemas/"

# Generate skeleton identity files
mkdir -p "$OUTPUT_DIR/identity"

CONSTRUCT_NAME=$(jq -r '.name' "$MANIFEST")

if [[ ! -f "$OUTPUT_DIR/identity/persona.yaml" ]]; then
  cat > "$OUTPUT_DIR/identity/persona.yaml" <<PERSONA
# Identity: $CONSTRUCT_NAME
# Status: draft — refine after extraction

name: "$CONSTRUCT_NAME"
status: draft

cognitiveFrame:
  archetype: "Specialist"
  disposition: "Methodical, focused"
  thinking_style: "Analytical"
  decision_making: "Evidence-based"

voice:
  tone: "Professional"
  register: "Technical"
  personality_markers:
    - "Precise"
    - "Thorough"
PERSONA
  echo "  ✓ Skeleton persona.yaml generated"
fi

if [[ ! -f "$OUTPUT_DIR/identity/expertise.yaml" ]]; then
  cat > "$OUTPUT_DIR/identity/expertise.yaml" <<EXPERTISE
# Expertise: $CONSTRUCT_NAME
# Status: draft — refine after extraction

domains:
  - name: "Primary Domain"
    depth: 4
    specializations:
      - "Core capability"
    boundaries:
      - "Out of scope"
EXPERTISE
  echo "  ✓ Skeleton expertise.yaml generated"
fi

# Generate skeleton CLAUDE.md
if [[ ! -f "$OUTPUT_DIR/CLAUDE.md" ]]; then
  SKILLS_TABLE=""
  SKILL_COUNT=$(jq -r '.skills | length' "$MANIFEST")
  for i in $(seq 0 $((SKILL_COUNT - 1))); do
    SKILL_SLUG=$(jq -r ".skills[$i].slug" "$MANIFEST")
    SKILLS_TABLE+="| /$SKILL_SLUG | TODO: description |"$'\n'
  done

  cat > "$OUTPUT_DIR/CLAUDE.md" <<CLAUDE
# $CONSTRUCT_NAME

> Status: draft — refine after extraction

## Who I Am

$CONSTRUCT_NAME construct for the Loa ecosystem.

## What I Know

See \`identity/expertise.yaml\` for domain expertise.

## Available Skills

| Command | Description |
|---------|-------------|
${SKILLS_TABLE}
## Workflow

TODO: Define typical workflow.

## Boundaries

- TODO: Define what this construct does NOT do.
CLAUDE
  echo "  ✓ Skeleton CLAUDE.md generated"
fi

# Generate CI workflow
mkdir -p "$OUTPUT_DIR/.github/workflows"
cat > "$OUTPUT_DIR/.github/workflows/validate.yml" <<'VALIDATE'
name: Validate Construct
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install yq
        run: |
          sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
          sudo chmod +x /usr/local/bin/yq

      - name: Validate construct.yaml syntax
        run: yq eval '.' construct.yaml > /dev/null

      - name: Check required fields
        run: |
          for field in schema_version name slug version; do
            val=$(yq ".$field" construct.yaml)
            if [[ "$val" == "null" || -z "$val" ]]; then
              echo "ERROR: Missing required field: $field"
              exit 1
            fi
          done
          echo "All required fields present"

      - name: Validate identity files
        run: |
          # Check identity files exist
          if [[ ! -f identity/persona.yaml ]]; then
            echo "ERROR: identity/persona.yaml not found"
            exit 1
          fi
          if [[ ! -f identity/expertise.yaml ]]; then
            echo "ERROR: identity/expertise.yaml not found"
            exit 1
          fi

          # Validate persona required fields
          for field in cognitiveFrame.archetype cognitiveFrame.disposition cognitiveFrame.thinking_style cognitiveFrame.decision_making; do
            val=$(yq ".$field" identity/persona.yaml)
            if [[ "$val" == "null" || -z "$val" ]]; then
              echo "ERROR: Missing required persona field: $field"
              exit 1
            fi
          done

          # Validate voice block exists
          voice=$(yq ".voice" identity/persona.yaml)
          if [[ "$voice" == "null" ]]; then
            echo "ERROR: Missing voice block in persona.yaml"
            exit 1
          fi

          echo "Identity validation passed"

      - name: Check skill structure
        run: |
          skill_count=$(yq '.skills | length' construct.yaml)
          echo "Found $skill_count skills"
          for i in $(seq 0 $((skill_count - 1))); do
            slug=$(yq ".skills[$i].slug" construct.yaml)
            path=$(yq ".skills[$i].path" construct.yaml)
            if [[ ! -d "$path" ]]; then
              echo "WARNING: Skill directory not found: $path (slug: $slug)"
            fi
            if [[ ! -f "$path/index.yaml" ]]; then
              echo "WARNING: Missing index.yaml for skill: $slug"
            fi
            if [[ ! -f "$path/SKILL.md" ]]; then
              echo "WARNING: Missing SKILL.md for skill: $slug"
            fi
          done
          echo "Skill structure check complete"
VALIDATE
echo "  ✓ CI workflow generated"

# Generate README
cat > "$OUTPUT_DIR/README.md" <<README
# $CONSTRUCT_NAME

> $( jq -r '.description' "$MANIFEST" )

Part of the [Loa Constructs](https://constructs.network) ecosystem.

## Installation

\`\`\`bash
constructs-install.sh install $SLUG
\`\`\`

## Skills

$(jq -r '.skills[] | "- `" + .slug + "`"' "$MANIFEST")

## License

$(jq -r '.license // "MIT"' "$MANIFEST")
README
echo "  ✓ README.md generated"

echo ""
echo "Phase 1: GENERATE ✓"

# ─── Phase 2: Validate ─────────────────────────────────
echo ""
echo "Phase 2: VALIDATE"

# Validate construct.yaml against schema
if "$SCRIPT_DIR/validate-construct.sh" "$OUTPUT_DIR/construct.yaml" 2>&1; then
  echo "  ✓ Schema validation passed"
else
  echo "  ✗ Schema validation FAILED" >&2
  exit 1
fi

# Verify all skills directories exist
SKILL_COUNT=$(yq '.skills | length' "$OUTPUT_DIR/construct.yaml")
for i in $(seq 0 $((SKILL_COUNT - 1))); do
  SKILL_PATH=$(yq ".skills[$i].path" "$OUTPUT_DIR/construct.yaml")
  if [[ ! -d "$OUTPUT_DIR/$SKILL_PATH" ]]; then
    echo "  ⚠ WARNING: Skill directory missing: $SKILL_PATH"
  fi
done

echo ""
echo "Phase 2: VALIDATE ✓"

if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo "  DRY RUN COMPLETE"
  echo "  Output: $OUTPUT_DIR"
  echo "  Files: $(find "$OUTPUT_DIR" -type f | wc -l | tr -d ' ')"
  echo "═══════════════════════════════════════════════════"
  echo ""
  echo "To inspect: ls -la $OUTPUT_DIR"
  exit 0
fi

# ─── Phase 3: Create Repo ──────────────────────────────
echo ""
echo "Phase 3: CREATE REPO"

if ! command -v gh &>/dev/null; then
  echo "ERROR: gh CLI required for repo creation" >&2
  exit 1
fi

VISIBILITY="--public"
if [[ "$PRIVATE" == "true" ]]; then
  VISIBILITY="--private"
fi

# Check if repo exists
if gh repo view "$ORG/$REPO_NAME" &>/dev/null; then
  echo "  Repo $ORG/$REPO_NAME already exists (idempotent — using existing)"
else
  gh repo create "$ORG/$REPO_NAME" $VISIBILITY --description "$(jq -r '.description' "$MANIFEST")" 2>&1
  echo "  ✓ Created $ORG/$REPO_NAME"
fi

echo ""
echo "Phase 3: CREATE REPO ✓"

# ─── Phase 4: Push ─────────────────────────────────────
echo ""
echo "Phase 4: PUSH"

cd "$OUTPUT_DIR"
git init -b main
git add -A
git commit -m "feat: initial extraction from loa-constructs monorepo

Extracted $CONSTRUCT_NAME ($SKILL_COUNT skills) from apps/sandbox/packs/$SLUG.
Generated construct.yaml, identity skeletons, CLAUDE.md, and CI workflow.

Source: 0xHoneyJar/loa-constructs (cycle-016)"

git remote add origin "https://github.com/$ORG/$REPO_NAME.git"
git push -u origin main --force

echo "  ✓ Pushed to $ORG/$REPO_NAME"
echo ""
echo "Phase 4: PUSH ✓"
cd "$REPO_ROOT"

# ─── Phase 5: Register ─────────────────────────────────
if [[ "$SKIP_REGISTER" == "true" ]]; then
  echo ""
  echo "Phase 5: REGISTER (skipped)"
else
  echo ""
  echo "Phase 5: REGISTER"

  API_URL="${CONSTRUCTS_API_URL:-https://api.constructs.network}"

  curl -s -X POST "$API_URL/v1/packs/$SLUG/register-repo" \
    -H "Content-Type: application/json" \
    -d "{\"gitUrl\": \"https://github.com/$ORG/$REPO_NAME.git\", \"gitRef\": \"main\"}" \
    | jq .

  echo "  ✓ Registered with API"
  echo ""
  echo "Phase 5: REGISTER ✓"
fi

# ─── Phase 6: Webhook ──────────────────────────────────
if [[ "$SKIP_WEBHOOK" == "true" ]]; then
  echo ""
  echo "Phase 6: WEBHOOK (skipped)"
else
  echo ""
  echo "Phase 6: WEBHOOK"

  WEBHOOK_SECRET="${GITHUB_WEBHOOK_SECRET:-}"
  if [[ -z "$WEBHOOK_SECRET" ]]; then
    echo "  ⚠ GITHUB_WEBHOOK_SECRET not set — skipping webhook creation"
  else
    API_URL="${CONSTRUCTS_API_URL:-https://api.constructs.network}"
    WEBHOOK_URL="$API_URL/v1/webhooks/github"

    gh api "repos/$ORG/$REPO_NAME/hooks" \
      -f "name=web" \
      -f "config[url]=$WEBHOOK_URL" \
      -f "config[content_type]=json" \
      -f "config[secret]=$WEBHOOK_SECRET" \
      -f "events[]=push" \
      -f "events[]=create" \
      -f "active=true" 2>&1 | jq '{id: .id, active: .active}'

    echo "  ✓ Webhook configured"
  fi
  echo ""
  echo "Phase 6: WEBHOOK ✓"
fi

# ─── Phase 7: Sync ─────────────────────────────────────
echo ""
echo "Phase 7: SYNC"

API_URL="${CONSTRUCTS_API_URL:-https://api.constructs.network}"
curl -s -X POST "$API_URL/v1/packs/$SLUG/sync" | jq '{status: .status, files: (.files | length)}'

echo "  ✓ Initial sync triggered"
echo ""
echo "Phase 7: SYNC ✓"

# ─── Done ───────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  EXTRACTION COMPLETE: $SLUG"
echo "  Repo: https://github.com/$ORG/$REPO_NAME"
echo "  Skills: $SKILL_COUNT"
echo "═══════════════════════════════════════════════════"
