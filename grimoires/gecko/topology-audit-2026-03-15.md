# Topology Audit — 2026-03-15

> gecko walked the whole bazaar. here's what's real.

## Method

read every `construct.yaml` in `.cache/construct-repos/`. compared `governs` claims against `governed_by` acknowledgments. mapped composition, dependencies, events, islands.

## Governance: What's Real vs What's Claimed

### Reciprocated (both sides agree — these are real)

```
vocabulary-bank → herald         ✓ herald says governed_by: vocabulary-bank
vocabulary-bank → social-oracle  ✓ social-oracle says governed_by: vocabulary-bank
vocabulary-bank → gtm-collective ✓ gtm-collective says governed_by: vocabulary-bank
vocabulary-bank → growthpages    ✓ growthpages says governed_by: vocabulary-bank

artisan → the-easel              ✓ the-easel says governed_by: artisan
artisan → showcase               ✓ showcase says governed_by: artisan
artisan → the-arcade             ✓ the-arcade says governed_by: artisan
artisan → the-mint               ✓ the-mint says governed_by: artisan
```

### One-Sided (governor claims it, target doesn't acknowledge)

```
vocabulary-bank → observer       ✗ observer has NO governed_by field
vocabulary-bank → artisan        ✗ artisan has NO governed_by field
the-speakers → artisan           ✗ the-speakers says governed_by: artisan, but artisan's governs list doesn't include the-speakers
```

**assessment**: vocabulary-bank wrote these claims when it was conceived as the universal voice authority. but artisan evolved ALEXANDER — a fully elaborated taste persona with its own voice authority. observer evolved KEEPER. neither needs vocabulary-bank's permission to speak. these are aspirational governance, not operational.

**recommendation**: remove `observer` and `artisan` from vocabulary-bank's `governs` list. vocabulary-bank cleanly governs the copy/voice cluster (4 constructs). artisan cleanly governs the taste/feel cluster (5 constructs). two parallel roots. two domains. no hierarchy between them.

## The Actual Topology (Post-Correction)

```
TWO PARALLEL GOVERNANCE DOMAINS:

  vocabulary-bank (voice/copy law)     artisan (taste/feel law)
    ├── herald                           ├── the-easel
    ├── social-oracle                    ├── showcase
    ├── gtm-collective                   ├── the-arcade
    └── growthpages                      └── the-mint
                                         (the-speakers claims artisan but artisan doesn't list it — needs sync)

COMMONS RESOURCES (ungoverned, referenced by many):
  k-hole          — silent hub, 7 constructs compose with it, declares nothing back
  observer        — signal capture, composes with crucible + artisan

QUALITY CLUSTER:
  crucible        — circular hard dep with observer (known issue)
  hardening       — composes with observer
  protocol        — composes with observer + artisan

RESEARCH:
  gecko           — composes with observer + k-hole

ISLANDS (zero relationships):
  beacon          — discoverable content tools, reasonable standalone
  dynamic-auth    — community-authored (zerker), reasonable island
  mibera-codex    — codex type, knowledge base, reasonable island
  webgl-particles — needs schema_version 3 migration, no construct.yaml
  webreel         — community-authored (zerker), reasonable island
```

## Structural Issues

### 1. observer ↔ crucible circular hard dependency

each lists the other as a required `pack_dependency`. neither can install without the other already present.

**recommendation**: make crucible's dependency on observer `optional` instead of `required`. observer is the primary signal source — it should install independently. crucible enriches observer's journeys with validation — that's optional enhancement, not a prerequisite.

### 2. k-hole declares nothing

7 constructs reference k-hole in compose_with or pack_dependencies: the-arcade, the-mint, growthpages, gecko, showcase, vfx-playbook, the-speakers. k-hole's construct.yaml has zero compose_with, zero governs, zero governed_by, zero pack_dependencies.

**assessment**: this is correct. k-hole is mycelium — it connects without knowing it connects. the silence IS the architecture. the seven voices don't need to know who's listening. don't change this.

### 3. webgl-particles has no construct.yaml

uses legacy manifest.json at schema_version 1. community-authored (zerker). needs migration to construct.yaml at schema_version 3.

### 4. vocabulary-bank events have no consumers

`vocabulary-bank.audit_completed` and `vocabulary-bank.vocabulary_synthesized` are emitted but no construct declares consuming them. the pheromone exists but nobody's following the trail.

**assessment**: herald, social-oracle, gtm-collective should consume `vocabulary_synthesized` — that's the whole point of governance. the governed constructs should read the governor's signals.

## The Operator OS — Where It Lives

the Operator OS (FEEL/ARCH/DIG/SHIP) lives in `grimoires/the-arcade/`:

```
grimoires/the-arcade/
  OPERATOR.md    — the meta-frame (mode switching, ECS reframe, DDA)
  OSTROM.md      — ARCH persona (structural thinking, blast radius)
  BARTH.md       — SHIP persona (shipping discipline, scope cutting)
```

ALEXANDER lives in `construct-artisan/identity/ALEXANDER.md` — portable via install.
STAMETS lives in `construct-k-hole/identity/STAMETS.md` — portable via install.
OSTROM and BARTH live in grimoires — personal cognitive state, project-local.

this is correct placement. the Operator OS is the operator's grimoire, not a construct to distribute. when the operator is ready to share it, OSTROM.md and BARTH.md can move into The Arcade's `identity/` directory — but that's a decision about sharing, not about architecture.

## Changes Needed (External Repos)

| Repo | Change | Priority |
|------|--------|----------|
| `construct-vocabulary-bank` | Remove `observer` and `artisan` from `governs` list | HIGH — false governance |
| `construct-artisan` | Add `the-speakers` to `governs` list | HIGH — one-sided acknowledgment |
| `construct-crucible` | Change `pack_dependencies: [{slug: observer}]` to optional | MEDIUM — circular dep |
| `construct-herald` | Add `consumes: [{event: vocabulary-bank.vocabulary_synthesized}]` | LOW — close the loop |
| `construct-social-oracle` | Add `consumes: [{event: vocabulary-bank.vocabulary_synthesized}]` | LOW — close the loop |
| `construct-gtm-collective` | Add `consumes: [{event: vocabulary-bank.vocabulary_synthesized}]` | LOW — close the loop |
| `construct-growthpages` | Add `consumes: [{event: vocabulary-bank.vocabulary_synthesized}]` | LOW — close the loop |

## Changes Made (This Repo)

- Added governance-reciprocity check (check 8) to `validate-topology.sh`
- This audit artifact in `grimoires/gecko/`

---

*gecko walked the bazaar on 2026-03-15. this is what was real.*
