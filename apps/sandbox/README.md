# Loa Constructs Sandbox

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> *"The forge is where raw materials become precision instruments. User truth becomes testable reality."*

Development sandbox for Loa skill packs. This directory contains the source packs that are published to the [Loa Constructs Registry](https://loa-constructs-api-production.up.railway.app).

## Packs

| Pack | Emoji | Skills | Purpose |
|------|-------|--------|---------|
| **Observer** | 🔮 | 6 | User truth capture for hypothesis-first research |
| **Crucible** | ⚗️ | 5 | Validation and testing for journey verification |
| **Artisan** | 🎨 | 10 | Brand and UI craftsmanship for design systems |
| **Beacon** | 💠 | 6 | Agent commerce readiness with x402 payments |

**Total: 27 skills**

## Directory Structure

```
apps/sandbox/
├── packs/
│   ├── artisan/
│   │   ├── manifest.json
│   │   ├── README.md
│   │   └── skills/
│   │       └── {skill-name}/
│   │           ├── index.yaml
│   │           └── SKILL.md
│   ├── beacon/
│   ├── crucible/
│   └── observer/
├── scripts/
│   ├── constructs-cli.sh    # Registry publish CLI
│   └── validate-pack.sh     # Pack validation
└── package.json
```

## Commands

### Validate Packs

```bash
# Validate a single pack
./scripts/validate-pack.sh packs/artisan

# Validate all packs
for pack in packs/*/; do ./scripts/validate-pack.sh "$pack"; done

# Via Turborepo
pnpm turbo validate --filter=@loa-constructs/sandbox
```

### Publish to Registry

```bash
# Set API credentials in .env
LOA_CONSTRUCTS_API_KEY=sk_your_key
LOA_CONSTRUCTS_API_URL=https://loa-constructs-api-production.up.railway.app/v1

# List local packs with registry status
./scripts/constructs-cli.sh list

# Publish a pack
./scripts/constructs-cli.sh publish artisan
```

### Seed Database

From the monorepo root:

```bash
DATABASE_URL="..." pnpm tsx scripts/seed-forge-packs.ts
```

## Creating a New Pack

```bash
cd packs

# Create structure
mkdir -p new-pack/skills/my-skill

# Create manifest
cat > new-pack/manifest.json << 'EOF'
{
  "schema_version": 1,
  "name": "New Pack",
  "slug": "new-pack",
  "version": "1.0.0",
  "description": "Pack description",
  "author": "0xHoneyJar",
  "license": "MIT",
  "skills": [
    { "slug": "my-skill", "path": "skills/my-skill" }
  ]
}
EOF

# Create skill files
cat > new-pack/skills/my-skill/index.yaml << 'EOF'
name: my-skill
description: Skill description
triggers:
  - pattern: "my skill trigger"
allowed-tools: [Read, Write, Bash]
EOF

cat > new-pack/skills/my-skill/SKILL.md << 'EOF'
# My Skill

Skill instructions go here...
EOF

# Validate
cd .. && ./scripts/validate-pack.sh packs/new-pack
```

## Pack Manifest Schema

Each pack must have a `manifest.json`:

```json
{
  "schema_version": 1,
  "name": "Pack Name",
  "slug": "pack-slug",
  "version": "1.0.0",
  "description": "Pack description",
  "author": "0xHoneyJar",
  "license": "MIT",
  "skills": [
    { "slug": "skill-name", "path": "skills/skill-name" }
  ],
  "hooks": {
    "post_install": "scripts/install.sh"
  }
}
```

## Skill Structure

Each skill directory must contain:
- `index.yaml` - Skill metadata (name, triggers, allowed tools)
- `SKILL.md` - Skill instructions

## Pack Details

### 🔮 Observer

User truth capture through hypothesis-first research with Level 3 diagnostic methodology.

**Skills**: `/observe`, `/shape`, `/analyze-gap`, `/file-gap`, `/import-research`

### ⚗️ Crucible

Transform user journeys into validated Playwright tests with dual-diagram approach.

**Skills**: `/ground`, `/diagram`, `/validate`, `/walkthrough`, `/iterate`

### 🎨 Artisan

Brand and UI craftsmanship through physics-based motion and Material 3 compliance.

**Skills**: `/survey`, `/synthesize-taste`, `/inscribe`, `/craft`, `/animate`, `/behavior`, `/style`, `/distill`, `/validate-physics`, `/web3-test`

### 💠 Beacon

Agent commerce readiness with x402 payment middleware for Berachain.

**Skills**: `/audit-llm`, `/add-markdown`, `/optimize-chunks`, `/beacon-discover`, `/beacon-actions`, `/beacon-pay`

## History

This sandbox was migrated from the standalone [forge](https://github.com/0xHoneyJar/forge) repository via `git subtree` to consolidate the constructs network into a single monorepo.

## License

[MIT](LICENSE) - Use freely in your projects.
