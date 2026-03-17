---
name: Protocol
slug: protocol
version: "2.0.0"
category: development
type: skill-pack
schema_version: 3
skills: 10
commands: 2
tags:
  - construct
  - category/development
  - type/skill-pack
---

# Protocol

> Reads the chain so your users don't hit reverts. Verifies that what your frontend shows matches what the contract enforces — prices, allowances, proxy implementations, the whole wallet boundary. If cast can read it, Protocol already checked it.

**Version**: 2.0.0 · **Category**: development · **Type**: skill-pack · **Skills**: 10 · **Commands**: 2

## Install

```bash
loa install protocol
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/protocol` | Full chain verification pass |
| `/verify-contract` | Compare frontend state against on-chain truth |
| `/revert-paths` | Map all revert paths a user could hit |
| `/allowance-check` | Verify token allowance flows |
| `/proxy-audit` | Check proxy implementation slots |
| + 5 more | Price feeds, wallet boundary, gas estimation |

## Commands

| Command | What it does |
|---------|-------------|
| `protocol verify` | Run verification against live chain |
| `protocol cast` | Execute cast read against contract |

## Relationships

### Depends On

- [Beehive](/constructs/observer) — user observation informs which paths to verify
- [Artisan](/constructs/artisan) — taste standards for how verification results are presented

### Composes With

- [Beehive](/constructs/observer)
- [Artisan](/constructs/artisan)

### Composition Paths

**Writes to:**
- `grimoires/protocol/` (verification reports, chain state snapshots)

## Operator Mode

Protocol maps to **ARCH mode** (persona: OSTROM) — structural verification of systems. [See Operator Modes &rarr;](/network/operator)

## Verification Archetype

**Observable construct** — output makes claims about on-chain state. Verification compares claims to ground truth (the chain itself). [Verification guide &rarr;](/verification/verification-guide#_1-observable-constructs-output-matches-reality)

## Source

- **Repo**: `0xHoneyJar/construct-protocol`
- **Cache**: `.cache/construct-repos/construct-protocol/`
- **Grimoire**: `grimoires/protocol/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)
