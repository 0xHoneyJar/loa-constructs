---
name: Social Oracle
slug: social-oracle
version: "1.0.0"
category: marketing
type: untyped
schema_version: 3
skills: 0
commands: 3
tags:
  - construct
  - category/marketing
---

# Social Oracle

> Converts GitHub PR/Release activity into platform-specific social media content via 3-layer signal filter and per-project voice grimoires.

**Version**: 1.0.0 · **Category**: marketing · **Commands**: 3

## Install

```bash
loa install social-oracle
```

## Commands

| Command | What it does |
|---------|-------------|
| `social-oracle generate` | Generate social content from PR/release |
| `social-oracle filter` | Apply 3-layer signal filter to content |
| `social-oracle voice` | Load project voice grimoire |

## Relationships

### Governed By

- [Vocabulary Bank](/constructs/vocabulary-bank) — voice governance for social content

## Operator Mode

Social Oracle is a **SHIP mode** construct (persona: BARTH). [See Operator Modes &rarr;](/network/operator)

## Verification Archetype

**Communication construct** — output translates GitHub activity into social content. Verification checks whether claims match the source PR/release. [Verification guide &rarr;](/verification/verification-guide#_4-communication-constructs-output-matches-the-artifact)

## Source

- **Repo**: `0xHoneyJar/construct-social-oracle`
- **Cache**: `.cache/construct-repos/construct-social-oracle/`
- **Grimoire**: `grimoires/social-oracle/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)
