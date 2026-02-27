# SDD: Constructs Network Distribution Layer — Phase 2 Self-Service

**Cycle**: cycle-036
**Created**: 2026-02-27
**Status**: Draft
**PRD**: `grimoires/loa/prd.md` (Constructs Network Distribution Layer)
**Scope**: Phase 2 — F2.1, F2.2, F2.3, F2.4
**Depends on**: Phase 1 (complete — PR #143)

---

## 1. Overview

Phase 2 enables self-service construct registration, sync, and status checking from the CLI. The critical discovery: **75% of the API surface already exists**.

### Existing Infrastructure (Already Implemented)

| Feature | Endpoint | Status | File |
|---------|----------|--------|------|
| Register repo | `POST /v1/packs/:slug/register-repo` | Complete | `packs.ts:764` |
| Sync from git | `POST /v1/packs/:slug/sync` | Complete | `packs.ts:879` |
| GitHub webhook | `POST /v1/webhooks/github` | Complete | `webhooks.ts:380` |
| Webhook config | `POST /v1/webhooks/configure` | Complete | `webhooks.ts:627` |
| Git sync service | `syncFromRepo()` | Complete | `git-sync.ts:784` |
| Rate limiting | `checkSyncRateLimit()` | Complete | `sync-rate-limit.ts` |
| Git URL validation | `validateGitUrl()` | Complete | `git-sync.ts:170` |

### What Needs Building

| Feature | Type | Effort |
|---------|------|--------|
| F2.1a: Extend register endpoint to accept `git_url` | API extension | Small (~30 lines) |
| F2.1b: Fix `userEmail` context bug | Bug fix | Trivial (1 line) |
| F2.3a: `constructs register` CLI command | New script | Medium (~200 lines) |
| F2.3b: `constructs sync` CLI command | New script | Small (~100 lines) |
| F2.3c: `constructs status` CLI command | New script | Medium (~150 lines) |
| F2.3d: Update browsing-constructs skill | Skill update | Small (~50 lines) |

Total new code: ~530 lines across 4 files + 2 modified files.

---

## 2. Detailed Design

### 2.1 F2.1a: Extend Register Endpoint

**File**: `apps/api/src/routes/constructs.ts` (lines 257-339)

**Current**: Accepts `{ slug, name, type }`, creates pack with `status: 'draft'`, `sourceType: 'registry'`.

**Change**: Add optional `git_url` and `git_ref` fields. When provided, chain to the existing `register-repo` logic after pack creation.

```typescript
// Extended request schema (line ~268)
const registerSchema = z.object({
  slug: z.string().min(3).max(100).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  name: z.string().min(1).max(255),
  type: z.enum(['skill-pack', 'tool-pack', 'codex', 'template']).optional().default('skill-pack'),
  git_url: z.string().url().optional(),
  git_ref: z.string().max(100).optional().default('main'),
});
```

When `git_url` is provided:
1. Create pack (existing logic)
2. Call `validateGitUrl(git_url)` from `git-sync.ts`
3. Clone + read manifest (existing `syncFromRepo()`)
4. Update pack with `sourceType='git'`, `gitUrl`, `gitRef`, `githubRepoId`
5. Create first `pack_version` with full validated manifest
6. Auto-publish pack (set `status: 'published'`) since manifest validation passed
7. Return enriched response including version info

Without `git_url`: existing behavior (slug reservation only).

### 2.1b: Fix userEmail Context Bug

**File**: `apps/api/src/routes/constructs.ts` (line ~279)

**Current**: `c.get('userEmail' as never)` — cast hack, `userEmail` not in `ContextVariableMap`
**Fix**: `c.get('user').email` — uses the declared `user: AuthUser` context variable

Also gate on `c.get('user').emailVerified` for registration.

---

### 2.2 F2.2: Sync Endpoint — No Work Needed

`POST /v1/packs/:slug/sync` at `packs.ts:879-1090` is fully implemented:
- Owner auth verification
- `sourceType === 'git'` guard
- Rate limiting (10/hour via `pack_sync_events`)
- Full content sync via `syncFromRepo()`
- Content hash computation
- Identity parsing and upsert
- Sync event recording

No changes needed.

---

### 2.3 F2.3: CLI Registration Commands

Three new commands added to the existing `constructs-install.sh` dispatch or as standalone scripts.

#### 2.3a: `constructs register` — New script `constructs-register.sh`

```bash
# Usage:
#   constructs-install.sh register <slug> --git-url <url> [--git-ref <ref>]
#   constructs-install.sh register <slug> --name "Display Name" --git-url <url>

# Flow:
# 1. Validate inputs (slug format, URL format)
# 2. Resolve API key via get_api_key()
# 3. POST /v1/constructs/register { slug, name, type, git_url, git_ref }
# 4. Display result: registry URL, sync status, skill count
# 5. Optionally trigger first sync if git_url provided and register succeeded
```

API call pattern follows existing `constructs-browse.sh` — curl config file for auth:

```bash
register_construct() {
    local slug="$1" name="$2" git_url="$3" git_ref="${4:-main}"
    local registry_url api_key

    registry_url=$(get_registry_url)
    api_key=$(get_api_key)
    [[ -z "$api_key" ]] && { echo "ERROR: No API key. Run /constructs auth setup" >&2; return 1; }

    local curl_config
    curl_config=$(mktemp)
    chmod 600 "$curl_config"
    echo "header = \"Authorization: Bearer ${api_key}\"" > "$curl_config"

    local body
    body=$(jq -n \
        --arg slug "$slug" \
        --arg name "${name:-$slug}" \
        --arg git_url "$git_url" \
        --arg git_ref "$git_ref" \
        '{slug: $slug, name: $name, git_url: $git_url, git_ref: $git_ref}')

    local response http_code
    response=$(curl -s -w "\n%{http_code}" \
        --config "$curl_config" \
        --proto =https --tlsv1.2 --max-time 120 \
        -H "Content-Type: application/json" \
        -d "$body" \
        "${registry_url}/constructs/register")

    rm -f "$curl_config"
    # Parse response...
}
```

#### 2.3b: `constructs sync` — Added to install dispatch

```bash
# Usage:
#   constructs-install.sh sync <slug>

# Flow:
# 1. Verify pack exists locally (check .constructs-meta.json)
# 2. Resolve API key
# 3. POST /v1/packs/<slug>/sync
# 4. Display: version synced, files changed, commit hash
# 5. If local install exists, offer to reinstall from updated registry
```

#### 2.3c: `constructs status` — Added to install dispatch

```bash
# Usage:
#   constructs-install.sh status <slug>

# Flow:
# 1. Read local meta from .constructs-meta.json (installed version, content hash)
# 2. GET /v1/constructs/<slug> (registry info)
# 3. GET /v1/packs/<slug>/hash (registry content hash)
# 4. Compare:
#    - Version: local vs registry → [SYNCED] / [BEHIND] / [AHEAD]
#    - Hash: local vs registry → [MATCH] / [DIVERGED]
# 5. Display formatted status
```

Status display format:

```
Pack: observer
  Installed: v2.0.0 (2026-02-15)
  Registry:  v2.0.0 (2026-02-27)
  Source:    git (https://github.com/0xHoneyJar/construct-observer.git)
  Hash:      [MATCH] a3f2c1...
  Status:    [SYNCED]

Pack: artisan
  Installed: v1.0.0 (2026-01-20)
  Registry:  v2.0.0 (2026-02-25)
  Hash:      [DIVERGED] local:b4e2d1... registry:f7a8c3...
  Status:    [BEHIND] — run /constructs sync artisan
```

#### 2.3d: Update browsing-constructs skill

**File**: `.claude/skills/browsing-constructs/SKILL.md`

Add three new commands to the skill's command table:

```markdown
| `/constructs register <slug> --git-url <url>` | Register a new construct from a git repo |
| `/constructs sync <slug>` | Sync installed construct from registry |
| `/constructs status [slug]` | Show sync status and version comparison |
```

Update the dispatch logic to call the new scripts.

---

### 2.4 F2.4: GitHub Webhook — No Work Needed

`POST /v1/webhooks/github` at `webhooks.ts:380-615` is fully implemented:
- HMAC-SHA256 signature verification
- Replay protection via `github_webhook_deliveries`
- Pack matching by `githubRepoId` or `gitUrl`
- Rate limiting per pack
- Full sync transaction

`POST /v1/webhooks/configure` at `webhooks.ts:627-679` provides setup instructions.

No changes needed.

---

## 3. Data Flow

### Register Flow (New)

```
CLI: /constructs register my-pack --git-url https://github.com/org/construct-my-pack.git
  → constructs-register.sh
    → POST /v1/constructs/register { slug, name, git_url, git_ref }
      → Create pack (status: published)
      → validateGitUrl() → cloneRepo() → readManifest() → collectFiles()
      → INSERT pack_versions (full manifest + content hash)
      → UPSERT construct_identities (if identity/ present)
      → Fetch githubRepoId from GitHub API
      → UPDATE packs SET sourceType, gitUrl, gitRef, githubRepoId
    ← { slug, version, files_synced, registry_url }
```

### Sync Flow (Existing API, New CLI)

```
CLI: /constructs sync my-pack
  → constructs-install.sh sync my-pack
    → POST /v1/packs/my-pack/sync
      → checkSyncRateLimit()
      → syncFromRepo(gitUrl, gitRef)
      → Compare content_hash
      → INSERT/UPDATE pack_versions if changed
      → recordSyncEvent('manual')
    ← { version, commit, files_synced }
  → If installed locally: offer reinstall from updated registry
```

### Status Flow (New)

```
CLI: /constructs status my-pack
  → constructs-install.sh status my-pack
    → Read .constructs-meta.json (local version, hash)
    → GET /v1/constructs/my-pack (registry version)
    → GET /v1/packs/my-pack/hash (registry hash)
    → Compare version + hash
    ← Formatted status display
```

---

## 4. Files Modified

| File | Change Type | Description |
|------|------------|-------------|
| `apps/api/src/routes/constructs.ts` | Modified | Extend register schema with git_url/git_ref, fix userEmail bug |
| `.claude/scripts/constructs-register.sh` | Created | New CLI registration command |
| `.claude/scripts/constructs-install.sh` | Modified | Add sync + status subcommands to dispatch |
| `.claude/skills/browsing-constructs/SKILL.md` | Modified | Add register, sync, status commands |

**No changes to**:
- `apps/api/src/routes/packs.ts` — sync and register-repo endpoints already complete
- `apps/api/src/routes/webhooks.ts` — GitHub webhook already complete
- `apps/api/src/services/git-sync.ts` — sync service already complete
- Database schema — all columns exist

---

## 5. Testing Strategy

| Test | Type | Validates |
|------|------|-----------|
| Register with git_url creates published pack | Integration | F2.1a — one-step register+link |
| Register without git_url creates draft | Integration | F2.1a — backwards compatible |
| Register with invalid git_url returns 400 | Integration | F2.1a — validation |
| Fix: userEmail uses AuthUser.email | Unit | F2.1b — context variable |
| CLI register calls correct endpoint | Unit | F2.3a — API integration |
| CLI sync triggers re-download | Integration | F2.3b — local update |
| CLI status shows SYNCED/BEHIND/DIVERGED | Unit | F2.3c — hash comparison |
| Rate limit blocks >10 syncs/hour | Integration | Existing — verify |
| Webhook triggers sync on push | Integration | Existing — verify |

---

*"The infrastructure was already built. We just needed to put a door on the front."*
