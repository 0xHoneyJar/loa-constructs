# SDD: Constructs Network Distribution Layer — Phase 3 Cross-Platform & Navigation

**Cycle**: cycle-036
**Created**: 2026-02-27
**Status**: Draft
**PRD**: `grimoires/loa/prd.md` (Constructs Network Distribution Layer)
**Scope**: Phase 3 — F3.1, F3.2, F3.3
**Depends on**: Phase 1 (complete), Phase 2 (complete)

---

## 1. Overview

Phase 3 closes the distribution layer with three features: standalone skill compatibility, per-invocation navigation, and local content-hash divergence detection.

### Key Discovery: Skills Are Already 90% Standalone

The Loa framework skills (55 skills in `.claude/skills/`) have **zero** hard pack-level dependencies. The installed construct pack skills (23 skills across 5 packs) have two categories of non-standalone patterns:

| Pattern | Count | Severity | Fix |
|---------|-------|----------|-----|
| `{context:...}` slots without fallback defaults | 23 skills | Medium — verbatim literal in output | Add default values in SKILL.md |
| `grimoires/` read-dependencies | ~5 skills | Low — skills create the files they need | Document as optional |
| `resources/` template refs | 2 skills | Low — bundled with pack | Note standalone limitation |
| `persona.yaml` / `construct.yaml` refs | 0 skills | N/A | Already clean |

### Existing Infrastructure

| Feature | Status | File |
|---------|--------|------|
| `golden_path.detect_state` execution | Complete | `golden-path.sh:323` |
| `GET /v1/packs/:slug/hash` | Complete | `packs.ts:1596` |
| `compute_file_sha256` | Complete | `constructs-install.sh:1530` |
| `update_pack_meta()` with git fields | Complete | `constructs-install.sh:913` |
| Static "Next Steps" in skill outputs | Exists (6 skills) | Various SKILL.md files |
| `validate-skills.sh` | Complete but no standalone check | `scripts/validate-skills.sh` |

### What Needs Building

| Feature | Type | Effort |
|---------|------|--------|
| F3.1: Standalone audit check in validate-skills.sh | Script extension | Small (~40 lines) |
| F3.1: Context slot default documentation | Doc updates | Small (23 skills need headers) |
| F3.2: `## Next Steps` output section standard | Spec + SKILL.md updates | Medium (~30 lines per skill) |
| F3.2: golden_path declarations in construct.yaml | Manifest updates | Small (~10 lines per pack) |
| F3.3: Local content hash at install time | Script extension | Small (~30 lines) |
| F3.3: Hash comparison in status command | Script extension | Small (~20 lines) |

Total new code: ~300 lines across scripts + doc updates across skills.

---

## 2. Detailed Design

### 2.1 F3.1: Standalone SKILL.md Audit

#### 2.1a: Extend validate-skills.sh

**File**: `.claude/scripts/validate-skills.sh`

Add a `--standalone` flag that checks each skill SKILL.md for:
1. `{context:...}` slots without documented defaults
2. Hard file reads from `grimoires/` without "if exists" guards
3. References to pack-level files (`persona.yaml`, `construct.yaml`) as runtime deps

Report format:
```
STANDALONE AUDIT
================
PASS: 55/78 skills are fully standalone
WARN: 23/78 skills have context slots needing defaults
  - beacon/accepting-payments: {context:chain_config.default_token} (no default)
  - crucible/validating-journeys: {context:qa_fixtures} (no default)
  ...
```

#### 2.1b: Context Slot Default Documentation

For each of the 23 skills using `{context:...}` slots, add a **Required Context** header at the top of the SKILL.md that documents:
1. Which context keys are needed
2. What the slot does
3. A sensible placeholder/default when context is unavailable

This is documentation only — the Loa runtime already handles context resolution. The goal is that an agent on Cursor/Copilot can read the SKILL.md and understand what values to substitute.

**Pattern** (already used by beacon skills like `accepting-payments`):
```markdown
> **Required context:** `chain_config` overlay
> Provide `chain_config.default_token`, `chain_config.network_id`, etc.
> Without context, slots appear as `{context:...}` literals.
```

Scope: Review and document the 23 skills. Many already have partial documentation — standardize the format.

