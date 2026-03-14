# SDD: Construct Composability Infrastructure — Grimoire Paths, Governance, Implicit Composition

**Cycle**: cycle-051
**Created**: 2026-03-13
**PRD**: `grimoires/loa/prd.md`
**Diagnostic**: `grimoires/loa/context/construct-composability-diagnostic.md`

---

## 1. Executive Summary

Make grimoire-path composition visible in the API and explorer. Add a governance primitive for cross-cutting constructs (vocabulary-bank, artisan/taste). No new runtime infrastructure — no event bus, no message broker, no pubsub.

**What changes**: Zod schema gains `paths.writes`, `paths.reads`, `governs`, `governed_by` fields. Seed script extracts these from construct.yaml manifests and stores them in the existing `pack_versions.manifest` JSONB column. API enrichment computes "connected via" overlapping paths across all constructs. Explorer gains a "Connected via" panel on detail pages and governance edges in the graph.

**What does not change**: No new database columns. No new tables. No schema migrations. All new fields live inside the existing manifest JSONB. The grimoire filesystem remains the composition medium.

---

## 2. System Architecture

### Data Flow: construct.yaml to Explorer

```
construct.yaml          seed-forge-packs.ts       pack_versions.manifest (JSONB)
┌──────────────┐        ┌──────────────────┐      ┌────────────────────────────┐
│ paths:       │        │ Zod validation   │      │ { ...,                     │
│   writes:    │───────►│ packManifestSchema│─────►│   paths: {writes, reads},  │
│     - grim/… │        │ (passthrough)    │      │   governs: [...],          │
│   reads:     │        └──────────────────┘      │   governed_by: [...]       │
│     - grim/… │                                  │ }                          │
│ governs: []  │                                  └─────────┬──────────────────┘
│ governed_by: │                                            │
└──────────────┘                                            ▼
                                                  API constructs service
                                                  ┌────────────────────────────┐
                                                  │ formatConstruct():         │
                                                  │   manifest.paths → paths   │
                                                  │   manifest.governs → gov   │
                                                  │                            │
                                                  │ computeConnectedVia():     │
                                                  │   cross-reference all      │
                                                  │   paths.writes/reads       │
                                                  │   across constructs        │
                                                  └─────────┬──────────────────┘
                                                            │
                                                            ▼
                                                  Explorer
                                                  ┌────────────────────────────┐
                                                  │ Detail: "Connected via"    │
                                                  │ Graph: governance edges    │
                                                  │ Graph: path-based edges    │
                                                  └────────────────────────────┘
```

### Key Architectural Decision: JSONB, Not Columns

All composability data lives in `pack_versions.manifest` (JSONB). Rationale:
- These fields are already part of the manifest schema (Zod passthrough)
- No queries filter BY paths or governance — they are display-only enrichment
- Zero migration risk — the JSONB column already exists and stores the full manifest
- The seed script already stores `fullManifest` including all validated fields

---

## 3. Component Design

### 3.1 Zod Schema Extension

**File**: `packages/shared/src/validation.ts`

The existing `constructPathsSchema` has `state`, `cache`, `output`. These are runtime directory paths (where the construct stores local state). The new `paths.writes` and `paths.reads` are composability paths (grimoire directories the construct produces to / consumes from). These are distinct concerns.

Add a new `compositionPathsSchema` alongside the existing `constructPathsSchema`:

```typescript
/** Grimoire composition paths — what this construct reads from and writes to */
export const compositionPathsSchema = z.object({
  writes: z.array(z.string().max(500)).max(50).optional(),
  reads: z.array(z.string().max(500)).max(50).optional(),
});
```

Extend `packManifestSchema` with:

```typescript
// Composability fields (cycle-051)
composition_paths: compositionPathsSchema.optional(),
governs: z.array(slugSchema).max(20).optional(),
governed_by: z.array(slugSchema).max(20).optional(),
```

**Note on field naming**: The PRD says `paths.writes` / `paths.reads`. However, the existing `paths` field in the Zod schema (`constructPathsSchema`) serves a different purpose (runtime directories). To avoid collision and ambiguity, the manifest field is `composition_paths` with `writes` and `reads` sub-fields. In construct.yaml files, authors can use the more natural nesting:

