---
name: Protocol
slug: protocol
version: "2.0.0"
category: web3
type: skill-pack
schema_version: 3
skills: 10
commands: 2
tags:
  - construct
  - category/web3
  - type/skill-pack
---

# Protocol

> Reads the chain so your users don't hit reverts. Verifies that what your frontend shows matches what the contract enforces — prices, allowances, proxy implementations, the whole wallet boundary. If cast can read it, Protocol already checked it.

**Version**: 2.0.0 · **Category**: web3 · **Type**: skill-pack · **Skills**: 10 · **Commands**: 2

## Install

```bash
loa install protocol
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/contract-verify` | Read deployed contract state via cast, compare against frontend constants |
| `/tx-forensics` | Decode revert reasons, trace internal calls, decode Safe/multicall payloads |
| `/abi-audit` | Compare frontend ABI usage against deployed contract |
| `/proxy-inspect` | Read EIP-1967 slots, identify implementation, check upgrade patterns |
| `/simulate-flow` | Simulate user flows via cast call to catch reverts before users hit them |
| `/dapp-lint` | Web3-specific linting — BigInt safety, wei handling, address checksums |
| `/dapp-typecheck` | Verify wagmi/viem type generation matches deployed ABIs |
| `/dapp-test` | Execute test suites with contract mock patterns |
| `/dapp-e2e` | Agent-browser QA — connect wallet, submit tx, verify state changes |
| `/gpt-contract-review` | Cross-model review of frontend-to-contract consistency |

## Commands

| Command | What it does |
|---------|-------------|
| `verify` | Run verification against live chain |
| `debug-tx` | Decode and debug a failing transaction |

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
