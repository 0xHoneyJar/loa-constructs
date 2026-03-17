---
name: Social Oracle
slug: social-oracle
version: "1.0.0"
category: marketing
type: untyped
schema_version: 3
skills: 5
commands: 3
tags:
  - construct
  - category/marketing
---

# Social Oracle

> Converts GitHub PR/Release activity into platform-specific social media content via 3-layer signal filter and per-project voice grimoires.

**Version**: 1.0.0 · **Category**: marketing · **Skills**: 5 · **Commands**: 3

## Install

```bash
loa install social-oracle
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/filter` | Apply 3-layer signal filter to content |
| `/generate-x` | Generate X/Twitter content from PR/release |
| `/generate-discord` | Generate Discord content from PR/release |
| `/generate-telegram` | Generate Telegram content from PR/release |
| `/configure-project` | Configure project voice and settings |

## Commands

| Command | What it does |
|---------|-------------|
| `oracle` | Generate social content from latest PR or release |
| `oracle-filter` | Apply signal filter to content |
| `oracle-configure` | Configure project settings |

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
