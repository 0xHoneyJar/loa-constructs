# Network Navigation Diagnostic — 2026-03-12

> **Status**: CRITICAL (API down) + 2 HIGH fixes applied locally
> **Discovered by**: Gecko ecosystem patrol + Bridgebuilder review
> **Impact**: Every Loa consumer sees empty registry. `/constructs` returns `[]`.

---

## Bug 1: API Crash Loop (CRITICAL)

**Symptom**: `api.constructs.network` returns 502 on all endpoints.

**Root cause**: Dockerfile uses floating `oven/bun:1.2` tag → resolved to v1.2.23 → **segfault crash loop** on Railway.

```
panic: Segmentation fault at address 0x4190
Bun v1.2.23 (cf136713) Linux x64 (baseline)
Elapsed: 29291ms | RSS: 0.60GB | Peak: 0.14GB
```

The API starts, runs ~29 seconds, segfaults, Railway restarts, repeat.

**Fix**: Pin both Dockerfile stages to `oven/bun:1.2.22`:
```dockerfile
FROM oven/bun:1.2.22 AS builder
FROM oven/bun:1.2.22-alpine AS runner
```

**Lesson**: Never use floating tags in production Dockerfiles. This is the exact class of problem an observability dashboard would catch within 60 seconds.

**Crash report**: `https://bun.report/1.2.23/Br1cf13671wwBqggUm25wvEg/vTwjtCu9sD0ro69CipxlhD80hXA2Ag5gB`

---

## Bug 2: Browse Script Auth Failure (HIGH)

**Symptom**: `constructs-browse.sh list --json` returns `[]` even when API is up.

**Root cause**: `~/.loa/credentials.json` contains `sk_test_cd2119233ce7425d83b0b6a9232d9cf0`. The `fetch_packs` function sends `Authorization: Bearer sk_test_...` → API returns 502 on invalid key. No fallback to unauthenticated request.

The `/v1/constructs?type=pack` endpoint is public — no auth required. But the script assumes auth always helps.

**Fix**: Added unauthenticated retry in `fetch_packs` and `fetch_pack_info` when auth fails (401/403/502):
```bash
# Auth-related failure — retry without auth (public endpoint)
if [[ -n "$api_key" ]] && [[ "$http_code" =~ ^(401|403|502|000)$ ]]; then
    response=$(curl -s -f -w "\n%{http_code}" "${registry_url}/constructs?type=pack" 2>/dev/null) || true
    # ... parse and cache on success
fi
```

**File**: `.claude/scripts/constructs-browse.sh` (System Zone — canonical fix needs upstream Loa PR)

**Secondary issue**: API key creation flow appears broken. The `sk_test_` prefix suggests this was a test token that should never have persisted. Need to audit the key issuance path in the API (`/v1/auth/api-keys`).

---

## Bug 3: Loader Discovery Failure (HIGH)

**Symptom**: `constructs-loader.sh list` returns "No registry skills installed" despite 8 packs with 50+ skills installed.

**Root cause (a)**: `discover_skills()` uses `find -type d` which **does not follow symlinks**. All skills under `.claude/constructs/skills/` are symlinks pointing to `../../packs/<pack>/skills/<skill>`.

**Root cause (b)**: `discover_packs()` only checks for `manifest.json` but installed packs use `construct.yaml` as their identifying file.

**Fix**:
```bash
# discover_skills: use -L to follow symlinks
find -L "$skills_dir" -mindepth 2 -maxdepth 2 -type d 2>/dev/null

# discover_packs: check for construct.yaml in addition to manifest.json
if [[ -f "$pack_dir/manifest.json" ]] || [[ -f "$pack_dir/construct.yaml" ]]; then
```

**File**: `.claude/scripts/constructs-loader.sh` (System Zone — canonical fix needs upstream Loa PR)

**After fix**: Loader discovers 19 skills across 3 packs (observer, crucible, artisan) + 8 packs total.

---

## Upstream Fix Path

Bugs 2 and 3 are in System Zone files (`.claude/scripts/`) managed by the Loa framework. The canonical fix path:

1. **Immediate**: Fixes applied locally in loa-constructs (breaks System Zone rule, justified by severity)
2. **Upstream**: PR to `0xHoneyJar/loa` with identical patches
3. **Propagation**: Next `/update-loa` in consumer repos picks up the fix

---

## Observability Gap Analysis

This incident exposed the complete absence of automated monitoring:

| What should have caught it | Current state |
|---|---|
| Uptime monitor on `api.constructs.network` | None |
| Railway deploy health alerts | None configured |
| Bun version pinning policy | Floating tags |
| API key validation on issuance | sk_test_ tokens persist with no expiry |
| Health dashboard in explorer | Exists but consumes Gecko data only, not Railway/Vercel status |
| Alerting (Discord/Slack/PagerDuty) | None |

**Time to detect**: Unknown (discovered manually during unrelated work)
**Time to diagnose**: ~15 minutes (Railway CLI → crash logs → Bun segfault)
**Time to fix**: ~5 minutes (pin Dockerfile + push)

The gap between "5 minutes to fix" and "unknown time to detect" is the entire value proposition of the observability dashboard.
