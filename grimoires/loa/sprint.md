# Sprint Plan: Distribution Layer Phase 2 — Self-Service

**Cycle**: cycle-036 (Phase 2)
**SDD**: `grimoires/loa/sdd.md` (Phase 2 Self-Service)
**Branch**: `feat/cycle-036-distribution-layer`
**Depends on**: Phase 1 (PR #143, merged to feature branch)

---

## Sprint 1: API Extension + Bug Fix (3 tasks)

### T1.1: Fix userEmail context bug in register endpoint
**File**: `apps/api/src/routes/constructs.ts`
**Change**: Replace `c.get('userEmail' as never)` with `c.get('user').email` and gate on `c.get('user').emailVerified`
**AC**: Register endpoint uses declared ContextVariableMap types, no cast hacks

### T1.2: Extend register schema to accept git_url and git_ref
**File**: `apps/api/src/routes/constructs.ts`
**Change**: Add optional `git_url` (z.string().url()) and `git_ref` (z.string(), default 'main') to the register Zod schema
**AC**: Schema validates git_url as URL, git_ref as string

### T1.3: Chain register → register-repo → sync when git_url provided
**File**: `apps/api/src/routes/constructs.ts`
**Change**: After pack creation, if git_url provided:
1. Import and call `validateGitUrl()` from `git-sync.ts`
2. Import and call `syncFromRepo()` for initial version
3. Update pack with source_type='git', git_url, git_ref, github_repo_id
4. Create pack_version with full manifest + content_hash
5. Set status='published' (validation passed)
6. Return enriched response with version info
**AC**: `POST /v1/constructs/register { slug, name, git_url }` creates a fully populated, published pack in one call. Without git_url, existing behavior preserved.

---

## Sprint 2: CLI Commands (4 tasks)

### T2.1: Create constructs-register.sh
**File**: `.claude/scripts/constructs-register.sh` (new)
**Implements**: `register_construct()` function
**Flow**:
1. Parse args: `<slug> --git-url <url> [--name "Name"] [--git-ref <ref>]`
2. Validate slug format via `validate_safe_identifier()`
3. Validate URL format via `validate_url()`
4. Resolve API key via `get_api_key()`
5. POST to `/v1/constructs/register` with curl config file auth (SHELL-002 pattern)
6. Parse response, display result
**Security**: Curl config file for auth (not inline header), HTTPS-only, TLS 1.2+
**AC**: `/constructs register my-pack --git-url https://github.com/org/construct-my-pack.git` succeeds

### T2.2: Add sync subcommand to constructs-install.sh
**File**: `.claude/scripts/constructs-install.sh`
**Change**: Add `sync` case to the main dispatch (alongside pack/skill/uninstall/link-commands)
**Flow**:
1. Verify slug is provided
2. Check pack exists in .constructs-meta.json (optional — can sync even if not installed locally)
3. POST to `/v1/packs/<slug>/sync` with curl config file auth
4. Parse response: version, commit, files_synced
5. If installed locally and version changed, suggest `/constructs install <slug>` to update
**AC**: `/constructs sync observer` triggers sync and shows result

### T2.3: Add status subcommand to constructs-install.sh
**File**: `.claude/scripts/constructs-install.sh`
**Change**: Add `status` case to main dispatch
**Flow**:
1. If slug provided: show single pack status
2. If no slug: show all installed packs status
3. Read local data from `.constructs-meta.json`
4. GET `/v1/constructs/<slug>` for registry data
5. GET `/v1/packs/<slug>/hash` for registry content hash
6. Compare versions (semver) → SYNCED / BEHIND / AHEAD
7. Compare hashes → MATCH / DIVERGED
8. Format output
**AC**: `/constructs status` shows formatted status for all installed packs with sync indicators

### T2.4: Wire dispatch for register, sync, status
**File**: `.claude/scripts/constructs-install.sh`
**Change**: Update the main case statement to dispatch `register` to `constructs-register.sh`, and handle `sync`/`status` inline
**AC**: `constructs-install.sh register ...`, `constructs-install.sh sync ...`, `constructs-install.sh status ...` all dispatch correctly

---

## Sprint 3: Skill Update + Integration (3 tasks)

### T3.1: Update browsing-constructs SKILL.md
**File**: `.claude/skills/browsing-constructs/SKILL.md`
**Change**: Add `register`, `sync`, `status` to the command table and dispatch instructions
**AC**: Skill documentation includes all three new commands with usage examples

### T3.2: Update browsing-constructs index.yaml
**File**: `.claude/skills/browsing-constructs/index.yaml`
**Change**: Add `register`, `sync`, `status` to the valid `action` enum in inputs
**AC**: Skill metadata reflects new actions

### T3.3: End-to-end validation
**Validation steps**:
1. Verify API register endpoint compiles (TypeScript check)
2. Verify CLI scripts pass `bash -n` syntax check
3. Verify existing install/browse/uninstall commands unaffected
4. Verify new dispatch cases route correctly
**AC**: All new commands work, no regressions

---

## Task Summary

| Sprint | Tasks | Files | Est. Lines |
|--------|-------|-------|-----------|
| 1 | 3 | 1 modified (constructs.ts) | ~80 |
| 2 | 4 | 1 new + 1 modified (register.sh, install.sh) | ~400 |
| 3 | 3 | 2 modified (SKILL.md, index.yaml) | ~60 |
| **Total** | **10** | **4 files** | **~540** |

---

*"Self-service is not about automation. It's about removing yourself from the critical path."*
