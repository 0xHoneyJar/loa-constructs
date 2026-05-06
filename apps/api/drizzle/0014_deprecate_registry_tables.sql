-- Migration: deprecate registry tables (packs / skills / skill_versions)
-- SDD: grimoires/loa/sdd-constructs-network-migration-2026-05-05.md §4.3
-- ADR: ADR-002 (Postgres role narrowed to ops-state-only)
-- FR: FR-1.4
-- Cycle: constructs-network-migration

-- The registry data lives at loa-constructs/registry.yaml (yaml-sourced via
-- registry-loader.ts, FR-1.6). These tables retain their schema for 30 days
-- so any existing dependents have a deprecation grace, then are dropped in a
-- follow-on cycle. Read paths switch to registry-loader (T-1.4.1 audit + ports).

COMMENT ON TABLE "packs"
  IS 'DEPRECATED 2026-05-05 · registry data lives in loa-constructs/registry.yaml · scheduled drop in follow-on cycle 2026-06-XX · do not write';

COMMENT ON TABLE "skills"
  IS 'DEPRECATED 2026-05-05 · registry data lives in loa-constructs/registry.yaml · scheduled drop in follow-on cycle 2026-06-XX · do not write';

COMMENT ON TABLE "skill_versions"
  IS 'DEPRECATED 2026-05-05 · registry data lives in loa-constructs/registry.yaml · scheduled drop in follow-on cycle 2026-06-XX · do not write';
