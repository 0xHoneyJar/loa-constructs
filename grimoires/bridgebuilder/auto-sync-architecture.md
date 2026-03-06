# Auto-Sync Architecture — Namespace Discovery

> *"Name it `construct-*`, push it, it exists."*

**Date**: 2026-03-05
**Status**: Design Proposal
**Triggered by**: Bridgebuilder Review CRITICAL-1
**Grounded in**: `scripts/seed-forge-packs.ts`, `apps/api/src/routes/constructs.ts`, `apps/api/src/routes/webhooks.ts`

---

## Problem

13 repos follow `construct-*` naming in 0xHoneyJar. Only 10 are registered. The gap:
- `construct-deep-research` — 4 skills, full manifest, identity files. Invisible.
- `construct-webgl-particles` — 9 skills. Invisible.
- `construct-base` — the template. Invisible (by design, but still undiscoverable).

Adding a construct requires editing `GIT_CONFIGS` in `seed-forge-packs.ts` and running the seed script with `DATABASE_URL`. This is a manual step that scales linearly with construct count and requires DB access.

## Design Principle

**The namespace IS the protocol.** If a repo in the org:
1. Is named `construct-*`
2. Contains a `construct.yaml` or `manifest.json` at root
3. Is not archived

Then it exists on the network. No registration ceremony. No seed script edits.

## Architecture

### Layer 1: Discovery (GitHub → Registry)

**Trigger**: Three paths, all converging to the same handler:

```
┌─────────────────────┐
│ 1. GitHub Webhook    │──── org repo created/renamed ────┐
│    (real-time)       │                                   │
├─────────────────────┤                                   ▼
│ 2. Scheduled Scan    │──── every 6 hours ──────► [discover-handler]
│    (catch-up)        │                                   │
├─────────────────────┤                                   │
│ 3. Manual Trigger    │──── POST /v1/admin/discover ──────┘
│    (on-demand)       │
└─────────────────────┘
```

**discover-handler** does:
1. `gh api orgs/0xHoneyJar/repos --paginate -q '.[] | select(.name | startswith("construct-")) | {name, visibility: .visibility, default_branch: .default_branch.name, archived: .archived}'`
2. Filter out archived repos
3. For each repo not already registered:
   a. Check for `construct.yaml` at root (GitHub Contents API — no clone needed)
   b. If present: parse YAML, validate against `packManifestSchema`
   c. Register with `status: 'discovered'`, `source_type: 'git'`, `visibility` from repo
4. For each repo already registered:
   a. Check if repo visibility changed → update construct visibility
   b. Check if repo was archived → set `status: 'deprecated'`

**Key design choice**: Discovery creates the entry with `status: 'discovered'` (not `published`). The author promotes to `published` when ready. This means informally created constructs appear in the network as discoverable but are clearly marked as works-in-progress.

### Layer 2: Sync (Repo → Registry Data)

**Trigger**: GitHub push webhook (already implemented in `webhooks.ts:POST /v1/webhooks/github`).

The existing sync flow is correct — it clones, validates manifest, extracts files, stores to DB. The only change: auto-discovered constructs get the webhook configured automatically during discovery (via GitHub API — create webhook on the repo pointing to `POST /v1/webhooks/github`).

### Layer 3: Visibility (Private/Public)

Maps directly from GitHub repo visibility:

| Repo Visibility | Construct Visibility | Discovery | Download |
|----------------|---------------------|-----------|----------|
| `public` | `public` | Anyone | Anyone (respecting tier) |
| `private` | `org` | Org members only | Org members only |
| `internal` | `org` | Org members only | Org members only |

**Implementation**: Add `visibility` column to `packs` table (varchar, default 'public'). The `/v1/constructs` list endpoint filters by visibility based on auth:
- No auth → only `public`
- Authenticated org member → `public` + `org`
- Admin → all

**Org membership check**: On first auth, call `gh api orgs/0xHoneyJar/members/{username}` and cache result. This is the simplest possible auth model — GitHub already manages org membership.

## Schema Changes

```sql
-- Add visibility to packs
ALTER TABLE packs ADD COLUMN visibility VARCHAR(10) DEFAULT 'public' CHECK (visibility IN ('public', 'org', 'private'));

-- Add discovery metadata
ALTER TABLE packs ADD COLUMN discovered_at TIMESTAMP;
ALTER TABLE packs ADD COLUMN auto_discovered BOOLEAN DEFAULT false;

-- Index for visibility filtering
CREATE INDEX idx_packs_visibility ON packs (visibility, status);
```

