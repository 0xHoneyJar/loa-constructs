---
name: Herald
slug: herald
version: "0.1.0"
category: operations
type: untyped
schema_version: 3
skills: 3
commands: 0
tags:
  - construct
  - category/operations
---

# Herald

> Grounded product communication — announcements built from code evidence, not promises.

**Version**: 0.1.0 · **Category**: operations · **Skills**: 3

## Install

```bash
loa install herald
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/announce` | Generate grounded announcement from code evidence |
| `/release-notes` | Write release notes from git diff |
| `/changelog` | Generate changelog entries |

## Relationships

### Governed By

- [Vocabulary Bank](/constructs/vocabulary-bank) — voice governance for all communications

### Composition Paths

**Reads from:**
- `grimoires/laboratory/` (canvases inform what to communicate)

**Writes to:**
- `grimoires/herald/` (announcement drafts)

## Operator Mode

Herald is a **SHIP mode** construct (persona: BARTH). [See Operator Modes &rarr;](/network/operator)

## Verification Archetype

**Communication construct** — output translates one artifact into another. Verification checks whether the translation preserves the truth of the source. [Verification guide &rarr;](/verification/verification-guide#_4-communication-constructs-output-matches-the-artifact)

## Source

- **Repo**: `0xHoneyJar/construct-herald`
- **Cache**: `.cache/construct-repos/construct-herald/`
- **Grimoire**: `grimoires/herald/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)
