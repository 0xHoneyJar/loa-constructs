# Sprint Plan: Bridgebuilder Security Remediation — PR #123

**Cycle**: cycle-015 (remediation sub-plan)
**PRD**: grimoires/loa/prd-bridgebuilder-remediation.md
**SDD**: grimoires/loa/sdd-bridgebuilder-remediation.md
**Created**: 2026-02-16
**Status**: Ready for Implementation

---

## Overview

| Aspect | Value |
|--------|-------|
| Total sprints | 2 |
| Team size | 1 (AI agent) |
| Sprint duration | 1 sprint = 1 `/run` cycle |
| Total tasks | 10 |
| Goal | Resolve 7 Bridgebuilder findings (6 requiring code, 1 already resolved) |

### Sprint Summary

| Sprint | Focus | Tasks | Key Deliverable |
|--------|-------|-------|-----------------|
| 1 | Security-Critical | 6 | Token refresh race fix, eval trust boundary, DNS pinning, regex DoS |
| 2 | Hardening | 4 | Eval ledger HMAC, model fallback, verification of MEDIUM-3 |

---

## Sprint 1: Security-Critical

**Goal**: Resolve all CRITICAL and HIGH findings that block PR #123 merge.

**Verification**: `pnpm --filter explorer build` succeeds. `pnpm --filter api build` succeeds. Eval workflow unchanged for existing suites. Auth refresh works without 401 cascades.

### Tasks

#### T1.1: Add `isRefreshing` state and `refreshLog` to auth store

- **File(s)**: `apps/explorer/lib/stores/auth-store.ts`
- **Description**: Add `isRefreshing: boolean` and `refreshLog` array to auth store state. Set `isRefreshing = true` at start of `refreshToken()`, `false` in `.finally()`. Modify `getAccessToken()` to return `undefined` when `isRefreshing === true`. Add `waitForRefresh()` method that awaits `refreshPromise`. Append to `refreshLog` (capped at 20 entries) on each refresh completion.
- **Acceptance Criteria**:
  - `isRefreshing` starts as `false`, set `true` during refresh, reset in `.finally()`
  - `getAccessToken()` returns `undefined` when `isRefreshing === true`
  - `getAccessToken()` returns cookie value when `isRefreshing === false` (existing behavior preserved)
  - `waitForRefresh()` resolves when `refreshPromise` completes
  - `refreshLog` entries have `{ timestamp: number, success: boolean, reason: string }`
  - `refreshLog` never exceeds 20 entries
  - Single-flight lock behavior preserved (multiple `refreshToken()` calls coalesce via `refreshPromise`)
  - 14-minute interval refresh continues to work (no regression to `auth-initializer.tsx`)
  - Visibility-change refresh continues to work
- **Effort**: Medium
- **Dependencies**: None
- **Testing**: Unit tests for `getAccessToken()` returning `undefined` during refresh, `refreshLog` population and cap

#### T1.2: Add refresh-await to API client interceptor

- **File(s)**: `apps/explorer/lib/api/client.ts`
- **Description**: In `authFetch()` (line 97), add a check at the top: if `refreshPromise` is non-null, await it before making the initial request. This avoids the 401 round-trip when a refresh is already in flight.
- **Acceptance Criteria**:
  - Concurrent API calls during refresh wait for refresh completion instead of firing with stale token
  - After awaiting refresh, the fresh token is used for the request
  - Single-flight refresh lock in `client.ts` (line 94) still works independently
  - No change to public API surface of `createAuthClient`
- **Effort**: Small
- **Dependencies**: T1.1
- **Testing**: Integration test: two concurrent `authFetch` calls during refresh both succeed without 401

#### T1.3: Copy eval suites from base branch in CI

- **File(s)**: `.github/workflows/eval.yml`
- **Description**: Add workflow steps to: (1) copy `evals/suites/` from base branch alongside harness/graders, (2) sparse-checkout PR's `evals/suites/` to detect new files, (3) fail CI if PR introduces suite files not in base, (4) reject path traversal (`../`) and absolute paths in suite YAML globs.
- **Acceptance Criteria**:
  - Suite definitions sourced from base branch (not PR branch)
  - New suite files in PR trigger explicit failure message ("requires explicit review")
  - `../` patterns in suite YAML globs are rejected
  - Absolute path globs (`glob: /...`) are rejected
  - Existing legitimate eval workflows pass unchanged
  - Symlink check still runs on combined workspace