```yaml
# construct.yaml — what authors write
composition_paths:
  writes:
    - grimoires/laboratory/canvases/
    - grimoires/laboratory/synthesis/
  reads:
    - grimoires/laboratory/canvases/
```

**Type exports** to add:

```typescript
export type CompositionPaths = z.infer<typeof compositionPathsSchema>;
```

### 3.2 Seed Script Path Extraction

**File**: `scripts/seed-forge-packs.ts`

The seed script already validates `construct.yaml` through `packManifestSchema` and stores the full validated manifest in `pack_versions.manifest` JSONB. Because the Zod schema uses `.passthrough()` and we are adding `composition_paths`, `governs`, `governed_by` as explicit schema fields, no seed script changes are needed for storage.

The `normalizeForValidation()` function needs one addition — if a construct.yaml uses the shorthand `paths.writes` / `paths.reads` (which collides with the existing `constructPathsSchema`), normalize it to `composition_paths`:

```typescript
// In normalizeForValidation():
// paths.writes/reads shorthand → composition_paths
if (normalized.paths && typeof normalized.paths === 'object') {
  const p = normalized.paths as Record<string, unknown>;
  if (Array.isArray(p.writes) || Array.isArray(p.reads)) {
    // This is a composition paths declaration, not runtime paths
    normalized.composition_paths = {
      writes: Array.isArray(p.writes) ? p.writes : undefined,
      reads: Array.isArray(p.reads) ? p.reads : undefined,
    };
    // Preserve runtime paths (state, cache, output) if present
    const runtimePaths: Record<string, unknown> = {};
    if (p.state) runtimePaths.state = p.state;
    if (p.cache) runtimePaths.cache = p.cache;
    if (p.output) runtimePaths.output = p.output;
    normalized.paths = Object.keys(runtimePaths).length > 0 ? runtimePaths : undefined;
  }
}
```

**Dry-run enhancement**: The `--dry-run` output should log composition_paths and governance for each construct:

```
  ✓ VALID  observer (v3.2.0) — 29 skills, 45 manifest fields
          → composition_paths: writes=3, reads=1
          → governs: []  governed_by: [vocabulary-bank]
```

### 3.3 API Enrichment — Paths and Governance in Response

**File**: `apps/api/src/routes/constructs.ts`

The `formatConstruct()` and `formatConstructDetail()` functions read from `c.manifest` which is the full JSONB manifest. The manifest already contains `composition_paths`, `governs`, `governed_by` after seed — they just need to be surfaced explicitly.

Update `formatConstructDetail()`:

```typescript
function formatConstructDetail(c: Construct) {
  const manifest = c.manifest as Record<string, unknown> | null;
  return {
    ...formatConstruct(c),
    // ... existing fields ...
    // Composability (cycle-051)
    composition_paths: manifest?.composition_paths ?? null,
    governs: manifest?.governs ?? null,
    governed_by: manifest?.governed_by ?? null,
  };
}
```

For the list endpoint (`formatConstruct`), add composition_paths to enable graph edge computation on the frontend without requiring N detail fetches:

```typescript
function formatConstruct(c: Construct) {
  const manifest = c.manifest as Record<string, unknown> | null;
  return {
    // ... existing fields ...
    // Composability summary (cycle-051) — needed for graph edge computation
    composition_paths: manifest?.composition_paths ?? null,
    governs: manifest?.governs ?? null,
    governed_by: manifest?.governed_by ?? null,
  };
}
```

### 3.4 Compute "Connected Via" from Overlapping Paths

**File**: `apps/explorer/lib/data/fetch-constructs.ts`

Add a function that computes implicit composition edges by cross-referencing `composition_paths.writes` and `composition_paths.reads` across all constructs. This runs client-side in the explorer's data layer (not on the API) because it requires all constructs in memory — which the graph page already fetches.

