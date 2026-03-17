---
layout: doc
---

# Construct Network

> 23 constructs. 2 governance roots. 5 islands. 160 skills. 61 commands.

## Network Graph

<div class="graph-container">
<ClientOnly>
  <NetworkGraph />
</ClientOnly>
</div>

## Quick Links

- [Topology](/architecture/topology) — Governance graph, dependency chains, composition paths
- [Network Health](/network/health) — Network health diagnostic, open issues, remediation status
- [Operator Modes](/network/operator) — FEEL/ARCH/DIG/SHIP mode map
- [Personas](/network/personas) — All personas across 5 layers
- [Echelon](/verification/echelon) — Verification platform: data flows, endpoints, blockers
- [ECS Architecture](/architecture/ecs) — Constructs as ECS entities
- [Network Audit](/network/audit-2026-03-17) — Three-persona review (composite: 5.9/10)

---

## Governance Root: Artisan (taste/feel)

| Construct | Category | Skills | Description |
|-----------|----------|--------|-------------|
| [artisan](/constructs/artisan) | design | 14 | Turns "this feels off" into engineering specs |
| → [the-easel](/constructs/the-easel) | design | 4 | Creative studio for aesthetic direction |
| → [showcase](/constructs/showcase) | design | 6 | Landing page visual intelligence |
| → [the-arcade](/constructs/the-arcade) | design | 6 | Game design as operating philosophy |
| → [the-mint](/constructs/the-mint) | design | 8 | Forges digital materials — CELLINI + MURAGE |
| → [the-speakers](/constructs/the-speakers) | design | 8 | Psychoacoustic engineering, sonic identity |

## Governance Root: Vocabulary Bank (voice/copy)

| Construct | Category | Skills | Description |
|-----------|----------|--------|-------------|
| [vocabulary-bank](/constructs/vocabulary-bank) | comms | 2 | Per-product vocabulary governance |
| → [herald](/constructs/herald) | operations | 3 | Grounded product communication |
| → [social-oracle](/constructs/social-oracle) | marketing | 5 | GitHub PR → social media content |
| → [gtm-collective](/constructs/gtm-collective) | marketing | 8 | Go-to-market skills for launches |
| → [growthpages](/constructs/growthpages) | marketing | 5 | Multi-phase article generation |

## Silent Hub: K-Hole

| Construct | Category | Skills | Description |
|-----------|----------|--------|-------------|
| [k-hole](/constructs/k-hole) | analytics | 6 | Seven voices, grounded search, depth over breadth |
| ← referenced by: [showcase](/constructs/showcase), [vfx-playbook](/constructs/vfx-playbook), [the-mint](/constructs/the-mint), [the-speakers](/constructs/the-speakers), [the-arcade](/constructs/the-arcade), [growthpages](/constructs/growthpages), [gecko](/constructs/gecko) |

## Core Infrastructure

| Construct | Category | Skills | Description |
|-----------|----------|--------|-------------|
| [observer](/constructs/observer) | analytics | 23 | Beehive — builds the hive so the colony thrives |
| [crucible](/constructs/crucible) | security | 5 | Validation and testing (circular dep with observer) |
| [protocol](/constructs/protocol) | web3 | 10 | Reads the chain so users don't hit reverts |
| [hardening](/constructs/hardening) | security | 11 | Finds the holes before someone else does |
| [gecko](/constructs/gecko) | observability | 4 | Ecosystem intelligence — the quiet one on the wall |

## Islands (zero declared relationships)

| Construct | Category | Skills | Description |
|-----------|----------|--------|-------------|
| [beacon](/constructs/beacon) | operations | 6 | AI-retrievable content + trust signals |
| [dynamic-auth](/constructs/dynamic-auth) | security | 3 | Wallet group identity for Dynamic SDK |
| [mibera-codex](/constructs/mibera-codex) | documentation | 3 | 10,000 Beras, 15,000 years of lore |
| [webgl-particles](/constructs/webgl-particles) | design | 9 | WebGL particle systems from 229 sources |
| [webreel](/constructs/webreel) | design | 4 | Broadcast-quality web page video recorder |

---

## By Category

### design (8)
[artisan](/constructs/artisan) · [the-easel](/constructs/the-easel) · [showcase](/constructs/showcase) · [the-arcade](/constructs/the-arcade) · [the-mint](/constructs/the-mint) · [the-speakers](/constructs/the-speakers) · [webgl-particles](/constructs/webgl-particles) · [webreel](/constructs/webreel)

### analytics (3)
[observer](/constructs/observer) · [k-hole](/constructs/k-hole) · [gecko](/constructs/gecko)

### security (3)
[crucible](/constructs/crucible) · [hardening](/constructs/hardening) · [dynamic-auth](/constructs/dynamic-auth)

### marketing (3)
[gtm-collective](/constructs/gtm-collective) · [social-oracle](/constructs/social-oracle) · [growthpages](/constructs/growthpages)

### operations (2)
[beacon](/constructs/beacon) · [herald](/constructs/herald)

### documentation (2)
[mibera-codex](/constructs/mibera-codex) · [vocabulary-bank](/constructs/vocabulary-bank)

### development (1)
[protocol](/constructs/protocol)

### vfx (1)
[vfx-playbook](/constructs/vfx-playbook)

<style>
.graph-container {
  width: 100%;
  height: 560px;
  border-radius: 0;
  overflow: hidden;
  border: 1px solid oklch(0.22 0.012 250);
}
</style>
