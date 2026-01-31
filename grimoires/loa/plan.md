# Plan: Fix OpenAPI Schema Issues + Review PR #48

## Context

The graduation feature OpenAPI additions have two schema/response mismatches that will break client validation or generated SDKs.

## Issues to Fix

### Issue 1: GraduationCriteria `current`/`required` type mismatch [P1]

**Problem**: The `GraduationCriteria.missing` items define `current` and `required` as `type: 'number'`, but for criteria like `readme_exists`, `changelog_exists`, and `manifest_valid`, these are boolean values.

**Location**: `apps/api/src/docs/openapi.ts:1673-1679`

**Fix**: Change the type to allow both number and boolean using `oneOf`:
```typescript
current: { oneOf: [{ type: 'number' }, { type: 'boolean' }], nullable: true },
required: { oneOf: [{ type: 'number' }, { type: 'boolean' }] },
```

### Issue 2: Withdraw graduation response schema mismatch [P2]

**Problem**: The `DELETE /v1/constructs/{slug}/graduation-request` handler returns:
```json
{
  "data": { "request_id": "...", "status": "withdrawn" },
  "message": "...",
  "request_id": "..."
}
```
But OpenAPI spec advertises `MessageResponse` with only `{ message: "..." }`.

**Location**: `apps/api/src/docs/openapi.ts:924-929`

**Fix**: Create a proper `WithdrawGraduationResponse` schema and use it.

## PR #48 Review

**Title**: feat(auth): add /v1/auth/validate endpoint for API key validation

**Changes**: Adds a simple validation endpoint that returns user info when authenticated.

**Assessment**: This is a clean, minimal addition. No issues found.

## Implementation Order

1. Fix Issue 1 (GraduationCriteria type)
2. Fix Issue 2 (WithdrawGraduationResponse schema)
3. Review and approve PR #48

## Files to Modify

- `apps/api/src/docs/openapi.ts`
