---
name: Sigil of the Beacon
slug: beacon
version: "2.0.0"
category: operations
type: untyped
schema_version: 3
skills: 6
commands: 0
tags:
  - construct
  - category/operations
  - topology/island
---

# Sigil of the Beacon

> Makes your project discoverable to the agent network. AI-retrievable content, trust signals, and x402 payment endpoints — the infrastructure that lets other constructs find and verify you.

**Version**: 2.0.0 · **Category**: operations · **Skills**: 6

## Install

```bash
loa install beacon
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/auditing-content` | Audit content for SEO and discoverability issues |
| `/generating-markdown` | Generate optimized markdown documentation |
| `/optimizing-chunks` | Optimize content chunking for AI and search |
| `/discovering-endpoints` | Discover and document API endpoints with schema markup |
| `/defining-actions` | Define schema.org actions for interactive features |
| `/accepting-payments` | Add payment-related structured data and schemas |

## Relationships

### Island

Beacon has no declared relationships. It could compose with [Herald](/constructs/herald) (announce what beacon exposes). See [Topology &rarr; Islands](/architecture/topology#islands).

### Composition Paths

**Writes to:**
- `grimoires/beacon/` (audit results, generated files)

## Operator Mode

Beacon appears in both **ARCH mode** and **SHIP mode** — build the discoverability layer, then activate it post-ship. [See Operator Modes &rarr;](/network/operator)

## Verification Archetype

**Observable construct** — output makes claims about discoverability. Verification checks whether generated files match the actual project state. [Verification guide &rarr;](/verification/verification-guide#_1-observable-constructs-output-matches-reality)

## Source

- **Repo**: `0xHoneyJar/construct-beacon`
- **Cache**: `.cache/construct-repos/construct-beacon/`
- **Grimoire**: `grimoires/beacon/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)
