---
name: GrowthPages
slug: growthpages
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

# GrowthPages

> Multi-phase article generation pipeline — educational and launch content with brand voice control, GitHub research, and interactive editing.

**Version**: 1.0.0 · **Category**: marketing · **Skills**: 5 · **Commands**: 3

## Install

```bash
loa install growthpages
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/generate` | Generate article through multi-phase pipeline |
| `/research` | Research phase with GitHub integration |
| `/brief` | Create content brief |
| `/edit` | Interactive editing with voice control |
| `/configure-project` | Configure project for content generation |

## Commands

| Command | What it does |
|---------|-------------|
| `growthpages` | Generate an educational article |
| `growthpages-launch` | Generate launch content |
| `growthpages-configure` | Configure project settings |

## Relationships

### Governed By

- [Vocabulary Bank](/constructs/vocabulary-bank) — voice governance for content

### Composes With

- [K-Hole](/constructs/k-hole) — research depth for content generation

## Operator Mode

GrowthPages maps to **DIG mode** (persona: STAMETS) for research, and **SHIP mode** (persona: BARTH) for publishing. [See Operator Modes &rarr;](/network/operator)

## Verification Archetype

**Communication construct** — output translates research into articles. Verification checks for source accuracy. [Verification guide &rarr;](/verification/verification-guide#_4-communication-constructs-output-matches-the-artifact)

## Source

- **Repo**: `0xHoneyJar/construct-growthpages`
- **Cache**: `.cache/construct-repos/construct-growthpages/`
- **Grimoire**: `grimoires/growthpages/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)
