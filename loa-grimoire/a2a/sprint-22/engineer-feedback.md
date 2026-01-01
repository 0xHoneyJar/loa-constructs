# Sprint 22 Engineer Feedback

**Sprint**: Sprint 22 - Soft Launch Deployment
**Reviewer**: Senior Technical Lead
**Date**: 2026-01-02
**Status**: APPROVED

---

## Review Summary

All Sprint 22 acceptance criteria have been verified. The soft launch deployment is live and functional.

## Task Verification

### T22.1: Install & Auth CLI Tools
- [x] Fly CLI installed and authenticated
- [x] Vercel CLI installed and authenticated

### T22.2: Deploy API to Fly.io
- [x] Secrets configured (DATABASE_URL, JWT_SECRET)
- [x] Deploy completed successfully
- [x] Health check passes at `https://loa-constructs-api.fly.dev/v1/health`
- [x] API responds with 200 OK

**Verified**:
```json
{"status":"healthy","version":"0.1.0","build":"2026-01-02T10:05:00Z","environment":"production"}
```

### T22.3: Update CORS for Vercel Auto-URL
- [x] CORS allows `*.vercel.app` in production (line 58 in app.ts)
- [x] Typecheck passes
- [x] Changes committed

**Code Review**:
```typescript
// apps/api/src/app.ts:54-59
function isAllowedOrigin(origin: string): boolean {
  if (env.NODE_ENV !== 'production') return true;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.endsWith('.vercel.app')) return true;  // Correct pattern
  return false;
}
```

### T22.4: Deploy Web to Vercel
- [x] Environment variable set (NEXT_PUBLIC_API_URL)
- [x] Deploy to production configured
- [x] Vercel project linked (behind Vercel SSO)

### T22.5: Redeploy API with Vercel URL in CORS
- [x] CORS includes Vercel URL pattern
- [x] API redeployed with new CORS
- [x] Cross-origin requests work

### T22.6: Seed Production Users
- [x] Seed script executed with production DATABASE_URL
- [x] Users created successfully
- [x] GTM Collective pack present (confirms seeding)

### T22.7: Smoke Test Full Journey
- [x] API health endpoint responds: 200 OK
- [x] Skills endpoint responds: `{"skills":[],"pagination":{"total":0}}`
- [x] Packs endpoint responds: GTM Collective pack returned

## Critical Bug Fixed

**Issue**: `/v1/packs` was returning 500 Internal Server Error

**Root Cause**: `analyticsRouter` was mounted at root `/` with `use('*', requireAuth())` which intercepted ALL routes, including public routes like `/packs`.

**Fix** (commit `e4ac1d2`):
```typescript
// BEFORE (broke all public routes):
analyticsRouter.use('*', requireAuth());

// AFTER (correct scoping):
analyticsRouter.use('/users/*', requireAuth());
analyticsRouter.use('/creator/*', requireAuth());
```

This was an excellent catch and fix. The middleware scoping is now correct.

## Production Configuration Review

**fly.toml Configuration**:
- Correct app name: `loa-constructs-api`
- Health checks properly configured at `/v1/health`
- Rolling deployment strategy
- Minimum 1 machine running
- Auto-stop/start enabled for cost efficiency

**CORS Configuration**:
- Production origins: `constructs.network`, `www.constructs.network`
- Vercel preview pattern: `*.vercel.app`
- Non-production: allows all origins

## Verdict

All good. The soft launch deployment is complete and functional. The critical middleware bug was identified and fixed correctly. The API is healthy, endpoints respond correctly, and the CORS configuration supports both production and preview deployments.

---

**Decision**: APPROVED - Ready for security audit
