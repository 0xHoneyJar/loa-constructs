# Craft Cluster

**Cycle**: cycle-craft-cluster (2026-05-11)
**Substrate**: [construct-rooms-substrate v0.2.0](https://github.com/0xHoneyJar/construct-rooms-substrate/releases/tag/v0.2.0)
**RFCs**: [#235](https://github.com/0xHoneyJar/loa-constructs/issues/235) · [#236](https://github.com/0xHoneyJar/loa-constructs/issues/236) · [#237](https://github.com/0xHoneyJar/loa-constructs/issues/237) · [#238](https://github.com/0xHoneyJar/loa-constructs/issues/238)

## The seam framing

Four RFCs filed in May 2026 (from the purupuru hackathon session-3 polish framing) all described gaps at the **artisan↔crucible seam** — the place where a construct that knows taste meets a construct that knows validation. The first-draft PRD assumed each gap → one new construct pack (three new repos). The operator reframed at the Phase 7 gate:

> *"I don't want to stack things on top of each other. We should be using our understanding here to gain more clarity on existing constructs instead of spinning out so many constructs that feel like it's already difficult to have a handle on existing ones. If constructs are compositions of other constructs, then I think it can make sense."*

The reframe was adopted. The cycle ships pair-relay (the composition primitive — RFC #235) plus three reference compositions over EXISTING constructs (artisan, crucible, kansei, rosenzu) — and ZERO new construct repos.

## The composition-first principle

> **Don't assume a new construct fills a gap before pair-relay composition has been tried over existing constructs.**

This principle is procedural, not architectural. New construct creation remains a valid response — but it must be evidence-gated. A pair-relay rehearsal over existing constructs is the lightweight first test. Only if synthesis says **LEAKED** with a specific gap shape does a future cycle propose a new construct.

Precedent: `construct-rooms-substrate` lived inline at `loa-constructs/construct-rooms-substrate/` for cycle-049 → cycle-craft, then spun out as its own repo only when the surface area justified it. The spin-out was evidence-driven, not speculative. Cluster pair-relays carry the same posture.

## Per-lane summary

| Lane | Composition | Existing constructs | Verdict | Outcome |
|---|---|---|---|---|
| **Fidelity** | [`fidelity-relay`](https://github.com/0xHoneyJar/construct-rooms-substrate/blob/main/compositions/fidelity-relay.yaml) | artisan ↔ crucible ↔ artisan | **FILLED** | Substrate ships as-is; one taste-vocabulary refinement queued (CLAIM-4 "removed" verb misfit jsonl append-only semantics) — [details](../grimoires/loa/synthesis/craft-cluster-verdicts.md#lane-1-fidelity-rfc-237) |
| **Access** | [`access-relay`](https://github.com/0xHoneyJar/construct-rooms-substrate/blob/main/compositions/access-relay.yaml) | kansei ↔ artisan ↔ kansei | **LEAKED** | Gap-seed: ambient breadcrumbs for cycle state visibility (mid-cycle arrival cold-start). Future-cycle PRD candidate. — [details](../grimoires/loa/synthesis/craft-cluster-verdicts.md#lane-2-access-rfc-236) |
| **Frame** | [`frame-relay`](https://github.com/0xHoneyJar/construct-rooms-substrate/blob/main/compositions/frame-relay.yaml) | rosenzu ↔ artisan ↔ rosenzu | **FILLED** | Macro-pattern named (GoF Strategy with leaky defaults). 4-step refactor roadmap deferred. — [details](../grimoires/loa/synthesis/craft-cluster-verdicts.md#lane-3-frame-rfc-238) |

## Diagram

```
                    ┌─────────────────────────────────────────────────┐
                    │  artisan  ─→  crucible  ─→  artisan            │   fidelity-relay
                    │  kansei   ─→  artisan   ─→  kansei             │   access-relay
                    │  rosenzu  ─→  artisan   ─→  rosenzu            │   frame-relay
                    └─────────────────────────────────────────────────┘
                                  (pair-relay over EXISTING constructs)

                    declare  ─→  inspect    ─→  confirm
                          (the canonical pair-relay rhythm — same construct
                           returns at stage 0 and stage N to close the loop)
```

## Links

- **PRD** — [`grimoires/loa/prd.md`](../grimoires/loa/prd.md)
- **SDD** — [`grimoires/loa/sdd.md`](../grimoires/loa/sdd.md)
- **Sprint plan** — [`grimoires/loa/sprint.md`](../grimoires/loa/sprint.md)
- **Synthesis verdicts** — [`grimoires/loa/synthesis/craft-cluster-verdicts.md`](../grimoires/loa/synthesis/craft-cluster-verdicts.md)
- **Sprint 4 rehearsal artifacts** — [`grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4/`](../grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4/)
- **Substrate release** — [construct-rooms-substrate v0.2.0](https://github.com/0xHoneyJar/construct-rooms-substrate/releases/tag/v0.2.0)
- **Composition reference docs** — [composition-patterns.md](https://github.com/0xHoneyJar/construct-rooms-substrate/blob/main/docs/runtime/composition-patterns.md)
- **RFCs** — [#235](https://github.com/0xHoneyJar/loa-constructs/issues/235) (pair-relay) · [#236](https://github.com/0xHoneyJar/loa-constructs/issues/236) (access) · [#237](https://github.com/0xHoneyJar/loa-constructs/issues/237) (fidelity) · [#238](https://github.com/0xHoneyJar/loa-constructs/issues/238) (frame)

## Footer — composition-first as precedent

This cycle is one demonstration of a hypothesis: when an artisan↔crucible-style seam emerges, the cheapest first response is a pair-relay composition over existing constructs, not a new construct repo. Three lanes, one cycle, four RFCs absorbed, zero new repos shipped — and one of three lanes (access) surfaced a real future-cycle gap that *will* need its own work, but only after the cheaper test cleared it. Future cluster cycles inherit this posture: rehearse compositions first; spin new constructs only when synthesis says LEAKED with a named gap shape.
