---
schema_version: '1.0'
handoff_id: 'sha256:e3a6465136b73663adfe6ca9bacc7e50f277cff3d088330a7223d8b7ac92bcfa'
from: 'deep-name'
to: 'deep-name'
topic: 'territory-grammar-freeside-ratification'
ts_utc: '2026-07-13T07:17:38Z'
references:
  - 'grimoires/loa/prd.md'
  - 'packages/constructs-cli/schemas/territory.schema.json'
  - 'grimoires/territory.yaml'
tags:
  - 'territory'
  - 'stationing'
  - 'proposal'
---

# Proposal: ratify the territory grammar in one freeside region (PRD FR-15, G-5a)

This is a PROPOSAL, not a build (ADR-011 D-7 consumer-sequencing): producer-side
shipped in loa-constructs this cycle; the consumer ratifies in its own tree, on
its own schedule.

## What is proposed

Pick ONE loa-freeside region (maintainer's choice at ratification time — the
dune-meter surface is a natural candidate given its existing veve discipline)
and author its territory manifest:

    <region>/grimoires/territory.yaml   # schema_version "1.0"
    # outcomes: what "healthy" means there
    # scopes:   the blast radius, as repo-root-relative POSIX globs
    # loadout:  maintainer-composed wardens, observe-only at birth

Schema + validator: packages/constructs-cli/schemas/territory.schema.json
(vendored subset, teaching errors). Worked example: loa-constructs' own
grimoires/territory.yaml (self-host proof, live this cycle — one stationed
warden, one governed observation, chain-verified).

## What ratification means mechanically

- The manifest edit committed on the region's default branch IS the stationing
  gate — git permissions, never an API key.
- `constructs atlas --json` then indexes the region (vantage: operator-local);
  `constructs where <path>` resolves zone/region/owner/loadout/gate.
- Every stationing starts observe-only. Tiers above observe are earned through
  the L4 graduated-trust ledger and drop automatically on observed override.

## What this does NOT ask

No loadout is prescribed (the network indexes; it never authors). No timeline —
G-5b is tracked as a follow-up signal, never a blocker (PRD G-5b).
