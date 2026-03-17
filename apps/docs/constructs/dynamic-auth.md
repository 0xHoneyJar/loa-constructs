---
name: Dynamic Auth
slug: dynamic-auth
version: "1.0.0"
category: security
type: skill-pack
schema_version: 3
skills: 3
commands: 2
tags:
  - construct
  - category/security
  - type/skill-pack
  - topology/island
---

# Dynamic Auth

> Wallet group identity resolution and primary wallet enforcement for Dynamic SDK apps.

**Version**: 1.0.0 · **Category**: security · **Type**: skill-pack · **Skills**: 3 · **Commands**: 2

## Install

```bash
loa install dynamic-auth
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/dynamic-auth` | Configure wallet group identity for Dynamic SDK |
| `/primary-wallet` | Enforce primary wallet resolution |
| `/group-identity` | Map wallet groups to user identity |

## Relationships

### Island

Dynamic Auth has no declared relationships. It could compose with [Protocol](/constructs/protocol) (auth + chain verification). See [Topology &rarr; Islands](/architecture/topology#islands).

## Operator Mode

Dynamic Auth maps to **ARCH mode** (persona: OSTROM). [See Operator Modes &rarr;](/network/operator)

## Verification Archetype

**Security construct** — verification checks whether auth flows correctly resolve wallet identity. [Verification guide &rarr;](/verification/verification-guide#_5-security-constructs-findings-are-real-vulnerabilities)

## Source

- **Repo**: `0xHoneyJar/construct-dynamic-auth`
- **Cache**: `.cache/construct-repos/construct-dynamic-auth/`
- **Grimoire**: `grimoires/dynamic-auth/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)
