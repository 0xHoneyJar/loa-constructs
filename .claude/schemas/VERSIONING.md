# Schema Versioning Policy

> Schemas are bridges. They survive longer than impls. The version field is how we keep the bridge load-bearing as it ages.

This is the governance discipline for evolving every schema in this directory. Reference: `~/hivemind/wiki/concepts/contracts-as-bridges.md` and `composition-schema-as-bridge.md`.

---

## TL;DR

- `schema_version` is **enum-locked** on every schema (not a regex pattern). Explicit audit trail.
- **Minor bumps are additive only.** v1.0 documents must validate against v1.1 unchanged.
- **Major bumps require a migration plan** alongside the schema PR. No silent v1 → v2.
- The public `$id` URL stays stable across all versions. Major breakage is signaled in `schema_version`, never the URL.
- **One bridge, two homes.** Schema lives in `loa-constructs`; consumers (registries, CIs, MCP wrappers) reference it.

---

## When to bump

| Change | Bump |
|--------|------|
| Add a new optional property | minor (`1.0` → `1.1`) |
| Add a new enum value to an existing field | minor |
| Add a new optional `$defs` block | minor |
| Tighten validation (new pattern, smaller `maxLength`) on a field | **major** — existing valid docs may now fail |
| Remove a property | **major** |
| Rename a property | **major** (with migration plan) |
| Change a `const` to an `enum` (additive) | minor |
| Change a property type | **major** |
| Tighten `additionalProperties: false` where it was previously `true` | **major** |
| Add a new required field | **major** — breaks all prior docs |
| Cosmetic edits (descriptions, `$comment`, examples) | no bump |

If unsure, ask: *would any existing valid document fail under the new schema?* If yes → major. If no → minor.

---

## How to bump

### Minor (additive)

1. Edit the schema file. Add the new optional shape; do not change required fields.
2. Update `schema_version`:
   ```json
   "schema_version": { "type": "string", "enum": ["1.0", "1.1"] }
   ```
   Add the new version to the enum; **do not remove old versions**. Multi-version validation is the whole point.
3. Mark added fields with `// v1.1` in their `description` so a reader can date them.
4. Update this `VERSIONING.md` with the change in the changelog below.
5. Update `README.md` if the new field needs prose.
6. PR-merge as a single atomic change. Ship the spec doc (`grimoires/loa/specs/...`) alongside if non-trivial.

### Major (breaking)

1. Cut a new file: `composition.v2.schema.json` (or similar). Both files coexist for the deprecation window.
2. Update `$id` on the v2 file: `https://loa.dev/schemas/composition.v2.schema.json`. **Do not change v1's `$id`.**
3. Write a migration plan in `grimoires/loa/specs/<schema>-v2-migration.md`:
   - what changed (diff)
   - automatic transformer (script that converts v1 docs → v2)
   - deprecation date for v1
   - consumer impact list
4. Land v2 schema + transformer + at least one consumer migrated as the proof-of-life.
5. Other consumers migrate at their own pace; CI tracks both.
6. After the deprecation window closes, the v1 file is moved to `archived/` (not deleted; archaeology matters).

---

## What does not change across versions

These invariants hold for any version of any schema in this directory:

1. **The `$id` URL is permanent.** Major versions get a new file, not a moved URL. External consumers cache by URL.
2. **The schema family stays cohesive in `loa-constructs/.claude/schemas/`.** No asymmetric extraction. (See `composition-schema-as-bridge.md` invariants.)
3. **Schemas describe shape, not narrative.** Prose belongs in YAML `notes` and Markdown docs, not in validation rules.
4. **Validation runs at the substrate boundary**, not after work. `compose-run.sh` validates pre-dispatch (governance closure 2026-04-27).

---

## Why enum, not pattern

A `pattern` like `^1\.\d+$` admits any minor version implicitly. That's seductive but harmful:

- **Audit trail vanishes.** "Which versions exist?" requires reading code, not the schema.
- **Doc tooling breaks.** Generators that enumerate version values produce nothing.
- **Forward compat becomes a guessing game.** A consumer can't know which v1.x shapes exist without checking every consumer.

Enum is explicit. Every supported version is named. Adding one is a one-line, reviewable change. The spec is the spec.

---

## Consumer responsibilities

Cross-repo consumers (e.g. `construct-compositions/.github/workflows/validate-schema.yml`) should:

- Fetch the schema by raw URL (`$id` form): `https://raw.githubusercontent.com/0xHoneyJar/loa-constructs/main/.claude/schemas/composition.schema.json` (until the `loa.dev` domain is wired).
- Pin to a known-good commit when stability matters more than freshness; bump the pin on schema PR.
- Validate every PR. Fail fast.
- Surface schema-validation errors with file path + JSONPath + expected/actual; the operator should grep + fix in one read.

---

## Versions in flight

