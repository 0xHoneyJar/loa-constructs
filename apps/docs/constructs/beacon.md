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
| `/beacon` | Generate AI discoverability layer for a project |
| `/llms-txt` | Generate llms.txt for AI agent consumption |
| `/robots-audit` | Audit robots.txt and crawl configuration |
| `/trust-signals` | Add structured trust signals (JSON-LD, meta) |
| `/sitemap` | Generate or audit XML sitemap |
| `/x402` | Configure x402 payment endpoints |

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
