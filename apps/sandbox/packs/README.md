# Sandbox Packs — Source of Truth

> **Note**: As of Phase 2 (2026-02-10), all packs are promoted to `.claude/constructs/packs/` for framework use. This directory (`apps/sandbox/packs/`) remains the **git-tracked source of truth** since `.claude/constructs/` is gitignored.

## Pack Locations

| Pack | Source (git-tracked) | Framework (gitignored) |
|------|---------------------|----------------------|
| Artisan (14 skills) | `apps/sandbox/packs/artisan/` | `.claude/constructs/packs/artisan/` |
| Beacon (6 skills) | `apps/sandbox/packs/beacon/` | `.claude/constructs/packs/beacon/` |
| Crucible (5 skills) | `apps/sandbox/packs/crucible/` | `.claude/constructs/packs/crucible/` |
| GTM-Collective (8 skills) | `apps/sandbox/packs/gtm-collective/` | `.claude/constructs/packs/gtm-collective/` |
| Observer (6 skills) | `apps/sandbox/packs/observer/` | `.claude/constructs/packs/observer/` |

**Total**: 5 packs, 39 skills

## Editing Packs

1. Edit files in `apps/sandbox/packs/` (this directory)
2. Changes are tracked by git
3. The `scripts/install.sh` hook copies to `.claude/constructs/packs/` on install

## Schema Version

All manifests use `schema_version: 3` with:
- `pack_dependencies` — cross-pack dependency declarations
- `events` — event emission/consumption declarations
- `capabilities` — per-skill routing metadata (in each `index.yaml`)