```typescript
interface PathConnection {
  sourceSlug: string;      // The writer
  targetSlug: string;      // The reader
  sharedPath: string;      // The grimoire path they share
}

function computePathConnections(constructs: APIConstruct[]): PathConnection[] {
  const connections: PathConnection[] = [];

  // Build writer index: path → [slugs that write to it]
  const writerIndex = new Map<string, string[]>();
  for (const c of constructs) {
    const writes = c.manifest?.composition_paths?.writes;
    if (!Array.isArray(writes)) continue;
    for (const path of writes) {
      if (!writerIndex.has(path)) writerIndex.set(path, []);
      writerIndex.get(path)!.push(c.slug);
    }
  }

  // For each reader, find matching writers
  for (const c of constructs) {
    const reads = c.manifest?.composition_paths?.reads;
    if (!Array.isArray(reads)) continue;
    for (const path of reads) {
      const writers = writerIndex.get(path) || [];
      for (const writerSlug of writers) {
        if (writerSlug === c.slug) continue; // Skip self
        connections.push({
          sourceSlug: writerSlug,
          targetSlug: c.slug,
          sharedPath: path,
        });
      }
    }
  }

  return connections;
}
```

Integrate into `computeEdges()` to add `'connected_via'` edges alongside existing `'depends_on'` and `'composes_with'` edges.

### 3.5 Composition Validation (Advisory)

**File**: `scripts/validate-composition.ts` (new)

A standalone validation script (not part of seed) that checks:

1. **Ghost wires**: `composition_paths.reads` paths with no matching writer across the network
2. **Orphan outputs**: `composition_paths.writes` paths with no matching reader
3. **Governance consistency**: If A declares `governs: [B]`, then B should declare `governed_by: [A]`
4. **Placeholder cleanup**: Any remaining `consumes: ['?']` entries

Output format:

```
Composition Validation Report
═══════════════════════════════

Ghost Wires (reader with no writer):
  ⚠ crucible reads grimoires/laboratory/canvases/ — no known writer

Orphan Outputs (writer with no reader):
  ℹ herald writes grimoires/comms/releases/ — no known reader

Governance Mismatches:
  ⚠ vocabulary-bank governs [artisan] but artisan does not declare governed_by: [vocabulary-bank]

Placeholder Consumers:
  ✗ hardening has consumes: ['?'] — replace with real events or remove

Summary: 2 warnings, 1 info, 1 error
```

This script reads from the cloned repos in `.cache/construct-repos/` (same as seed). It is advisory — warnings do not block seed or publish.

### 3.6 Explorer "Connected Via" Panel on Detail Page

**File**: `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx`

Add a "Connected via" section in Tier 2 (The Scan), between "Composes with" and "Commands". This section shows grimoire paths this construct shares with others and governance relationships.

**Data requirements**: The detail page already fetches the full construct via `fetchConstruct(slug)`. The new fields (`composition_paths`, `governs`, `governed_by`) come from the API detail response. To show "connected via" labels (which constructs share a path), the detail page also needs the graph data — or a lightweight API endpoint.

**Approach**: Use the existing graph data fetcher (`fetchGraphData()`) on the detail page to get all constructs' `composition_paths`, then compute connections client-side. Cache the graph data (already has `revalidate = 3600`).

**UI structure**:

```
┌─────────────────────────────────────────────────┐
│ Connected via                                    │
│                                                  │
│ grimoires/laboratory/canvases/                   │
│   ← reads from: observer                        │
│   → writes to: (this construct)                  │
│                                                  │
│ Governs                                          │
│   vocabulary-bank → constrains this construct    │
│                                                  │
│ Governed by                                      │
│   this construct → constrains artisan, the-easel │
└─────────────────────────────────────────────────┘
```

**Types update** in `apps/explorer/lib/types/graph.ts`:

```typescript
export type EdgeRelationship = 'contains' | 'depends_on' | 'composes_with' | 'connected_via' | 'governs';
```

Add to `ConstructDetail`:

```typescript
export interface ConstructDetail extends ConstructNode {
  // ... existing fields ...
  // Composability (cycle-051)
  compositionPaths: { writes?: string[]; reads?: string[] } | null;
  governs: string[];
  governedBy: string[];
  connectedVia: Array<{ slug: string; path: string; direction: 'reads' | 'writes' }>;
}
```

### 3.7 Governance Edges in Graph Visualization

**File**: `apps/explorer/components/graph/network-graph.tsx`

Add governance edges as visually distinct lines in the 3D graph.

**Edge styling**:

