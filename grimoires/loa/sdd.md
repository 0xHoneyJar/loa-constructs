# SDD: Construct Lifecycle — Type System, Dependency Graph, and Operational Gaps

**Cycle**: cycle-034
**Created**: 2026-02-21
**Status**: Draft
**PRD**: `grimoires/loa/prd.md`
**Grounded in**: `schema.ts` (packs:472-548, packsRelations:772-781), `constructs.ts` (listConstructs:422-518, packToConstruct:333-413), `packs.ts` (sync:938-1040, createPack service:91-109), `fetch-constructs.ts` (computeEdges:236-256, APIConstruct:6-45), `use-search.ts` (Fuse.js:1-50), `seed-forge-packs.ts` (discoverPacks:134-155)

---

## 1. Executive Summary

This SDD covers 8 changes across 2 apps and 1 script to close the remaining #131 gaps:

1. **Database Layer** — 1 new column (`construct_type`), 1 migration file, journal sync
2. **API Layer** — Type persistence at registration + sync, updated list filter enum
3. **Explorer Layer** — Real dependency graph, API-driven search
4. **Scripts** — Seed script `construct.yaml` support, webhook configuration

**Change surface**: ~10 files modified, ~2 files created. 1 new dev dependency (`js-yaml` for seed script). No breaking changes to existing API responses.

---

## 2. Data Architecture

### 2.1 New Column: `packs.construct_type`

**Location**: `apps/api/src/db/schema.ts:472-548`

Add after `searchUseCases` (line 529):

```typescript
// Construct archetype (skill-pack | tool-pack | codex | template)
// @see prd.md §FR-1 — issue #131
constructType: varchar('construct_type', { length: 20 }).default('skill-pack'),
```

Add index in the table builder (line 546):

```typescript
constructTypeIdx: index('idx_packs_construct_type').on(table.constructType),
```

**Design decisions**:

| Decision | Rationale |
|----------|-----------|
| varchar(20), not pgEnum | Type set is open — RFC comment #1 mentions `mcp-server`, `runtime-extension` as future types. Varchar with Zod validation at app layer avoids `ALTER TYPE` migrations. Matches `verificationTier` pattern from cycle-033. |
| Default `'skill-pack'` | All 5 existing packs are skill-packs. New column is immediately valid for all existing rows with no backfill. |
| No NOT NULL constraint | Allows gradual migration. Null means "type not yet assigned" (will resolve to `skill-pack` at read time). |

### 2.2 Migration File

**Location**: `apps/api/drizzle/0006_construct_type.sql` (new)

```sql
-- Migration: Add construct_type to packs table
-- Cycle: cycle-034 — Construct Lifecycle Type System
-- @see grimoires/loa/sdd.md §2.1

ALTER TABLE "packs" ADD COLUMN IF NOT EXISTS "construct_type" varchar(20) DEFAULT 'skill-pack';
CREATE INDEX IF NOT EXISTS "idx_packs_construct_type" ON "packs" ("construct_type");

-- Backfill: Set all existing packs to 'skill-pack' (they all are)
UPDATE "packs" SET "construct_type" = 'skill-pack' WHERE "construct_type" IS NULL;
```

### 2.3 Drizzle Journal Sync

**Location**: `apps/api/drizzle/meta/_journal.json`

Add entries for migrations 0003-0006 that exist as SQL files. These were applied out-of-band (raw SQL against Supabase). Adding them to the journal prevents `drizzle-kit` from attempting to re-apply them.

```json
{
  "idx": 3, "version": "7", "tag": "0003_public_keys",
  "when": 1738600000000, "breakpoints": true
},
{
  "idx": 4, "version": "7", "tag": "0004_content_hash",
  "when": 1738700000000, "breakpoints": true
},
{
  "idx": 5, "version": "7", "tag": "0005_construct_verifications",
  "when": 1740100000000, "breakpoints": true
},
{
  "idx": 6, "version": "7", "tag": "0006_construct_type",
  "when": 1740200000000, "breakpoints": true
}
```

---

## 3. API Design

### 3.1 Persist Type at Registration

**File**: `apps/api/src/routes/constructs.ts:310-316`

Current (type discarded):
```typescript
await createPack({
  name: body.name,
  slug: body.slug,
  description: body.type ? `A ${body.type} construct` : undefined,
  ownerId: userId,
  ownerType: 'user',
});
```

New (type persisted):
```typescript
await createPack({
  name: body.name,
  slug: body.slug,
  description: body.type ? `A ${body.type} construct` : undefined,
  constructType: body.type || 'skill-pack',
  ownerId: userId,
  ownerType: 'user',
});
```

