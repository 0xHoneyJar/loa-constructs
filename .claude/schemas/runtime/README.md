# runtime/ — Composition runtime

Schemas for **how constructs from the network compose at runtime**.

| Schema | What it validates |
|---|---|
| `composition.schema.json` | A runtime expert chain — staged construct collaboration, declared streams, iteration loops. Consumed by `compose-run.sh`. |

**Doctrine**: per [composition-schema-as-bridge](https://github.com/zkSoju/hivemind/blob/main/wiki/concepts/composition-schema-as-bridge.md), the composition schema is the bridge between the network (constructs) and curated registries (loa-compositions). One contract, two homes.

**Cross-cutting**: composition schema `$ref`'s [hivemind-labels](https://github.com/0xHoneyJar/loa-hivemind) for taxonomy. The schema family stays cohesive *per repo*; cross-cutting taxonomies that consumers want without the composition graph live in their own home.