```typescript
// PackManifest addition
interface PackManifest {
  // ... existing
  icon?: string;  // Emoji or URL. Author controls their own icon.
}
```

## API Changes

### New: `POST /v1/admin/discover` (admin only)
Triggers manual discovery scan. Returns list of newly discovered constructs.

### Modified: `GET /v1/constructs`
- Adds `visibility` filter to query params
- Unauthenticated requests only see `public` constructs
- Org member requests see `public` + `org`

### Modified: `GET /v1/constructs/summary`
- Same visibility filtering
- Adds `visibility` field to summary items

### New: `POST /v1/constructs/:slug/promote`
Author promotes a `discovered` construct to `published`. Runs the full validation checklist (manifest complete, skills have SKILL.md, README exists, etc.).

## Construct Lifecycle (Revised)

```
repo created ──► auto-discovered ──► [author promotes] ──► published
                 (visible, marked       (full validation)
                  as work-in-progress)
```

vs. current:

```
repo created ──► [manual GIT_CONFIGS edit] ──► [run seed script with DB_URL] ──► published
```

## CLI Surface — Built with incur

**Key decision**: Build `npx constructs` with wevm/incur. This gives us TOON output, `--llms` self-description, MCP mode, token pagination, and call-to-actions — all for free. The Hono API at api.constructs.network already speaks Fetch, so HTTP mounting is immediate.

**Namespace convention** (from skills.sh): `owner/repo@skill-name`

```bash
# From any directory, no Loa required, no account needed

# Discovery
npx constructs find "user research"                    # keyword search → leaderboard
npx constructs find "web3 transactions"                # hits GET /v1/constructs/summary
npx constructs info observer                           # hits GET /v1/constructs/observer
npx constructs --llms                                  # self-describing manifest for agents

# Installation
npx constructs add observer                            # shorthand (resolves to 0xHoneyJar/construct-observer)
npx constructs add 0xHoneyJar/construct-observer       # explicit owner/repo
npx constructs add observer@observing-users            # single skill from a pack
npx constructs list                                    # show installed
npx constructs check                                   # check for updates

# Author commands (require auth)
npx constructs promote my-construct                    # discovered → published
npx constructs sync my-construct                       # trigger manual sync

# Agent-native
npx constructs find "design" --format toon             # token-efficient output
npx constructs info observer --token-limit 500         # bounded context window usage
npx constructs --mcp                                   # start as MCP stdio server
```

**The incur advantage**: Every command automatically supports `--format toon|json|yaml|md`, `--token-limit`, `--token-offset`, `--filter-output`. Agents get exactly the tokens they need. Humans get readable output. Same code path.

**HTTP ↔ CLI bidirectionality**: The existing Hono API becomes CLI subcommands via incur's OpenAPI mounting:
```ts
import { Cli } from 'incur'
const cli = Cli.create('constructs', { fetch: api.fetch, openapi: constructsSpec })
cli.serve()
// → npx constructs list-constructs, npx constructs get-construct observer, etc.
```

**Call-to-actions**: After `npx constructs add observer`, the output includes:
```
observer installed. 24 skills ready.

Next:
  constructs info observer          View full details
  /listen                           Start capturing user feedback
  constructs add artisan            Pairs well — design system from observations
```

This is the Bridgebuilder "what's next" voice, encoded in the CLI output itself.

## Migration Path

1. **Add `visibility`, `discovered_at`, `auto_discovered` columns** (non-breaking)
2. **Mark all existing packs as `auto_discovered: false`** (they were manually seeded)
3. **Run first discovery scan** — picks up `deep-research`, `webgl-particles`, `base`
4. **Configure GitHub org webhook** for `repository` events (create, rename, archive, visibility change)
5. **Deprecate `GIT_CONFIGS`** — the seed script becomes bootstrap-only for fresh DBs; ongoing sync is automated
6. **Update explorer** to show `discovered` constructs with a "work in progress" badge

## What This Enables

- **construct-dynamic-auth** scenario: Created informally, no ceremony. Already on the network.
- **construct-deep-research** scenario: 4 skills, full manifest. Already on the network.
- **New team member** scenario: `gh repo create construct-my-thing --template 0xHoneyJar/construct-base`. Push. Done. It's on the network.
- **Private constructs**: Make the repo private. The network respects that. Make it public later. The network respects that too.
- **Third-party constructs** (future): When the network goes public, the discovery scope expands beyond one org. The `npx constructs register --git-url` path already exists for this.

---

*"The best registration system is one where the author never registers."*