**Upstream change**: `CreatePackInput` in `apps/api/src/services/packs.ts:28-43` needs `constructType?: string` added. The `createPack` function at line 91-109 needs to include `constructType` in the insert values.

### 3.2 Persist Type During Sync

**File**: `apps/api/src/routes/packs.ts:1001-1010`

In the sync transaction, the pack metadata update already has `gitRef`, `lastSyncCommit`, `lastSyncedAt`, `updatedAt`. Add `constructType` extraction from the parsed manifest:

```typescript
// Extract construct type from manifest (construct.yaml `type` field)
const manifestType = (syncResult.manifest as Record<string, unknown>)?.type;
const validTypes = ['skill-pack', 'tool-pack', 'codex', 'template'];
const constructType = typeof manifestType === 'string' && validTypes.includes(manifestType)
  ? manifestType
  : undefined; // Don't overwrite if manifest doesn't specify

// Update pack metadata
await tx
  .update(packs)
  .set({
    gitRef: gitRef,
    lastSyncCommit: syncResult.commit,
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
    ...(constructType && { constructType }),
  })
  .where(eq(packs.id, pack.id));
```

**Also apply in webhook sync**: `apps/api/src/routes/webhooks.ts` has a parallel sync path. The same type extraction logic applies there.

### 3.3 Update List Filter Enum

**File**: `apps/api/src/routes/constructs.ts:36-44`

```typescript
const listConstructsSchema = z.object({
  q: z.string().optional(),
  type: z.enum(['skill', 'pack', 'bundle', 'skill-pack', 'tool-pack', 'codex', 'template']).optional(),
  tier: z.enum(['free', 'pro', 'team', 'enterprise']).optional(),
  category: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().positive().max(100).optional().default(20),
});
```

**File**: `apps/api/src/services/constructs.ts:422-518`

In `listConstructs()`, add archetype filtering logic. When `type` is one of the new archetype values (`skill-pack`, `tool-pack`, `codex`, `template`), filter packs by `constructType` column instead of the old skill/pack/bundle routing:

```typescript
// Determine query routing
const isArchetypeFilter = ['skill-pack', 'tool-pack', 'codex', 'template'].includes(type || '');
const isLegacyFilter = ['skill', 'pack', 'bundle'].includes(type || '');

if (isArchetypeFilter) {
  // Filter packs by construct_type column — skills don't have archetype
  const packsResult = await fetchPacksAsConstructs({
    query, tier, featured, maturity,
    constructType: type,  // NEW: pass to query builder
    limit: fetchLimit, offset: fetchOffset,
  });
  // No skills in archetype filter results
  allConstructs = packsResult.items;
  total = packsResult.count;
} else {
  // Legacy behavior: skill/pack/bundle routing
  // ... existing logic ...
}
```

**File**: `apps/api/src/services/constructs.ts:837-920`

Add `constructType` filter to `fetchPacksAsConstructs`:

```typescript
if (options.constructType) {
  conditions.push(eq(packs.constructType, options.constructType));
}
```

### 3.4 Include `construct_type` in API Response

**File**: `apps/api/src/services/constructs.ts:37-78`

Add to `Construct` interface:
```typescript
constructType: string;
```

**File**: `apps/api/src/services/constructs.ts:364-413`

In `packToConstruct()`, add:
```typescript
constructType: (pack as any).constructType || 'skill-pack',
```

**File**: `apps/api/src/routes/constructs.ts:48-74`

In `formatConstruct()` and `formatConstructDetail()`, include:
```typescript
construct_type: c.constructType,
```

---

## 4. Explorer Design

### 4.1 Real Dependency Graph

**File**: `apps/explorer/lib/data/fetch-constructs.ts:236-256`

Replace `computeEdges()` entirely:

```typescript
function computeEdges(nodes: ConstructNode[]) {
  const edges: Array<{
    id: string;
    source: string;
    target: string;
    relationship: 'contains' | 'depends_on' | 'composes_with';
  }> = [];

  // Build slug→id lookup for edge resolution
  const slugToId = new Map<string, string>();
  for (const node of nodes) {
    slugToId.set(node.slug, node.id);
  }

  for (const node of nodes) {
    if (!node.manifest) continue;

    const manifest = node.manifest as Record<string, unknown>;

    // Extract pack_dependencies
    const deps = manifest.pack_dependencies as Record<string, unknown> | undefined;
    if (deps && typeof deps === 'object') {
      for (const depSlug of Object.keys(deps)) {
        const targetId = slugToId.get(depSlug);
        if (targetId && targetId !== node.id) {
          edges.push({
            id: `${node.id}-dep-${targetId}`,
            source: node.id,
            target: targetId,
            relationship: 'depends_on',
          });
        }
      }
    }

    // Extract composes_with
    const composes = manifest.composes_with as string[] | undefined;
    if (Array.isArray(composes)) {
      for (const composeSlug of composes) {
        const targetId = slugToId.get(composeSlug);
        if (targetId && targetId !== node.id) {
          edges.push({
            id: `${node.id}-comp-${targetId}`,
            source: node.id,
            target: targetId,
            relationship: 'composes_with',
          });
        }
      }
    }
  }

  return edges;
}
```

