# network/ — The Constructs Network

Schemas for **the Constructs Network shape itself** — what a construct is, how packs distribute, how manifests declare extension points.

| Schema | What it validates |
|---|---|
| `construct.schema.json` | A construct's identity, expertise boundaries, governance, voice. Per-pack `construct.yaml`. |
| `pack-manifest.schema.json` | A pack's distribution metadata (deps, versions, paths). |
| `construct-manifest.schema.json` | Construct extension points (skills/agents that mount into Loa). |

**Doctrine**: per [contracts-as-bridges](https://github.com/zkSoju/hivemind/blob/main/wiki/concepts/contracts-as-bridges.md), the Constructs Network is package-manager-shaped (npm/brew). These are the package-format contracts.
