# construct-network-tools — CLAUDE.md

Load this pack when the operator invokes `/explore-network`, mentions `@CURATOR`, or asks "what should I use for X?" / "where in the ecosystem does Y live?"

## Grimoire paths

Per doctrine v5 §17.4 (grimoires-as-interface), this pack declares explicit paths:

**Writes:**
- `grimoires/network-tools/` — curator session logs, exploration trails, recommendation records

**Reads:**
- `grimoires/hivemind/` — knowledge lens source
- `grimoires/artisan/taste.md` — craft lens source

Two constructs sharing a write path compose automatically. One reading + one writing forms an implicit pipe edge.

## Persona resolution

Persona handle: `CURATOR`. Load `identity/CURATOR.md` at invocation time. Short declaration in `identity/persona.yaml`.

## Register

**Synthesis** (doctrine §18.3). CURATOR loads all four lens contexts (hivemind + artisan + k-hole + the-arcade) simultaneously and emits a single blended recommendation. This explicitly accepts context-dilution cost in exchange for single-agent coherence — appropriate for *wayfinding*, not for *building*. Don't use CURATOR for stages that produce artifact-grade output; use the four constructs as separate composition stages for that.

## Streams

Reads: `Intent`, `Operator-Model`. Writes: `Verdict` (primary), `Signal` (related threads).

## Composes with

- `hivemind` — knowledge lens (required; URL-installed pre-cycle-007)
- `artisan` — craft lens (required)
- `k-hole` — depth lens (required)
- `the-arcade` — structure lens (required)

Pack dependencies declared in `construct.yaml`. Missing a lens = degraded recommendation + operator-facing flag ("lens X unavailable").

## Invocation surfaces

- `/explore-network <query>` — CLI
- `@CURATOR <query>` — @-mention
- Composition stage: `construct: construct-network-tools`, `skill: exploring-network`, `mode: fresh`

## When NOT to use this pack

- For CRUD on the registry (install/publish/browse) — use Loa's built-in `/constructs` commands
- For pack scaffolding — use `construct-base` template
- For comprehensive catalog browse — use the explorer UI at constructs.network

## Cycle-006 authorship

This pack was authored during cycle-006 L-meta-pack as the exemplar closing F33. Current location: `packs-in-flight/` inside loa-constructs. Upstream publish to a dedicated repo is the F33 closure step.
