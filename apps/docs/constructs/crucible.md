---
name: Crucible
slug: crucible
version: "1.0.0"
category: security
type: untyped
schema_version: 3
skills: 5
commands: 0
tags:
  - construct
  - category/security
---

# Crucible

> Validation and testing skills for journey verification. The loop that checks whether what you built matches what you observed.

**Version**: 1.0.0 · **Category**: security · **Skills**: 5

## Install

```bash
loa install crucible
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/validating-journeys` | Generate and run Playwright tests from state diagrams |
| `/grounding-code` | Extract code reality into structured documentation |
| `/iterating-feedback` | Trace test failures back to upstream artifacts |
| `/walking-through` | Guided interactive browser walkthrough with gap discovery |
| `/diagramming-states` | Generate Mermaid state diagrams from journey definitions |

## Relationships

### Composes With

- [Beehive](/constructs/observer) — bidirectional validation loop (circular hard dep — [DEP-001](/network/health))

### Composition Paths

**Reads from:**
- `grimoires/laboratory/` (canvases and journeys from Beehive)

**Writes to:**
- `grimoires/crucible/` (validation reports)

## Operator Mode

Crucible maps to **ARCH mode** (persona: OSTROM). [See Operator Modes &rarr;](/network/operator)

## Verification Archetype

**Security construct** — findings should be real vulnerabilities or real gaps. [Verification guide &rarr;](/verification/verification-guide#_5-security-constructs-findings-are-real-vulnerabilities)

## Source

- **Repo**: `0xHoneyJar/construct-crucible`
- **Cache**: `.cache/construct-repos/construct-crucible/`
- **Grimoire**: `grimoires/crucible/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)
