---
name: "sync-from-dev"
version: "1.0.0"
description: |
  Sync development artifacts into GTM context.
  Updates product-reality.md from PRD/SDD/sprint changes.

arguments:
  - name: "force"
    type: "boolean"
    required: false
    description: "Force overwrite even if recent sync exists"

agent: null
command_type: "wizard"

context_files:
  - path: "loa-grimoire/prd.md"
    required: true
  - path: "loa-grimoire/sdd.md"
    required: false
  - path: "loa-grimoire/sprint.md"
    required: false

pre_flight:
  - check: "file_exists"
    path: ".loa-setup-complete"
    error: "Loa setup has not been completed. Run /setup first."

  - check: "dir_exists"
    path: "gtm-grimoire"
    error: "GTM Collective not installed. Run mount-gtm.sh first."

  - check: "file_exists"
    path: "loa-grimoire/prd.md"
    error: "PRD not found. Run /plan-and-analyze or create loa-grimoire/prd.md first."

outputs:
  - path: "gtm-grimoire/context/product-reality.md"
    type: "file"
    description: "Updated product reality from dev artifacts"
  - path: "gtm-grimoire/NOTES.md"
    type: "append"
    description: "Sync timestamp logged"

mode:
  default: "foreground"
  background: false
---

# Sync From Dev

## Purpose

Synchronize development artifacts (PRD, SDD, sprint.md) into GTM context. This ensures
GTM strategies stay grounded in actual product capabilities as development evolves.

## Invocation

```
/sync-from-dev
/sync-from-dev force
```

## When to Use

- After PRD is updated with new features
- After SDD is modified with architecture changes
- After sprint completion adds new capabilities
- Before creating GTM content (to ensure grounding)

## Workflow

### Step 1: Read Development Artifacts

Read and analyze:
1. `loa-grimoire/prd.md` - Current product requirements
2. `loa-grimoire/sdd.md` - Technical architecture (if exists)
3. `loa-grimoire/sprint.md` - Sprint plan and completed work (if exists)

### Step 2: Extract Product Capabilities

From PRD, extract:
- Product vision and problem statement
- Feature list with current status (implemented vs planned)
- Target users and use cases
- Success metrics and KPIs

From SDD, extract:
- Architecture overview
- Technical capabilities
- Integration points
- Performance characteristics
- Technical constraints/limitations

From sprint.md, extract:
- Completed sprints and delivered features
- Current sprint scope
- Upcoming features (planned)

### Step 3: Check Existing GTM Context

Read existing files (if present):
- `gtm-grimoire/context/product-reality.md`
- `gtm-grimoire/context/product-brief.md`

Identify:
- What GTM content already exists
- What needs updating
- What should be preserved

### Step 4: Generate Updated Product Reality

Create/update `gtm-grimoire/context/product-reality.md`:

```markdown
# Product Reality

**Synced From**: loa-grimoire/
**Last Sync**: YYYY-MM-DD HH:MM UTC
**Source Versions**:
- PRD: [hash or version]
- SDD: [hash or version]
- Sprint: [completed sprint count]

## Product Overview

[Extract from PRD - what the product is and does]

## Current Capabilities (Implemented)

List ONLY features that are implemented and working:
- [Feature 1] - [brief description]
- [Feature 2] - [brief description]
...

## Planned Capabilities (Roadmap)

Features planned but NOT yet implemented:
- [Future Feature 1] - [target sprint/timeline]
- [Future Feature 2] - [target sprint/timeline]
...

## Technical Architecture

[Summary from SDD]

## Integrations

[List of integration points and dependencies]

## Limitations

[Technical constraints, known limitations]

## Performance

[Performance characteristics, benchmarks if available]

---
**GROUNDING DOCUMENT**: All GTM claims must be verifiable against this document.
Positioning MUST NOT claim capabilities listed under "Planned" as current features.
```

### Step 5: Merge Strategy

When updating existing product-reality.md:
- **Preserve**: Manual annotations, GTM-specific notes
- **Update**: Capability lists, architecture summary
- **Flag**: Conflicts between old and new (highlight for review)

### Step 6: Log Sync

Append to `gtm-grimoire/NOTES.md`:

```markdown
## Dev Sync Status

| Timestamp | Direction | Summary |
|-----------|-----------|---------|
| YYYY-MM-DD HH:MM | dev→gtm | Synced from PRD v[x], SDD v[y], [N] completed sprints |
```

## Output Summary

After sync completes, display:
- Number of features synced (current vs planned)
- Files updated
- Any conflicts detected
- Timestamp of sync

## Next Steps

After syncing:
- Review `product-reality.md` for accuracy
- Run `/review-gtm` if GTM strategy exists (validates grounding)
- Update positioning if new features added

## Conflict Resolution

If conflicts detected (e.g., GTM claims features not in PRD):
1. List conflicts clearly
2. Recommend resolution (update GTM or verify PRD)
3. Do NOT auto-resolve - require human decision