- **Effort**: Medium
- **Dependencies**: None
- **Testing**: Verify framework suite still runs. Verify new-suite detection message fires for added file.

#### T1.4: Pin resolved IP for git clone (TOCTOU mitigation)

- **File(s)**: `apps/api/src/services/git-sync.ts`
- **Description**: Modify `validateGitUrl()` to return a `ValidatedUrl` object containing `{ original, resolvedIp, hostname }` instead of `void`. Modify `cloneRepo()` to accept optional `pinnedIp` and `hostname` params, using `GIT_CONFIG_COUNT`/`GIT_CONFIG_KEY_0`/`GIT_CONFIG_VALUE_0` env vars to rewrite the URL at git transport layer. Update callers to pass the resolved IP through.
- **Acceptance Criteria**:
  - `validateGitUrl()` returns resolved public IPv4 address
  - `cloneRepo()` uses pinned IP via `GIT_CONFIG` env vars when provided
  - DNS cannot be re-resolved between validation and clone
  - `github.com` allowlist and private IP checks preserved
  - Clone timeout (30s) still applies
  - Add code comment explaining the TOCTOU mitigation
- **Effort**: Medium
- **Dependencies**: None
- **Testing**: Verify clone succeeds for legitimate github.com repos. Verify `validateGitUrl` returns resolved IP.

#### T1.5: Validate regex allowlist patterns and add timeout

- **File(s)**: `.claude/scripts/adversarial-review.sh`
- **Description**: Add `validate_allowlist_pattern()` function that rejects patterns with nested quantifiers (e.g., `(a+)+`, `(a*)*`). Filter `CONF_SECRET_ALLOWLIST` through validation before use. Wrap all `grep -oE "$pattern"` calls with `timeout 0.5s` guard. Log rejected patterns and timeouts.
- **Acceptance Criteria**:
  - Patterns with nested quantifiers (`(X+)+`, `(X*)+`, `(X+)*`, `(X*)*`) rejected with clear message
  - `grep -oE` operations have 0.5s timeout
  - Legitimate patterns (e.g., `[0-9a-f]{64}`, `sha256:[a-f0-9]+`) work correctly
  - Rejected patterns logged to stderr with explanation
  - Timeout events logged to stderr with pattern info
  - Existing BATS tests pass
- **Effort**: Small
- **Dependencies**: None
- **Testing**: Test with `(a+)+` pattern (rejected). Test with `[0-9a-f]{64}` (accepted). Verify timeout kills slow grep.

#### T1.6: Sprint 1 verification

- **File(s)**: None (verification task)
- **Description**: Run `pnpm --filter explorer build` and `pnpm --filter api build` to ensure no regressions. Verify auth store changes work with existing auth-initializer. Spot-check eval workflow YAML is valid.
- **Acceptance Criteria**:
  - Explorer builds without errors
  - API builds without errors
  - Auth store TypeScript compiles cleanly
  - eval.yml passes `actionlint` or manual YAML review
- **Effort**: Small
- **Dependencies**: T1.1, T1.2, T1.3, T1.4, T1.5
- **Testing**: Build verification

---

## Sprint 2: Hardening

**Goal**: Resolve MEDIUM and LOW findings. Verify MEDIUM-3 is already resolved.

**Verification**: Eval ledger entries are signed when key is set. Flatline falls back on model 404. Truncation priority confirmed correct.

### Tasks

#### T2.1: HMAC signing for eval ledger entries

- **File(s)**: `evals/harness/run-eval.sh`, `.github/workflows/eval.yml`
- **Description**: Add `sign_ledger_entry()` function to `run-eval.sh` that appends an HMAC-SHA256 `__sig` field to each JSONL entry using `EVAL_LEDGER_KEY` repo secret. Add `validate_ledger_entry()` to eval.yml's ledger validation step that checks signatures. Both degrade gracefully when `EVAL_LEDGER_KEY` is not set (warn, skip signing/validation).
- **Acceptance Criteria**:
  - New ledger entries include `__sig` field with `hmac-sha256:` prefix
  - Tampered entries (modified after signing) rejected with warning
  - Missing `EVAL_LEDGER_KEY` degrades gracefully: entries written unsigned, validation skipped with warning
  - Unsigned entries from before this change are still readable (backward compatible)
  - Existing eval workflow still passes
  - `openssl dgst` used for HMAC computation (available in CI runner)
