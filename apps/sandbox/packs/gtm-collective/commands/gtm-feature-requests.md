---
name: "gtm-feature-requests"
version: "1.0.0"
description: |
  Generate prioritized feature requests from GTM to dev.
  Analyzes GTM strategy against product reality to identify gaps.

arguments:
  - name: "format"
    type: "string"
    required: false
    description: "Output format: markdown (default), json, or beads"

agent: null
command_type: "wizard"

context_files:
  - path: "gtm-grimoire/context/product-reality.md"
    required: true
  - path: "gtm-grimoire/strategy/positioning.md"
    required: false
  - path: "gtm-grimoire/research/icp-profiles.md"
    required: false

pre_flight:
  - check: "file_exists"
    path: ".loa-setup-complete"
    error: "Loa setup has not been completed. Run /setup first."

  - check: "dir_exists"
    path: "gtm-grimoire"
    error: "GTM Collective not installed. Run mount-gtm.sh first."

  - check: "file_exists"
    path: "gtm-grimoire/context/product-reality.md"
    error: "Product reality not found. Run /sync-from-dev first."

outputs:
  - path: "gtm-grimoire/feature-requests.md"
    type: "file"
    description: "GTM-prioritized feature requests"
  - path: "loa-grimoire/context/gtm-requests.md"
    type: "file"
    description: "Feature requests for dev workflow"

mode:
  default: "foreground"
  background: false
---

# GTM Feature Requests

## Purpose

Generate prioritized feature requests based on GTM strategy gaps. Compares what GTM
needs for positioning vs what product actually delivers (from product-reality.md).

## Invocation

```
/gtm-feature-requests
/gtm-feature-requests json
/gtm-feature-requests beads
```

## When to Use

- After positioning reveals feature gaps
- After ICP analysis identifies unmet needs
- Before sprint planning to feed GTM priorities
- When GTM and dev need alignment on roadmap

## Workflow

### Step 1: Load Context

Read and analyze:
1. `gtm-grimoire/context/product-reality.md` - What product DOES
2. `gtm-grimoire/strategy/positioning.md` - What GTM CLAIMS
3. `gtm-grimoire/research/icp-profiles.md` - What ICPs NEED
4. `gtm-grimoire/strategy/pricing.md` - What tiers REQUIRE
5. `loa-grimoire/sprint.md` - What's PLANNED

### Step 2: Gap Analysis

Identify feature gaps by comparing:

**Positioning Gaps**:
- Claims made in positioning that lack technical support
- Differentiators that require implementation
- Competitive parity features missing

**ICP Gaps**:
- Use cases not fully supported
- Integrations required but not built
- Performance gaps vs expectations

**Pricing Gaps**:
- Features needed for free tier
- Features needed for paid differentiation
- Enterprise requirements not met

### Step 3: Prioritization

Apply priority framework:

| Priority | Criteria | Examples |
|----------|----------|----------|
| **P0** | Launch blocker | Core positioning claim unsupported, ICP primary use case broken |
| **P1** | Positioning enabler | Key differentiator enhancement, competitive parity |
| **P2** | Market expansion | Future ICP support, nice-to-have positioning |
| **P3** | Long-term | Vision features, exploratory |

### Step 4: Generate Feature Requests

Create `gtm-grimoire/feature-requests.md`:

```markdown
# GTM Feature Requests

**Generated**: YYYY-MM-DD HH:MM UTC
**Source Analysis**:
- Product Reality: [sync date]
- Positioning: [version/date]
- ICP Profiles: [count] profiles

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| P0 (Launch Blocker) | [N] | [X] addressed |
| P1 (Positioning Enabler) | [N] | [X] addressed |
| P2 (Market Expansion) | [N] | [X] addressed |
| P3 (Long-term) | [N] | [X] addressed |

---

## P0: Launch Blockers

These features MUST be implemented before launch.

### FR-001: [Feature Name]

**Gap Source**: [Positioning / ICP / Pricing]
**Current State**: [What exists now]
**Required State**: [What GTM needs]

**Business Justification**:
[Why this is P0 - specific GTM impact]

**Acceptance Criteria**:
- [ ] [Criterion 1]
- [ ] [Criterion 2]

**ICP Impact**: [Which ICPs blocked]
**Positioning Impact**: [Which claims unsupported]

---

### FR-002: [Feature Name]

[Same structure]

---

## P1: Positioning Enablers

These features significantly strengthen positioning.

### FR-003: [Feature Name]

[Same structure as P0]

---

## P2: Market Expansion

These features enable new markets or ICPs.

### FR-004: [Feature Name]

[Same structure]

---

## P3: Long-term Vision

Strategic features for future positioning.

### FR-005: [Feature Name]

[Same structure]

---

## Dependency Map

```
FR-001 ──┬──▶ FR-003
         │
FR-002 ──┴──▶ FR-004
```

## Recommended Sprint Integration

| Sprint | Feature Requests | Focus |
|--------|-----------------|-------|
| Next | FR-001, FR-002 | Launch blockers |
| +1 | FR-003 | Positioning strength |
| +2 | FR-004, FR-005 | Market expansion |

---
*Generated via /gtm-feature-requests*
*Review with dev team before sprint planning*
```

### Step 5: Create Dev-Facing Copy

Create `loa-grimoire/context/gtm-requests.md`:

Same content as feature-requests.md but placed in dev workflow context for
easy access during sprint planning.

### Step 6: Beads Integration (if format=beads)

If Beads (bd CLI) is available and format=beads:

```bash
# Create feature request as Beads issues
for each P0/P1 feature:
  bd create --title="[GTM] FR-XXX: [title]" \
    --type=feature \
    --priority=[0-3] \
    --labels=gtm,feature-request
```

Output mapping to stdout for manual execution if bd not available.

## Output Formats

### Markdown (default)

Full feature request document as shown above.

### JSON

```json
{
  "generated": "YYYY-MM-DDTHH:MM:SSZ",
  "summary": {
    "p0": 2,
    "p1": 3,
    "p2": 4,
    "p3": 1
  },
  "requests": [
    {
      "id": "FR-001",
      "title": "Feature Name",
      "priority": "P0",
      "source": "positioning",
      "current_state": "...",
      "required_state": "...",
      "acceptance_criteria": ["...", "..."],
      "icp_impact": ["ICP1", "ICP2"],
      "positioning_impact": ["Claim 1"]
    }
  ]
}
```

### Beads

Outputs `bd create` commands for each feature request.

## Next Steps

After generating feature requests:
- Review with dev team
- Integrate P0/P1 into sprint planning
- Track implementation via `/sync-from-dev`
- Re-run after major positioning changes
