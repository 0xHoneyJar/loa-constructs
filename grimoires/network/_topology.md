---
name: Network Topology
type: diagnostic
description: Governance chains, dependency graph, composition edges, and known issues.
updated: 2026-03-17
tags:
  - network
  - topology
  - diagnostic
---

# Network Topology

> Last audit: 2026-03-15 (gecko topology audit)
> Source: `grimoires/gecko/topology-audit-2026-03-15.md`

## Governance Graph

```
vocabulary-bank ──governs──→ herald
                ──governs──→ social-oracle
                ──governs──→ gtm-collective
                ──governs──→ growthpages
                ──governs──✗ observer       ⚠ FALSE CLAIM (observer has no governed_by)
                ──governs──✗ artisan        ⚠ FALSE CLAIM (artisan has no governed_by)

artisan ──governs──→ the-easel
        ──governs──→ showcase
        ──governs──→ the-arcade
        ──governs──→ the-mint
        ──governs──✗ the-speakers   ⚠ UNSYNCED (the-speakers claims governed_by:artisan,
                                      but artisan's governs list doesn't include it)
```

### Governance Issues

| ID | Issue | Fix Location | Status |
|----|-------|-------------|--------|
| GOV-001 | vocabulary-bank falsely claims observer | `construct-vocabulary-bank/construct.yaml` | OPEN |
| GOV-002 | vocabulary-bank falsely claims artisan | `construct-vocabulary-bank/construct.yaml` | OPEN |
| GOV-003 | the-speakers → artisan unreciprocated | `construct-artisan/construct.yaml` | OPEN |

## Dependency Graph

```
observer ──depends──→ crucible     (required)
observer ──depends──→ artisan      (required)
crucible ──depends──→ observer     ⚠ CIRCULAR
hardening ──depends──→ observer
protocol ──depends──→ observer
protocol ──depends──→ artisan
showcase ──depends──→ k-hole       (required)
vfx-playbook ──depends──→ k-hole   (required)
the-easel ──depends──→ artisan     (optional)
the-mint ──depends──→ the-easel    (optional)
the-mint ──depends──→ k-hole       (optional)
the-speakers ──depends──→ the-easel (optional)
the-speakers ──depends──→ artisan   (optional)
the-speakers ──depends──→ k-hole    (optional)
the-arcade ──depends──→ the-easel   (optional)
the-arcade ──depends──→ k-hole      (optional)
showcase ──depends──→ the-easel     (optional)
showcase ──depends──→ artisan       (optional)
showcase ──depends──→ vfx-playbook  (optional)
```

### Dependency Issues

| ID | Issue | Fix Location | Status |
|----|-------|-------------|--------|
| DEP-001 | observer ↔ crucible circular hard dep | Make crucible's dep on observer `optional` | OPEN |

## Composition Edges (compose_with)

```
artisan ↔ observer       (bidirectional — canvases → taste)
observer ↔ crucible      (bidirectional — validation loop)
protocol → observer, artisan
hardening → observer
gecko → observer, k-hole
gtm-collective → observer
growthpages → k-hole
the-easel ↔ artisan      (bidirectional)
the-mint → the-easel, k-hole
the-speakers → the-easel, artisan
the-arcade → k-hole, the-easel, observer
vfx-playbook → the-easel
showcase → artisan, the-easel
```

## Composition Paths (grimoire read/write)

| Path | Writers | Readers |
|------|---------|---------|
| `grimoires/laboratory/` | [[observer]] | [[crucible]], [[hardening]], [[herald]] |
| `grimoires/laboratory/canvases/` | [[observer]] | [[artisan]] |
| `grimoires/artisan/` | [[artisan]] | [[the-easel]] |
| `grimoires/` (broad) | — | [[gecko]], [[the-arcade]], [[showcase]] |
| `grimoires/resonance/` | [[k-hole]] | — |
| `grimoires/k-hole/` | [[k-hole]] | — |
| `grimoires/protocol/` | [[protocol]] | — |
| `grimoires/crucible/` | [[crucible]] | — |
| `grimoires/hardening/` | [[hardening]] | — |
| `grimoires/herald/` | [[herald]] | — |
| `grimoires/beacon/` | [[beacon]] | — |
| `grimoires/the-easel/` | [[the-easel]] | — |
| `grimoires/the-mint/relics/`, `materials/` | [[the-mint]] | — |
| `grimoires/the-speakers/stems/`, `context/` | [[the-speakers]] | — |
| `grimoires/vfx-playbook/` | [[vfx-playbook]] | — |
| `grimoires/webreel/` | [[webreel]] | — |
| `grimoires/gecko/` | [[gecko]] | — |

## Islands

These constructs have zero declared relationships (no deps, no compose, no governance):

- [[beacon]] — AI discoverability. Could compose with [[herald]] (announce what beacon exposes)
- [[dynamic-auth]] — Wallet identity. Could compose with [[protocol]] (auth + chain verification)
- [[mibera-codex]] — Lore database. Could compose with [[k-hole]] (research draws on lore)
- [[webgl-particles]] — VFX engine. Could compose with [[vfx-playbook]] (theory + practice)
- [[webreel]] — Video capture. Could compose with [[showcase]] (capture showcase output)

## Schema Status

| Status | Count | Details |
|--------|-------|---------|
| schema_version 3 | 22 | All modern constructs |
| schema_version 1 | 1 | [[webgl-particles]] — still on legacy `manifest.json` |