**Key change**: Edges now come from `manifest.pack_dependencies` (object keys = dependency slugs) and `manifest.composes_with` (string array of partner slugs). If a dependency slug doesn't match any node in the graph, it's silently skipped (the dependency might be an unregistered construct).

### 4.2 Explorer Search → API

**File**: `apps/explorer/lib/hooks/use-search.ts`

The existing Fuse.js hook stays for the **graph view** (needs all nodes pre-loaded for visualization). For the **catalog list page**, we add an API-backed search:

**File**: `apps/explorer/lib/hooks/use-api-search.ts` (new)

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.constructs.network';

export function useAPISearch(query: string, debounceMs = 300) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/v1/constructs?q=${encodeURIComponent(query)}&per_page=20`
        );
        const json = await res.json();
        setResults(json.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, debounceMs]);

  return { results, loading, hasQuery: query.trim().length > 0 };
}
```

**Integration**: The constructs list page (`apps/explorer/app/(marketing)/constructs/page.tsx`) switches from local `useSearch` to `useAPISearch` when the user types a search query. The graph view continues using the existing Fuse.js hook.

### 4.3 Construct Type Display

**File**: `apps/explorer/lib/data/fetch-constructs.ts:6-45`

Add to `APIConstruct`:
```typescript
construct_type?: string;
```

**File**: `apps/explorer/lib/types/graph.ts`

Add to `ConstructNode` and `ConstructDetail`:
```typescript
constructType: string;
```

**File**: `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx`

Display construct type as a subtle label in the header area, next to the existing type badge. Map archetype to display label:

```typescript
const ARCHETYPE_LABELS: Record<string, string> = {
  'skill-pack': 'Skill Pack',
  'tool-pack': 'Tool Pack',
  'codex': 'Knowledge Base',
  'template': 'Template',
};
```

---

## 5. Seed Script Design

### 5.1 `construct.yaml` Parsing

**File**: `scripts/seed-forge-packs.ts:148-154`

Add `js-yaml` import and YAML parsing fallback:

```typescript
import { load as yamlLoad } from 'js-yaml';

// In discoverPacks():
if (existsSync(manifestPath)) {
  const content = await readFile(manifestPath, 'utf-8');
  manifest = JSON.parse(content) as PackManifest;
} else {
  // Try construct.yaml (newer format)
  const yamlPath = join(repoDir, 'construct.yaml');
  if (existsSync(yamlPath)) {
    const yamlContent = await readFile(yamlPath, 'utf-8');
    const parsed = yamlLoad(yamlContent) as Record<string, unknown>;
    manifest = transformConstructYaml(parsed);
  } else {
    console.warn(`   Skipping ${slug}: no manifest.json or construct.yaml found`);
    continue;
  }
}
```

**Transform function**: Maps `construct.yaml` shape to `PackManifest`:

```typescript
function transformConstructYaml(yaml: Record<string, unknown>): PackManifest {
  const metadata = yaml.metadata as Record<string, unknown> || {};
  return {
    name: String(metadata.name || yaml.name || ''),
    slug: String(metadata.slug || yaml.slug || ''),
    version: String(metadata.version || yaml.version || '0.0.0'),
    description: String(metadata.description || yaml.description || ''),
    type: String(yaml.type || yaml.kind || 'skill-pack'),
    // Map skills from spec or skills field
    skills: extractSkillsFromYaml(yaml),
  };
}
```

### 5.2 Identity Parsing in Seed

After manifest parsing, check for `identity/persona.yaml` and `identity/expertise.yaml`:

```typescript
// After manifest parsing:
const identityDir = join(repoDir, 'identity');
if (existsSync(identityDir)) {
  const personaPath = join(identityDir, 'persona.yaml');
  const expertisePath = join(identityDir, 'expertise.yaml');
  pack.identity = {
    personaYaml: existsSync(personaPath) ? await readFile(personaPath, 'utf-8') : null,
    expertiseYaml: existsSync(expertisePath) ? await readFile(expertisePath, 'utf-8') : null,
  };
}
```