| Edge Type | Color | Style | Opacity |
|-----------|-------|-------|---------|
| `depends_on` | `#4ecdc4` (cyan) | Solid | 0.6 |
| `composes_with` | `#a8e6cf` (green) | Solid | 0.4 |
| `connected_via` | `#ffd93d` (amber) | Dashed | 0.3 |
| `governs` | `#ff6b6b` (coral) | Dashed | 0.5 |

Governance edges are directional — from the governing construct to the governed construct. The `computeEdges()` function in `fetch-constructs.ts` adds them:

```typescript
// Extract governs relationships
const governs = construct.manifest?.governs;
if (Array.isArray(governs)) {
  for (const governedSlug of governs) {
    const targetId = slugToId.get(governedSlug);
    if (targetId && targetId !== sourceId) {
      edges.push({
        id: `${sourceId}-gov-${targetId}`,
        source: sourceId,
        target: targetId,
        relationship: 'governs',
      });
    }
  }
}
```

Path-based edges (`connected_via`) are computed by the `computePathConnections()` function from 3.4.

---

## 4. Data Architecture

### No Schema Changes

All composability data is stored in the existing `pack_versions.manifest` JSONB column. The seed script already stores the full validated manifest. Adding `composition_paths`, `governs`, `governed_by` to the Zod schema means they get validated and included in the JSONB automatically.

### Manifest JSONB Shape (after cycle-051)

```jsonc
{
  // Existing fields (unchanged)
  "name": "observer",
  "slug": "observer",
  "version": "3.2.0",
  "composes_with": ["artisan", "crucible"],
  // ...

  // New fields (cycle-051)
  "composition_paths": {
    "writes": [
      "grimoires/laboratory/canvases/",
      "grimoires/laboratory/synthesis/"
    ],
    "reads": [
      "grimoires/laboratory/journeys/"
    ]
  },
  "governs": [],
  "governed_by": ["vocabulary-bank"]
}
```

### Backwards Compatibility

- All new fields are optional in the Zod schema
- The schema uses `.passthrough()` — existing manifests with unknown fields are unaffected
- API responses include new fields as `null` when absent — existing frontend code ignores unknown keys
- Explorer components conditionally render based on field presence

---

## 5. Sprint Mapping

### Sprint 1: Schema + API + Audit (The Data Foundation)

**Goal**: Every construct has declared composition_paths and governance. The API surfaces them.

| Task | Component | Deliverable |
|------|-----------|-------------|
| T1.1 | Zod schema | Add `compositionPathsSchema`, `governs`, `governed_by` to `packManifestSchema` |
| T1.2 | Seed normalization | Add `paths.writes/reads` → `composition_paths` normalization in `normalizeForValidation()` |
| T1.3 | API formatters | Surface `composition_paths`, `governs`, `governed_by` in `formatConstruct()` and `formatConstructDetail()` |
| T1.4 | Explorer types | Add `connected_via` and `governs` to `EdgeRelationship`, extend `ConstructDetail` and `APIConstruct` |
| T1.5 | Construct audit | Audit all 23 constructs' SKILL.md for actual grimoire reads/writes, populate construct.yaml |
| T1.6 | Governance audit | Identify and declare governance relationships (vocabulary-bank, artisan/taste, surveying-patterns) |
| T1.7 | Placeholder cleanup | Remove all `consumes: ['?']` placeholders from construct repos |
| T1.8 | Seed + verify | Run seed against production, verify JSONB contains composition data |

### Sprint 2: Validation + Explorer (The Visible Payoff)

**Goal**: Users see composition in the explorer. Authors get validation feedback.

| Task | Component | Deliverable |
|------|-----------|-------------|
| T2.1 | Validation script | `scripts/validate-composition.ts` — ghost wires, orphan outputs, governance mismatches |
| T2.2 | Path connections | `computePathConnections()` in explorer data layer |
| T2.3 | Detail panel | "Connected via" section on construct detail page |
| T2.4 | Graph edges | `connected_via` and `governs` edges in `computeEdges()` |
| T2.5 | Graph styling | Dashed lines + distinct colors for new edge types in network-graph |
| T2.6 | Edge type legend | Add edge type legend to graph UI |
| T2.7 | Integration test | Verify end-to-end: seed → API → explorer detail → graph edges |