---

### 2.2 F3.2: Per-Invocation Call-to-Actions

#### Approach: SKILL.md Output Spec Enrichment

Rather than building new runtime infrastructure, standardize the existing pattern where skills include `## Next Steps` in their output format spec. This is the lowest-infrastructure approach and works across all 37+ SKILL.md-compatible platforms.

**Why not a runtime hook?** No packs currently declare `golden_path.commands` or `golden_path.detect_state`. Building a `constructs-loader.sh post-execution` hook would be dead code. Instead, formalize the static pattern that 6 skills already use.

#### Standard

Every skill that belongs to a pack with multiple skills SHOULD include a `## Next Steps` section at the end of its output format spec. The section:

1. Lists 2-3 logical next commands from the same pack
2. Uses conditional phrasing when suggestions depend on output state
3. Always includes `/loa` as a fallback orientation command

**Example** (for observer/analyzing-gaps):
```markdown
## Next Steps

- `/file-gap` — File issues from gaps identified above
- `/diagram` — Update state diagrams with new findings
- `/loa` — Check your full workflow status
```

#### Scope

Add `## Next Steps` sections to skills that don't already have them and belong to multi-skill packs. Prioritize the 5 installed packs (observer, artisan, crucible, beacon, gtm-collective).

**Already have Next Steps** (6 skills): grounding-code, validating-journeys, analyzing-gaps, diagramming-states, accepting-payments, auditing-content

**Need Next Steps**: Remaining skills in multi-skill packs (~15-20 skills).

This is a documentation task, not a code change.

---

### 2.3 F3.3: Content-Hash Staleness Detection

#### 2.3a: Compute Local Hash at Install Time

**File**: `constructs-install.sh` — modify `update_pack_meta()`

After pack installation, compute the Merkle-root SHA-256 hash (same algorithm as the API):

```bash
compute_pack_hash() {
    local pack_dir="$1"
    # Compute SHA-256 of each file, sort by path, then hash the concatenation
    find "$pack_dir" -type f -not -name '.license.json' -not -name '.constructs-meta.json' | \
        sort | \
        while read -r file; do
            local rel_path="${file#$pack_dir/}"
            local file_hash
            file_hash=$(sha256sum "$file" | cut -d' ' -f1)
            echo "$rel_path:$file_hash"
        done | sha256sum | cut -d' ' -f1
}
```

Store result in `.constructs-meta.json`:
```json
{
  "installed_packs": {
    "artisan": {
      "version": "1.0.0",
      "content_hash": "sha256:a3f2c1...",
      ...
    }
  }
}
```

#### 2.3b: Compare Hashes in Status Command

**File**: `constructs-install.sh` — modify `show_pack_status()`

Read local `content_hash` from meta, compare against registry hash (already fetched). Display:

| Local Hash | Registry Hash | Display |
|-----------|--------------|---------|
| Match | Match | `[SYNCED]` |
| Different | Present | `[DIVERGED]` — local files modified |
| Present | Different version | `[BEHIND]` — registry has newer version |
| Missing | Present | `[UNKNOWN]` — reinstall to compute hash |

---

## 3. Files Modified

| File | Change Type | Description |
|------|------------|-------------|
| `.claude/scripts/validate-skills.sh` | Modified | Add `--standalone` audit flag |
| `.claude/scripts/constructs-install.sh` | Modified | `compute_pack_hash()` + store in meta + compare in status |
| `.claude/constructs/packs/*/skills/*/SKILL.md` | Modified | Context slot defaults + Next Steps sections |

**No API changes needed** — all infrastructure exists.

---

## 4. Testing Strategy

| Test | Type | Validates |
|------|------|-----------:|
| `validate-skills.sh --standalone` passes | Unit | F3.1 — standalone audit |
| Context slot documentation present for all 23 skills | Manual audit | F3.1 — degradation docs |
| `## Next Steps` present in all multi-pack skills | Manual audit | F3.2 — CTA coverage |
| `content_hash` written to meta on install | Integration | F3.3 — hash computation |
| `status` shows SYNCED/DIVERGED correctly | Integration | F3.3 — hash comparison |

---

*"Standalone compatibility is not about removing the construct layer. It's about making it optional."*
