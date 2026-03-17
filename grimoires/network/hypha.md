---
name: Hypha
slug: hypha
version: 0.2.0
category: analytics
description: "Neutral historian and builder companion for the Berachain ecosystem — mapping Proof of Liquidity flows, governance history, and protocol interconnections."
short_description: "Depth historian for Berachain's living network"
author: El Capitan (apDAO)
repository: https://github.com/0xElCapitan/hypha
status: external
tags:
  - construct
  - category/analytics
  - external-builder
  - berachain
  - pol
  - governance
---

# Hypha

> "The thread that traces how the ecosystem grows."

**Author**: El Capitan (apDAO) — first external builder on the constructs network
**Category**: Analytics
**Version**: 0.2.0
**Status**: External (not yet in 0xHoneyJar namespace)

## What It Does

Hypha maps the Berachain Proof of Liquidity network — tracing how BGT emissions, liquidity, and governance flow between protocols, validators, and vaults. Named after fungal hyphae: the microscopic threads that route nutrients through mycelium.

The metaphor is structural, not decorative. PoL IS a mycelial network: validators are threads, protocols are nodes, BGT emissions are nutrients.

## Skills

| Skill | Command | What It Does |
|-------|---------|-------------|
| pol-mapper | `/map` | Trace how a protocol/vault/token connects to the PoL network |
| governance-historian | `/dig` | Deep retrieval on governance proposals, mechanics, patterns |
| protocol-surveyor | `/flows` | Follow BGT/incentive flows from a specific entry point through the network |
| price-archaeologist | — | Historical price context for BERA, iBGT, LOCKS, SAIL.r |
| builder-translator | `/build` | Convert ecosystem knowledge into actionable builder context |

## Composition

### Potential Connections
- [[observer]] — Hypha's protocol observations could feed Observer's signal classification
- [[k-hole]] — Hypha's domain data as source material for `/dig` sessions on PoL mechanics
- [[protocol]] — Hypha's governance data for on-chain verification alignment
- [[herald]] — Hypha's ecosystem updates as grounded source for announcements

### Events (proposed)
- `forge.hypha.flow_traced` — when a PoL flow is mapped end-to-end
- `forge.hypha.governance_recorded` — when a new proposal is archived with full context
- `forge.hypha.builder_context_generated` — when `/build` produces actionable output

## Identity

**Persona**: Neutral historian. Not a shill, not a price oracle, not a regulatory guide. Maps terrain without picking winners.

**Voice**: Precise, grounded, ecosystem-native. Flags uncertainty explicitly. Never fills gaps with assumption.

**Reasoning**: Map before evaluating. Evidence over inference. Flows over snapshots. Context over conclusions.

**Mycelium Frame**: Nodes (protocols), Threads (BGT delegation), Nutrients (emissions/yields), Fruiting Bodies (visible outcomes), Mycelium (the whole PoL system).

## Known Limitations (self-declared)

- Vase Finance: pre-launch, docs pending
- Price data: CoinGecko snapshots through March 6, 2026 (not real-time)
- THJ internal perspective: member/contributor view only
- apGP12 UI bug: platform shows Failed, actually passed (687 uncounted abstentions)

## Audit Notes (Gecko, 2026-03-17)

**Schema**: Uses `construct.json` instead of `construct.yaml`. Needs conversion to schema_version 3.
**Skills**: Described in BUTTERFREEZONE.md but no individual SKILL.md files.
**Identity**: Rich identity.md but not in standard `identity/persona.yaml` format.
**Events**: None declared — proposed above.
**Composition**: No `composition_paths` declared — rich opportunity for cross-construct wiring.
**Capabilities**: No stanza. Recommend `model_tier: sonnet, danger_level: safe`.
**Logo**: Design prompts exist (`grimoires/the-easel/prompts/echelon-hypha-marks-v1.md`) — HY-1 through HY-7 + lockups. Extended sans typography (Exo 2 / Space Grotesk). Not yet generated.

**Health Score**: 62/100 — strong domain content, weak schema compliance. High potential.

## Verification Surface (proposed for Echelon)

| Check | What It Measures | Ground Truth |
|-------|-----------------|-------------|
| governance_record_accuracy | Do proposal descriptions match on-chain voting data? | Berachain governance contracts, Snapshot/Tally records |
| flow_trace_completeness | Does `/map` capture all validators/vaults in a PoL flow? | BeraChef contract state, reward vault registry |
| protocol_relationship_currency | Are protocol descriptions current? (not stale) | Protocol documentation, contract deployments |
| price_data_fidelity | Do historical prices match CoinGecko API data? | CoinGecko API at cited timestamps |
| builder_context_grounding | Does `/build` cite existing primitives accurately? | Deployed contracts, SDK documentation |
| known_limitations_honesty | Are declared limitations still accurate? | Check each limitation against current state |

## Navigation

← [[_index]] · [[observer]] · [[k-hole]] · [[protocol]]
