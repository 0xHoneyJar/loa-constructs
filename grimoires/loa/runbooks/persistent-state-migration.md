# Persistent State Migration Guide

**Sprint plan §State-Key Migration Story** (closes Flatline IMP-006).
Documents the `compose-state-migrate.sh` workflow for schema_version bumps.

---

## Overview

Persistent state is keyed by six components (SDD §3.3):

```
.run/compose/persistent/
  <project_id>/
    <composition_id>/
      <construct_slug>/
        <skill_slug>/
          <stage_id>/
            <schema_version>/
              state.json
```

When a construct bumps `schema_version`:
- **Old state is not auto-migrated** — it stays at the old path.
- **New state initializes fresh** at the new path.
- **Migration is explicit and operator-driven** via `compose-state-migrate.sh`.

This is intentional: silent auto-migration can corrupt state if the transform
is wrong. The operator reviews and approves each transform.

---

## When to Migrate

Migrate persistent state when:
1. A construct bumps its `schema_version` (e.g., `v1` → `v2`) and the payload
   shape changes.
2. A composition is renamed (changes `composition_id`) and you want to preserve
   state across the rename.
3. You want to transfer state from one project to another (`project_id` change).

You do NOT need to migrate when:
- The construct is running on fresh state (no prior runs with the old version).
- The state has already expired past its TTL.
- The payload change is backwards-compatible and the construct reads both formats.

---

## Migration Workflow

### Step 1 — Inspect Existing State

```bash
# List all state files for a construct
lib/persistent-state.sh path \
    --project-id loa-constructs \
    --composition-id "audit-feel@sha256:a3f2b1d4e5c6" \
    --construct-slug artisan \
    --skill-slug decomposing-feel \
    --stage-id audit-feel.stage-1 \
    --schema-version v1

# Read the current payload
lib/persistent-state.sh get \
    --project-id loa-constructs \
    --composition-id "audit-feel@sha256:a3f2b1d4e5c6" \
    --construct-slug artisan \
    --skill-slug decomposing-feel \
    --stage-id audit-feel.stage-1 \
    --schema-version v1
```

### Step 2 — Author the Transform

The transform is a `jq` expression that converts the old payload to the new shape.

**Example**: construct bumps from v1 to v2, renaming `material_score` to
`craft_score` and adding a required `confidence` field:

```bash
TRANSFORM='.payload | {
  craft_score: .material_score,
  confidence: (.confidence // 0.5),
  last_surface: .last_surface
}'
```

Test the transform against the current state before running migration:
```bash
lib/persistent-state.sh get \
    --project-id loa-constructs \
    --composition-id "audit-feel@sha256:a3f2b1d4e5c6" \
    --construct-slug artisan \
    --skill-slug decomposing-feel \
    --stage-id audit-feel.stage-1 \
    --schema-version v1 \
  | jq "$TRANSFORM"
```

### Step 3 — Run the Migration

```bash
.claude/scripts/compose-state-migrate.sh \
    --project-id loa-constructs \
    --composition-id "audit-feel@sha256:a3f2b1d4e5c6" \
    --construct-slug artisan \
    --skill-slug decomposing-feel \
    --stage-id audit-feel.stage-1 \
    --from-version v1 \
    --to-version v2 \
    --transform "$TRANSFORM"
```

The migration script:
1. Reads the source state (acquiring shared flock).
2. Applies the transform via `jq`.
3. Validates the result against the new schema (if a schema is registered).
4. Writes to the new path using atomic-rename (exclusive flock).
5. Appends a migration log entry to `.run/compose/persistent/migrations.jsonl`.
6. **Does not delete the old state** — old state is retained until `--finalize`.

### Step 4 — Verify the Migration

```bash
# Read the new state
lib/persistent-state.sh get \
    --project-id loa-constructs \
    --composition-id "audit-feel@sha256:a3f2b1d4e5c6" \
    --construct-slug artisan \
    --skill-slug decomposing-feel \
    --stage-id audit-feel.stage-1 \
    --schema-version v2

# Check the migration log
cat .run/compose/persistent/migrations.jsonl | jq 'select(.construct_slug == "artisan")'
```

### Step 5 — Finalize (Remove Old State)

Once you've verified the new state is correct:

```bash
.claude/scripts/compose-state-migrate.sh \
    --project-id loa-constructs \
    --composition-id "audit-feel@sha256:a3f2b1d4e5c6" \
    --construct-slug artisan \
    --skill-slug decomposing-feel \
    --stage-id audit-feel.stage-1 \
    --from-version v1 \
    --finalize \
    --remove-old-versions
```

**Warning**: `--remove-old-versions` is irreversible. Run only after verifying
the migrated state is correct and the construct has run at least once on v2.

---

## Migration Log Format (`.run/compose/persistent/migrations.jsonl`)

Each migration appends one JSONL record:

```json
{
  "ts": "2026-05-09T12:00:00Z",
  "op": "migrate",
  "from_path": ".run/compose/persistent/.../v1/state.json",
  "to_path": ".run/compose/persistent/.../v2/state.json",
  "from_version": "v1",
  "to_version": "v2",
  "source_hash": "sha256:abc123...",
  "dest_hash": "sha256:def456...",
  "transform_expr": ".payload | {...}",
  "finalized": false
}
```

When `--finalize` is run, a second record is appended with `"op": "finalize"`.

---

## Bulk Migration

When a construct bumps schema_version and all compositions need migrating:

```bash
# Find all state files for the construct at the old version
find .run/compose/persistent/ \
    -path "*/artisan/decomposing-feel/*/v1/state.json" \
    -type f

# Run migration for each (or use the --all flag if available)
.claude/scripts/compose-state-migrate.sh \
    --construct-slug artisan \
    --skill-slug decomposing-feel \
    --from-version v1 \
    --to-version v2 \
    --transform "$TRANSFORM" \
    --all
```

---

## TTL Implications

During migration:
- Old state retains its original TTL.
- New state inherits the old `ttl_seconds` and `ttl_policy`.
- `last_updated` and `last_accessed` are set to migration time.
- `ttl_expires` is recomputed from migration time + `ttl_seconds`.

If the old state is near expiry, migrate before the TTL runs out to avoid
losing the source data.

---

## Troubleshooting

### Migration fails with `[STATE-OWNERSHIP-VIOLATION]`

The migration script runs as the owning construct + skill. If `owning_construct`
in the state file differs from the `--construct-slug` argument:

```bash
# Check the owning construct
cat <state_path> | jq '.ownership'
```

Use the owning construct's slug in `--construct-slug` to satisfy the ownership check.

### Old state not found

Either the composition_id has changed (slug-at-sha format, stable across runs
but changes when composition content changes), or the state has already expired.

```bash
# Find state by construct slug alone
find .run/compose/persistent/ -name "state.json" \
  | xargs grep -l '"construct_slug": "artisan"' 2>/dev/null
```

---

## See Also

- `lib/persistent-state.sh` — state manager API
- SDD §3.3 (composite key + TTL policy)
- SDD §4.5 (GC race coordination)
- `grimoires/loa/runbooks/context-policy-guide.md` — context_policy fields
