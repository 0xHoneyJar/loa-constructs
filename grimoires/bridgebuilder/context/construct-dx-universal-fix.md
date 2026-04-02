# Construct DX: Universal Index Generation Fix

> Context brief for 0xHoneyJar/loa PR — making construct.yaml a first-class primary source

## Problem

`construct-index-gen.sh` (in `.claude/scripts/`) requires `manifest.json` in each pack directory as the entry gate (line 277-279). Packs that only have `construct.yaml` are silently skipped. This causes:

- Packs installed via git clone/symlink/manual copy (the most common dev workflow) often lack `manifest.json`
- Only 5 of 27 packs were indexed in rektdrop-interface until manual intervention
- Every repo with locally-installed packs has the same silent degradation
- `construct-resolve.sh` hard-exits (code 3) when no index exists, with no fallback

## Root Cause

Two install paths, one generates `manifest.json`, one doesn't:

| Install Path | manifest.json | construct.yaml | Index Works? |
|---|---|---|---|
| Registry API (`constructs-install pack <slug>`) | Written by Python extractor from API response | May exist | Yes |
| Git clone / symlink / manual copy | NOT generated | Always exists | **NO** — pack silently skipped |

`construct.yaml` is treated as an overlay that enriches `manifest.json`, never as a standalone primary source. But `construct.yaml` contains ALL the same fields (schema v3) and is the developer-authored canonical file.

## Proposed Fix (3 changes to `loa` repo)

### Fix 1 — `construct-index-gen.sh`: construct.yaml as primary source

In `process_pack()`, after the `manifest.json` check fails, add a fallback that converts `construct.yaml` to JSON via `yq`:

```bash
local manifest="$pack_dir/manifest.json"
if [[ ! -f "$manifest" ]]; then
    # Fallback: generate manifest from construct.yaml
    local construct_yaml="$pack_dir/construct.yaml"
    if [[ -f "$construct_yaml" ]] && command -v yq &>/dev/null; then
        log "    Generating manifest.json from construct.yaml"
        yq eval -o=json '.' "$construct_yaml" > "$manifest" 2>/dev/null || {
            warn "Failed to convert construct.yaml for pack '$pack_slug'"
            return 1
        }
    else
        return 1
    fi
fi
```

This is backwards-compatible: if manifest.json exists, behavior is unchanged. If only construct.yaml exists, it's auto-converted. The generated manifest.json should NOT be gitignored — it becomes a cache that subsequent runs can skip.

### Fix 2 — `constructs-install.sh`: local-source path calls index-gen

In `do_install_pack()`, the local-source install path (lines ~465-494) should call index-gen after completing, same as the registry path. Currently only the registry path (line 738-741) triggers regeneration.

### Fix 3 — `construct-resolve.sh`: graceful fallback

When index is missing, instead of hard-exit code 3, attempt on-demand generation:

```bash
if [[ ! -f "$index_file" ]]; then
    # Try on-demand generation
    if [[ -x "$SCRIPT_DIR/construct-index-gen.sh" ]]; then
        "$SCRIPT_DIR/construct-index-gen.sh" --quiet 2>/dev/null
    fi
    if [[ ! -f "$index_file" ]]; then
        echo "ERROR: Construct index not found and could not be generated" >&2
        exit 3
    fi
fi
```

## Full Gap Inventory (6 gaps found)

| # | Gap | Severity | Fix |
|---|-----|----------|-----|
| 4 | index-gen skips construct.yaml-only packs | CRITICAL | Fix 1 |
| 1 | Local-source install path skips index regen | HIGH | Fix 2 |
| 6 | construct-resolve.sh hard-exits, no fallback | MEDIUM | Fix 3 |
| 5 | No hook auto-regenerates index on pack change | MEDIUM | Optional: PostToolUse hook |
| 3 | link-commands doesn't regen index | MEDIUM | Add index-gen call to do_link_commands |
| 2 | Standalone skill install never triggers regen | LOW | By design (skills don't appear in pack index) |

## Impact

- **Repos affected**: Every repo with Loa + constructs installed via clone/symlink
- **Confirmed broken**: rektdrop-interface (5/27 indexed), hub-interface (0 indexed), set-and-forgetti (0 indexed)
- **Fix scope**: 3 files in `.claude/scripts/`, backwards-compatible, no config changes needed

## Evidence

- Session discovery: 2026-03-28, rektdrop-interface healthcheck
- Install flow audit: `constructs-install.sh` lines 465-494 (local path), 624 (manifest write), 738-741 (index regen)
- Index gen audit: `construct-index-gen.sh` lines 277-279 (hard gate), 311-313 (overlay only)
- Resolve audit: `construct-resolve.sh` `_load_index()` (hard exit)