- **Effort**: Medium
- **Dependencies**: None
- **Testing**: Sign an entry, verify passes validation. Tamper an entry, verify rejection. Remove key, verify graceful degradation.

#### T2.2: Flatline model fallback on unavailability

- **File(s)**: `.claude/scripts/flatline-orchestrator.sh`
- **Description**: Add `handle_model_error()` function that catches model 404/deprecated exit codes and falls back to secondary model. Ensure config-specified models take precedence over hardcoded defaults. Log model resolution with warning on fallback.
- **Acceptance Criteria**:
  - Model 404 (exit code 40) or deprecated (exit code 41) triggers fallback to secondary model
  - Fallback logged with `WARN` level including original and fallback model names
  - Config models (`flatline_protocol.models.primary/secondary`) take precedence over hardcoded defaults
  - Secondary model failure is a hard error (no infinite fallback chain)
  - Hardcoded defaults (`opus`, `gpt-5.2`) only used when config is empty, with warning
- **Effort**: Small
- **Dependencies**: None
- **Testing**: Verify warning is logged when using hardcoded default. Verify fallback flow with simulated exit code 40.

#### T2.3: Verify MEDIUM-3 truncation priority (no-code)

- **File(s)**: `.claude/skills/bridgebuilder-review/resources/core/truncation.ts` (read-only verification)
- **Description**: Confirm that `.github/workflows/` files already get highest truncation priority via `SECURITY_PATTERNS` (line 40) and `getFilePriority()` (line 617). Confirm `Dockerfile` and `docker-compose` patterns present (lines 43-44). Document verification in reviewer.md.
- **Acceptance Criteria**:
  - `isHighRisk('.github/workflows/eval.yml')` returns `true`
  - `getFilePriority()` returns `4` for workflow files
  - `Dockerfile` pattern present in `SECURITY_PATTERNS`
  - `docker-compose` pattern present in `SECURITY_PATTERNS`
  - No code changes needed — document as "verified, already resolved"
- **Effort**: Small (verification only)
- **Dependencies**: None
- **Testing**: Code review / assertion check

#### T2.4: Sprint 2 verification

- **File(s)**: None (verification task)
- **Description**: Run eval harness locally if possible. Verify `flatline-orchestrator.sh` syntax (`bash -n`). Full build check.
- **Acceptance Criteria**:
  - `bash -n .claude/scripts/flatline-orchestrator.sh` passes
  - `bash -n .claude/scripts/adversarial-review.sh` passes
  - `bash -n evals/harness/run-eval.sh` passes
  - Explorer and API builds succeed
- **Effort**: Small
- **Dependencies**: T2.1, T2.2, T2.3
- **Testing**: Syntax and build verification

---

## Dependency Graph

```
Sprint 1:
  T1.1 ──→ T1.2 ──┐
  T1.3 ────────────┤
  T1.4 ────────────┼──→ T1.6
  T1.5 ────────────┘

Sprint 2:
  T2.1 ────────────┐
  T2.2 ────────────┼──→ T2.4
  T2.3 ────────────┘
```

T1.1 → T1.2 is the only inter-task dependency (API client needs auth store changes first). All other tasks are independent within their sprint.

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| Auth store change breaks 14-min refresh interval | Test `auth-initializer.tsx` integration explicitly |
| `GIT_CONFIG` env vars conflict with user's git config | Use `GIT_CONFIG_COUNT` (additive), not `GIT_CONFIG` (overwrite) |
| `openssl dgst` not available in CI runner | ubuntu-latest includes openssl; fallback: skip signing with warning |
| Regex validation rejects legitimate config patterns | Conservative check — only nested quantifiers, not all complex patterns |
| Sparse checkout step adds CI time | Only fetches `evals/suites/` — negligible disk/time |

---

## Definition of Done

1. All CRITICAL and HIGH findings resolved with tests (Sprint 1)
2. MEDIUM-1 and LOW-1 resolved with tests (Sprint 2)
3. MEDIUM-3 verified as already resolved — documented
4. CI passes with all fixes applied
5. Auth store changes verified with build + type check
6. Eval workflow YAML validated
7. Shell scripts pass `bash -n` syntax check
