# construct-network-tools

The exemplar pack. Not a toolbox. Not a vendor bundle. An opinionated taste statement that demonstrates what "good" looks like for a cycle-006-era construct.

Install this pack early in your construct-authoring journey. Read the source. Then write your own.

---

## What's in here

- **CURATOR** — the persona. A network guide who filters every recommendation through four lenses (knowledge · craft · depth · structure) and refuses to emit exhaustive lists.
- **`exploring-network`** — CURATOR's wayfinding skill. Opinionated recommendations with per-lens reasoning.
- **`/explore-network`** — CLI command that fires CURATOR's skill. Three read-modes (glance / orient / intervene).
- **`compositions/explore-ecosystem.yaml`** — a two-stage reference composition showing what "compositions are authored, not just consumed" looks like in practice.

## Why an EXEMPLAR and not a toolbox

When cycle-005 proposed a "construct-network-tools" meta-pack, the operator pushed back: *"modpacks carry taste."* A vendor-curated bundle of scripts isn't taste — it's plumbing. The better move is: ship the plumbing as part of Loa (`constructs install`, `constructs publish`, etc — those are connectivity tooling, not content). Ship THIS as a **demonstration of opinionated authorship**.

The lineage: `stamets-prior-art-package-managers.md` + `stamets-prior-art-modpack-launchers.md` + `[[constructs-as-packages]] §"Meta-pack as EXEMPLAR"` + `[[naming-is-diagnostic]]`. Four hivemind threads converge on the same answer: first packs teach authorship through selection, not accumulation.

## The taste stack

CURATOR composes four lenses:

| Lens | Construct | What it asks |
|---|---|---|
| Knowledge | `hivemind` | "Does the operator already know something adjacent?" |
| Craft | `artisan` | "Would ALEXANDER accept this as the right thing?" |
| Depth | `k-hole` | "What's the non-obvious alternative worth flagging?" |
| Structure | `the-arcade` | "Does this fit the composition the operator is building?" |

Install all four before using this pack. Cycle-006 URL-installs `hivemind` as a git reference; cycle-007 promotes it to a first-class pack (see `pack_dependencies` in `construct.yaml`).

## Usage

### Inline

```
/explore-network "I want to audit a component for feel"
```

CURATOR emits a single `Verdict` row with per-lens reasoning + optional alternatives. Default orient mode (3-5 lines). Append `--glance` for one-liner; `--intervene` for full breakdown.

### In a composition

```yaml
chain:
  - stage: 1
    construct: construct-network-tools
    skill: exploring-network
    mode: fresh
    reads: [Intent, Operator-Model]
    writes: [Verdict, Signal]
```

See `compositions/explore-ecosystem.yaml` for a working example.

## Authoring conventions demonstrated

This pack dogfoods **cycle-005 template v3** (landed via [construct-base#11](https://github.com/0xHoneyJar/construct-base/pull/11), MERGED 2026-04-22). New authors should see all of these in one place:

- **schema_version: 3** — the current conformance level
- **Explicit `streams:`** section declaring typed stream I/O (doctrine v5 §3)
- **`identity/<HANDLE>.md`** persona file convention (cycle-005 L3)
- **Butterfreezone marker** — `docs.construct_readme_generator: butterfreezone` signals that `CONSTRUCT-README.md` is auto-generated
- **`composition_paths:`** — the grimoire path IS the interface (doctrine v5 §17.4)
- **`commands:`** array — explicit slash-command declaration
- **`compose_with:`** — symmetric composition declarations (verified by GECKO audit)
- **`pack_dependencies:`** — transitive pack requirements (for taste stacks)

Every new construct should include every one of these. Not because the platform enforces it (most are optional today) — because **consistency is the ecosystem's moat**.

## Status

**v0.1.0** · cycle-006 · operator may refine CURATOR's voice after live use.

This pack is authored inside the `loa-constructs` repo under `packs-in-flight/` during cycle-006. Upstream publish to `0xHoneyJar/construct-network-tools` is the F33 closure step — see cycle-006 findings.

## References

- Cycle-006 SEED: `grimoires/loa-constructs-seed-2026-04-21/cycle-006-SEED-agentic-fullstack-runtime.md` (L-meta-pack AC)
- Doctrine: `bonfire-construct-pipe-doctrine.md` v6
- Sibling: [[constructs-as-packages]] §"Meta-pack as EXEMPLAR"
- Naming rule: [[naming-is-diagnostic]]

## License

MIT
