---
session: 1
date: 2026-04-25
type: kickoff
status: planned
authored_by: cycle-002 followup convergence (operator + Claude Opus 4.7)
---

# Session 1 — Composition Schema Sync (kickoff)

## Scope

- Bump `loa-constructs/.claude/schemas/composition.schema.json` to v1.1 with cycle-002 followup field additions (`surface_class`, `thinking_effort`, `vocabulary_governance`, `codex_mode`, `ground-canon` gate sub-fields).
- Add schema-validation CI in `construct-compositions` that fetches the public `$id` URL and validates every YAML on PR.
- Bump `schema_version: "1.0"` → `"1.1"` in construct-compositions YAMLs that use the new fields.
- Update README badges in both repos.
- Two PRs, sequenced (loa-constructs first, construct-compositions second).

## Artifacts

- Architecture + build doc: `grimoires/loa/specs/arch-composition-schema-sync.md` (combined; source of truth)
- Session track: this file

## Prior session

Cycle-002 followup convergence shipped 7 PRs across construct-compositions (#3–#7) and henlo-monorepo (#20–#22). Schema-shaped fields were added to YAMLs without updating composition.schema.json — that drift is what this session fixes. See `henlo-monorepo:grimoires/loa/tracks/session-3-cycle-002-followup-close.md` for the upstream record.

## Decisions made

- **Schema stays in loa-constructs.** Earlier framing ("move to construct-compositions") was reconsidered after Phase 1 dig surfaced the schema family cohesion (5 schemas in `.claude/schemas/`) and the engine-side validation contract pattern. Friction is sync, not ownership.
- **Schema version bumps to 1.1** with the four cycle-002 fields added explicitly — preserves `additionalProperties: false` strictness while accepting the new shapes.
- **Backward compatible.** v1.0 YAMLs continue to validate; v1.1 introduces optional new fields. No existing composition breaks.
- **CI validates against public `$id` URL** (`https://loa.dev/schemas/composition.schema.json`). No git submodule needed; URL is the contract.
- **Don't extract to a third repo** (`@loa/schemas` package). Defer until a second/third consumer surfaces. Operator overbloat-pushback discipline holds.
- **Two PRs, sequenced.** loa-constructs schema bump merges first; construct-compositions CI/validator depends on the live schema URL being current.

## Three-tier mental model (corrected)

| Tier | Repo | Role |
|---|---|---|
| 1 | 30+ `construct-*` | Surface area; constructs authored as standalone repos |
| 2 | `loa-constructs` | Constructs Network — registry + engine + apps + canonical compositions + schema family |
| 3 | `construct-compositions` | External registry of composition YAMLs that conform to the schema family |

Tier 2 was originally framed as "just an index" — corrected: it's the engine + distribution + canonical reference + schema authority. Schema authoritative-home stays at tier 2. Tier 3 conforms.

## Estimated effort

- Schema bump (loa-constructs PR): ~30 min — single file edit + README update + validation against current YAMLs locally
- Validator + CI (construct-compositions PR): ~45 min — new script (~80 LOC), CI workflow, package.json update, schema_version bumps in ~10 YAMLs, README badge update
- Total: ~75 min for a single focused session

## Memory references

- `~/.claude/projects/-Users-zksoju-Documents-GitHub-henlo-monorepo/memory/feedback_schema_ownership_registry_owns_its_contract.md` — original ownership framing (now superseded by this session's revised conclusion)
- `~/.claude/projects/-Users-zksoju-Documents-GitHub-henlo-monorepo/memory/feedback_thinking_effort_per_stage.md`
- `~/.claude/projects/-Users-zksoju-Documents-GitHub-henlo-monorepo/memory/feedback_hibernation_copy_discipline.md`
- `~/.claude/projects/-Users-zksoju-Documents-GitHub-henlo-monorepo/memory/feedback_push_back_on_overbloated_compositions.md`

## Open threads (deferred to future sessions)

- `@loa/schemas` extraction — when a second non-construct-compositions consumer surfaces (Herald construct work, custom orchestrators)
- Runtime that interprets `surface_class` / `thinking_effort` to translate to API config — separate downstream concern
- Construct-graph validator integration — `loa-constructs/scripts/validate-composition.ts` (ghost-wire detection) is independent of this PR's JSON-schema validator
