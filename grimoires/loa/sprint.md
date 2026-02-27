# Sprint Plan: Distribution Layer Phase 3 — Cross-Platform & Navigation

**Cycle**: cycle-036 (Phase 3)
**SDD**: `grimoires/loa/sdd.md` (Phase 3 Cross-Platform & Navigation)
**Branch**: `feat/cycle-036-distribution-layer`
**Depends on**: Phase 1 (merged to feature branch), Phase 2 (merged to feature branch)

---

## Sprint 1: Content-Hash Staleness Detection (3 tasks)

### T1.1: Add compute_pack_hash() function
**File**: `.claude/scripts/constructs-install.sh`
**Change**: Add function that computes Merkle-root SHA-256 of all pack files (same algorithm as API)
**AC**: Function returns consistent hash for same file set

### T1.2: Store content_hash in .constructs-meta.json at install time
**File**: `.claude/scripts/constructs-install.sh`
**Change**: Call `compute_pack_hash()` in `update_pack_meta()`, write `content_hash` field
**AC**: After `constructs-install.sh pack <slug>`, meta file has `content_hash` for installed pack

### T1.3: Compare local vs registry hash in status command
**File**: `.claude/scripts/constructs-install.sh`
**Change**: In `show_pack_status()`, read local `content_hash` from meta and compare against registry hash (already fetched). Show SYNCED/DIVERGED/BEHIND/UNKNOWN indicators.
**AC**: `constructs-install.sh status` shows hash comparison results

---

## Sprint 2: Standalone Audit (2 tasks)

### T2.1: Add --standalone flag to validate-skills.sh
**File**: `.claude/scripts/validate-skills.sh`
**Change**: Add audit that checks SKILL.md files for:
1. `{context:...}` slots without documented defaults
2. Hard reads from grimoires/ without guards
3. Pack-level file references as runtime deps
Report PASS/WARN/FAIL per skill with actionable details.
**AC**: `validate-skills.sh --standalone` reports on all installed skills

### T2.2: Standardize Required Context headers in construct pack skills
**Files**: `.claude/constructs/packs/*/skills/*/SKILL.md` (23 skills with context slots)
**Change**: Ensure each skill using `{context:...}` has a standardized Required Context header documenting needed keys, purpose, and standalone degradation behavior.
**AC**: All 23 context-slot skills have documented defaults; `validate-skills.sh --standalone` shows 0 WARN

---

## Sprint 3: Per-Invocation CTAs (2 tasks)

### T3.1: Add ## Next Steps to skills that lack them
**Files**: `.claude/constructs/packs/*/skills/*/SKILL.md`
**Change**: Add `## Next Steps` output section to multi-pack skills that don't already have one. Each section lists 2-3 logical next commands from the same pack + `/loa` fallback.
**AC**: All skills in multi-skill packs have Next Steps sections

### T3.2: End-to-end validation
**Validation steps**:
1. Verify `validate-skills.sh --standalone` passes
2. Verify `bash -n` on all modified scripts
3. Verify content_hash field present in meta schema
4. Verify existing install/browse/sync commands unaffected
**AC**: All features work, no regressions

---

## Task Summary

| Sprint | Tasks | Files | Est. Lines |
|--------|-------|-------|-----------:|
| 1 | 3 | 1 modified (constructs-install.sh) | ~60 |
| 2 | 2 | 1 modified + ~23 SKILL.md updates | ~80 + docs |
| 3 | 2 | ~15 SKILL.md updates + validation | docs |
| **Total** | **7** | **2 scripts + ~38 SKILL.md files** | **~140 + docs** |

---

*"Cross-platform compatibility is not about the lowest common denominator. It's about graceful enrichment — each platform gets the best it can use."*
