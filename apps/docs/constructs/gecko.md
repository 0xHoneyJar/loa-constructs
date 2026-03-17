---
name: Gecko
slug: gecko
version: "0.1.0"
category: analytics
type: skill-pack
schema_version: 3
skills: 4
commands: 4
tags:
  - construct
  - category/analytics
  - type/skill-pack
---

# Gecko

> Ecosystem intelligence — autonomous network health observation, identity-reality drift detection, and construct lifecycle monitoring. The quietest stall in the bazaar.

**Version**: 0.1.0 · **Category**: analytics · **Type**: skill-pack · **Skills**: 4 · **Commands**: 4

## Install

```bash
loa install gecko
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/patrol` | Autonomous loop — time-boxed observation cycles with ratcheting health score |
| `/observe` | Single-pass — check all constructs, produce JSONL observations |
| `/diagnose` | Deep investigation — one construct, full identity-reality analysis |
| `/report` | Synthesis — aggregate observations into network health report |

## Commands

| Command | What it does |
|---------|-------------|
| `patrol` | Run autonomous observation loop |
| `observe` | Single-pass health check |
| `diagnose` | Deep investigation of one construct |
| `report` | Generate network health report |

## Relationships

### Composes With

- [Beehive](/constructs/observer) — observation surfaces feed ecosystem intelligence
- [K-Hole](/constructs/k-hole) — research depth for pattern recognition

### Composition Paths

**Reads from:**
- `grimoires/` (reads broadly across all grimoires for ecosystem awareness)

## Operator Mode

Gecko appears in both **ARCH mode** and **DIG mode** — pattern recognition across the bazaar. [See Operator Modes &rarr;](/network/operator)

Gecko has its own persona: **GECKO** (bazaar trader, ecosystem intelligence). [See Personas &rarr;](/network/personas)

## Verification Archetype

**Observable construct** — output makes claims about ecosystem health. Verification compares claims to the actual state of constructs and repos. [Verification guide &rarr;](/verification/verification-guide#_1-observable-constructs-output-matches-reality)

## Source

- **Repo**: `0xHoneyJar/construct-gecko`
- **Cache**: `.cache/construct-repos/construct-gecko/`
- **Grimoire**: `grimoires/gecko/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)
