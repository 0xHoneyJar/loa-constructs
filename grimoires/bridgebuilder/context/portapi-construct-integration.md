# portAPI × Constructs: From Files to Graph Artifacts

> How construct distribution evolves in the agentic age. Study brief from portAPI (0xHoneyJar/portAPI) applied to loa-constructs.

## The Shift

| Dimension | File-Based (Today) | Graph-Based (portAPI) |
|---|---|---|
| Identity | `manifest.json` + `construct.yaml` on disk | Artifact node with HMUID in knowledge graph |
| Discovery | `construct-resolve.sh` scans static index | Recipe-driven `pack_plan` → sufficiency check → assembly |
| Installation | Copy files to `.claude/constructs/packs/` | Publish artifact to `library` domain, link via edges |
| Composition | read/write path overlap heuristic | Typed edges (`COMPOSES_WITH`, `DERIVES_FROM`) |
| Quality | Manual schema hygiene sprints | Tier gates: draft → staged → canonical with evidence requirements |
| Versioning | `version` string in YAML | `rev_NNNN` with `supersedes` chain |
| Authorization | Trust-by-installation (if it's on disk, it's trusted) | Capability grants with scoped tokens, engines publish draft only |
| Failure Mode | Silent skip (pack missing manifest.json → invisible) | Sufficiency report: exactly what's missing + suggested action |

## Key portAPI Patterns for Constructs

### 1. Sufficiency > Dependency Resolution

Traditional package managers resolve dependency trees. portAPI checks **sufficiency** — does the graph contain what the recipe needs?

For constructs, this means: instead of "install artisan" → hope it works, the system checks:
- Does the pack have a persona file? (required for L2 name resolution)
- Does it declare read/write paths? (required for L3 composition)
- Does it have evidence of successful use? (required for canonical tier)

If insufficient → actionable message: "Construct 'artisan' is missing persona_path. Expected at: identity/ALEXANDER.md"

### 2. Recipe-Driven Pack Building

When an agent enters FEEL mode, instead of "read files at known paths", it requests:
```
recipe: "FEEL_MODE_CONTEXT"
sufficiency:
  requires_edges: [persona, skill_set, taste_tokens]
  requires_evidence_min: 0  # draft allowed for local-only
budgets:
  max_artifacts: 10
  max_excerpt_bytes: 50000
selection_policy:
  tier_preference: [canonical, staged, draft]
```

The system assembles the right context — persona, relevant TDRs, active taste tokens, composition partners — and explains why each piece was included.

### 3. Artifacts as Structured Objects

A construct in portAPI terms:
```json
{
  "kind": "artifact",
  "domain_id": "library",
  "subtype": "ConstructPack",
  "tier": "canonical",
  "title": "Artisan — Craft Engineering",
  "fields": {
    "persona_path": "identity/ALEXANDER.md",
    "skills": ["analyzing-feedback", "animating-motion", ...],
    "composition_paths": {
      "reads": ["grimoires/the-easel/"],
      "writes": ["grimoires/the-easel/tdr/"]
    },
    "gates": { "implement": "required", "review": "visual" }
  },
  "tags": ["craft", "ui", "motion", "design-system"]
}
```

This is the same data as construct.yaml — but discoverable, queryable, and governable.

### 4. Trust Tiers for Constructs

- **Draft**: Experimental construct. Unverified persona, untested skills. Used in local dev only.
- **Staged**: Proven in at least one repo. Has evidence (session logs, user confirmation). Can be shared.
- **Canonical**: Battle-tested across multiple repos/users. Full schema compliance. The standard.
- **Archived**: Superseded or deprecated. Still queryable for history.

Engines (agents) can create draft constructs. Humans promote them. No approval laundering.

## Immediate vs Future

### Now (file-based, proven locally first)
- Fix construct-index-gen.sh to accept construct.yaml as primary source
- Add sufficiency messaging (inspired by portAPI's `pack_plan` gap reporting)
- Populate persona_path, reads, writes, gates in the 27 construct.yaml files
- Self-healing index: auto-regenerate when stale or missing

### Next (local portAPI adapter)
- Construct resolution queries a local graph (sqlite or JSONL) instead of YAML index
- Pack building via local recipes — agent requests mode context, system assembles
- Promotion tracking: which constructs have evidence of value in this repo?

### Future (networked portAPI)
- Constructs published to Port as library artifacts
- Cross-org discovery — install constructs from the graph, not git clone
- Evidence-weighted quality scoring — constructs that produce good outcomes rank higher
- Recipe marketplace — community-contributed context pack recipes

## Design Principles (from portAPI study)

1. **Sufficiency over dependency** — tell me what's missing, don't silently fail
2. **Describe over prescribe** — structured artifacts, not file conventions
3. **Tiers over trust-by-installation** — earned trust through evidence
4. **Recipes over paths** — request context by intent, not by file location
5. **Agents don't browse file trees** — they request what they need

## Evidence

- portAPI repo: `0xHoneyJar/portAPI` (29 schemas, 3 registries, 5 example payloads)
- Key schemas: `artifact.json`, `edge.json`, `recipe.json`, `pack_build.json`, `pack_manifest.json`
- Lifecycle registry: `draft → staged → canonical → archived` with transition requirements
- Domain registry: 6 domains, per-domain governance, evidence weighting
- Session discovery: 2026-03-28, rektdrop-interface construct DX audit