---

## 6. Webhook Configuration Script

**File**: `scripts/configure-webhooks.sh` (new)

```bash
#!/usr/bin/env bash
set -euo pipefail

WEBHOOK_URL="https://api.constructs.network/v1/webhooks/github"
REPOS=(
  "0xHoneyJar/construct-observer"
  "0xHoneyJar/construct-artisan"
  "0xHoneyJar/construct-crucible"
  "0xHoneyJar/construct-beacon"
  "0xHoneyJar/construct-gtm-collective"
)

# Require GITHUB_WEBHOOK_SECRET
if [[ -z "${GITHUB_WEBHOOK_SECRET:-}" ]]; then
  echo "Error: GITHUB_WEBHOOK_SECRET not set"
  exit 1
fi

for repo in "${REPOS[@]}"; do
  echo "Configuring webhook for $repo..."

  # Check if webhook already exists
  existing=$(gh api "repos/$repo/hooks" --jq ".[] | select(.config.url == \"$WEBHOOK_URL\") | .id" 2>/dev/null || true)

  if [[ -n "$existing" ]]; then
    echo "  Webhook already exists (id: $existing), updating..."
    gh api "repos/$repo/hooks/$existing" \
      --method PATCH \
      -f "config[url]=$WEBHOOK_URL" \
      -f "config[content_type]=json" \
      -f "config[secret]=$GITHUB_WEBHOOK_SECRET" \
      -F "active=true" \
      --input - <<< '{"events": ["push", "create"]}'
  else
    echo "  Creating webhook..."
    gh api "repos/$repo/hooks" \
      --method POST \
      -f "config[url]=$WEBHOOK_URL" \
      -f "config[content_type]=json" \
      -f "config[secret]=$GITHUB_WEBHOOK_SECRET" \
      -F "active=true" \
      --input - <<< '{"events": ["push", "create"]}'
  fi

  echo "  Done."
done

echo "All webhooks configured."
```

---

## 7. Sprint Breakdown

### Sprint 1: Type System Foundation

**Files modified**:
1. `apps/api/src/db/schema.ts` — Add `constructType` column + index
2. `apps/api/drizzle/0006_construct_type.sql` — Migration (new)
3. `apps/api/drizzle/meta/_journal.json` — Sync entries for 0003-0006
4. `apps/api/src/services/packs.ts` — Add `constructType` to `CreatePackInput` + `createPack`
5. `apps/api/src/routes/constructs.ts` — Persist type at registration, update list filter enum
6. `apps/api/src/routes/packs.ts` — Extract type during sync
7. `apps/api/src/services/constructs.ts` — Add `constructType` to Construct interface, packToConstruct, fetchPacksAsConstructs filter, listConstructs archetype routing

### Sprint 2: Explorer Reality

**Files modified**:
1. `apps/explorer/lib/data/fetch-constructs.ts` — Replace `computeEdges()`, add `construct_type` to `APIConstruct`
2. `apps/explorer/lib/types/graph.ts` — Add `constructType` to ConstructNode/ConstructDetail
3. `apps/explorer/lib/hooks/use-api-search.ts` — New hook (new)
4. `apps/explorer/app/(marketing)/constructs/page.tsx` — Wire API search
5. `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx` — Show construct type label

### Sprint 3: Operational Closure

**Files modified**:
1. `scripts/seed-forge-packs.ts` — construct.yaml parsing + identity
2. `scripts/configure-webhooks.sh` — Webhook config (new)
3. `.env.example` — Document `GITHUB_WEBHOOK_SECRET`
4. `package.json` (root or scripts) — Add `js-yaml` dev dependency

---

## 8. Technical Risks

| Risk | Mitigation |
|------|-----------|
| Drizzle journal mismatch on next `drizzle-kit` run | All migration SQL uses `IF NOT EXISTS`. Journal entries use approximate timestamps. Run `drizzle-kit push --dry-run` before any production change. |
| `listConstructs` cache invalidation | Archetype filters use a new cache key pattern. Existing cached results expire naturally (TTL-based). No manual cache flush needed. |
| `computeEdges()` returns empty for all constructs | Manifests must have `pack_dependencies` or `composes_with` fields. All 5 pack manifests at schema_version 3 should have these. Graceful fallback: zero edges is better than fake edges. |
| Seed script YAML parsing misses edge cases | Use `js-yaml` safe load. Validate output against `PackManifest` interface. Log and skip malformed manifests. |

---

## Next Step

`/sprint-plan` — Break into task-level granularity with acceptance criteria per task.