| Schema | Path | Current | Notes |
|--------|------|---------|-------|
| `composition` | `runtime/composition.schema.json` | **1.2** | v1.1 added 2026-04-27: `surface_class`, `thinking_effort`, `vocabulary_governance`, `codex_mode`. Refactor: HivemindLabels extracted then migrated to loa-hivemind. v1.2 catches schema up to registry reality — 11 stage-level field shapes, output `emit_when`, top-level `changelog`/`depends_on`/`upstream_composition`, mode `blocking`, 4 new role enums, half-stage numbers, relaxed patterns. All additive. |
| `hivemind-labels` | (migrated → [loa-hivemind](https://github.com/0xHoneyJar/loa-hivemind)) | — | Lived here briefly (2026-04-27 morning). Migrated to its own repo same day per operator decision: *"Eileen's framework deserves its own home."* Composition schema's `$ref` now points to `https://loa.dev/hivemind/labels.schema.json`. |
| `construct` | `network/construct.schema.json` | (existing) | Pre-doctrine; no formal versioning yet. |
| `pack-manifest` | `network/pack-manifest.schema.json` | (existing) | Pre-doctrine. |
| `construct-manifest` | `network/construct-manifest.schema.json` | (existing) | Pre-doctrine. |
| `prd` | `workflow/prd.schema.json` | (existing) | Pre-doctrine. |
| `sdd` | `workflow/sdd.schema.json` | (existing) | Pre-doctrine. |
| `sprint` | `workflow/sprint.schema.json` | (existing) | Pre-doctrine. |
| `trajectory-entry` | `workflow/trajectory-entry.schema.json` | (existing) | Pre-doctrine. |
| `feedback-v3` | `workflow/feedback-v3.schema.json` | (existing) | Pre-doctrine. |
| (~25 others) | (top-level) | (existing) | Uncategorized — small surface or single-use; categorize when 2+ of a kind appear. |

PRD/SDD/Sprint/Trajectory/Feedback schemas adopt this policy on their next bump. Until then, they're treated as v1.0 implicit.

**Layout** (2026-04-27 reorg): schemas organized by concern — `network/` (Constructs Network shape), `runtime/` (composition orchestration), `workflow/` (Loa framework gates). See [README.md](README.md) for the full map.

---

## Changelog

### composition.schema.json

| Version | Date | Change | Backward-compat | PR |
|---------|------|--------|-----------------|-----|
| 1.0 | 2026-04-25 | Initial schema | — | #206 |
| 1.1 | 2026-04-27 | Add `surface_class`, `thinking_effort`, `vocabulary_governance`, `codex_mode`. Hivemind labels deeply integrated (already in v1.0). | ✅ All v1.0 docs validate unchanged | #215 |
| 1.1 (refactor) | 2026-04-27 | HivemindLabels extracted to standalone `hivemind-labels.schema.json` v1.0; composition references via external `$ref`. Consumer-facing shape unchanged — same fields, same enums. | ✅ All v1.0/v1.1 docs validate unchanged. ⚠ Offline consumers must now fetch both schemas. | #216 |
| 1.2 | 2026-04-27 | Schema catches up to registry reality after strict ajv CI surfaced drift: stage `name`, `invokes`, `capture_method`, `brief_structure`, `transport_preference`, `verify_identifiers`, `when`, `on_absent`/`on_present_*`, `probes`; output `emit_when`; top-level `changelog`, `depends_on`, `upstream_composition`. Mode +`blocking`. Role +`dispatcher`/`engineering-handoff`/`gate`/`hard-stop`. Stage allows half-numbers (1.5, 6.5). `name` pattern widened to 5 parts. `skill` pattern allows colon (cross-construct refs like `codex:rescue`). `persona` pattern relaxed to free string. `composes_symmetrically_with` accepts unidirectional `→`. `known_limitations` accepts string OR array. | ✅ All 12 registry YAMLs validate; v1.0/v1.1 YAMLs validate unchanged. | (this PR) |

### hivemind-labels.schema.json

| Version | Date | Change | Backward-compat | PR |
|---------|------|--------|-----------------|-----|
| 1.0 | 2026-04-27 | Initial schema. Lifted from `composition.schema.json $defs/HivemindLabels` as it existed at composition v1.1. Same fields, enums, and descriptions; standalone `$id` for cross-schema reuse. | — | #216 |
| migrated | 2026-04-27 | Schema **moved out of this repo** to [`0xHoneyJar/loa-hivemind`](https://github.com/0xHoneyJar/loa-hivemind). New `$id`: `https://loa.dev/hivemind/labels.schema.json` (was: `https://loa.dev/schemas/hivemind-labels.schema.json`). composition.schema.json's `$ref` updated to point to the new home. Same content; cross-cutting taxonomy gets a dedicated repo so it can evolve independently of any single consumer. | ✅ Schema content unchanged. ⚠ Consumers caching the old `$id` URL must update. | (this PR) |

---

## References

- `~/hivemind/wiki/concepts/contracts-as-bridges.md` — parent doctrine
- `~/hivemind/wiki/concepts/composition-schema-as-bridge.md` — instance-2 of the doctrine
- `grimoires/loa/specs/arch-composition-schema-sync.md` — v1.1 spec authored 2026-04-25
