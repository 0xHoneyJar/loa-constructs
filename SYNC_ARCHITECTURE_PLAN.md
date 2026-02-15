# Constructs Network Sync Architecture Plan

**Status**: Planning Phase (No Execution)
**Author**: Constructs Sync Research Team
**Date**: 2026-02-15
**Full Research**: [loa/grimoires/loa/context/constructs-sync-architecture.md](https://github.com/0xHoneyJar/loa/blob/main/grimoires/loa/context/constructs-sync-architecture.md)

## Executive Summary

This plan addresses critical gaps in the Constructs Network's installation, update, and contribution workflows discovered through deep architectural research. Before making loa-constructs public and enabling private/paid construct distribution, we must establish robust local modification handling, issue routing, and upstream contribution flows.

**Key Finding**: Current implementation has **blind overwrite** behavior with **zero drift detection**, creating risk of silent data loss and blocking organic community contribution.

**Recommendation**: Implement patch-package-style local modification tracking with content-addressable hashing before public launch.

## Research Overview

Four parallel research agents analyzed the current architecture:

1. **install-researcher**: Installation flow analysis
   - Symlinks from `.claude/skills/` → `.claude/constructs/packs/<slug>/skills/`
   - Files are gitignored but writable (modification encouraged)
   - No drift detection mechanism exists

2. **update-researcher**: Update pipeline analysis
   - `check-updates` only reports, never applies
   - Re-install uses `open(full_path, 'wb')` with **blind overwrite**
   - Zero conflict detection or user confirmation

3. **routing-researcher**: Issue tracking and metadata analysis
   - 7 critical gaps identified
   - Schema-doc mismatch: `repository`/`bugs` fields documented but schema rejects
   - No `/contribute-pack` command for upstream contribution
   - License ambiguity (pack MIT vs repo AGPL)

4. **patterns-researcher**: Industry best practices
   - npm's `patch-package` is gold standard for local modifications
   - Docker's content-addressable hashing for integrity verification
   - 3-state tracking: PRISTINE → MODIFIED → OUTDATED → CONFLICT

## Critical Gaps Identified

| # | Gap | Impact | Priority |
|---|-----|--------|----------|
| 1 | **No local modification detection** | Silent data loss on re-install | CRITICAL |
| 2 | **Blind overwrite on install** | User changes destroyed without warning | CRITICAL |
| 3 | **No issue routing metadata** | Bug reports go to wrong repo | HIGH |
| 4 | **No upstream contribution flow** | Community contributions blocked | HIGH |
| 5 | **Schema-doc mismatch** | `additionalProperties: false` rejects valid fields | MEDIUM |
| 6 | **No content integrity verification** | Modified/corrupted skills undetected | MEDIUM |
| 7 | **License ambiguity** | Pack MIT vs repo AGPL unclear | LOW |

## Proposed Solutions

### 1. Local Modification Handling (Phases A-B)

**Model**: npm's `patch-package` approach

```bash
.claude/constructs/
├── .patches/
│   └── observer-midi/
│       ├── observe-network.skill.sh.patch
│       └── integrity.json
└── .constructs-meta.json  # Global state tracking
```

**Integrity Schema**:
```json
{
  "observer-midi": {
    "version": "1.2.0",
    "installed_at": "2026-02-15T10:30:00Z",
    "files": {
      "skills/observe-network.skill.sh": {
        "pristine_sha256": "abc123...",
        "current_sha256": "def456...",
        "state": "MODIFIED",
        "patch_file": ".patches/observer-midi/observe-network.skill.sh.patch"
      }
    }
  }
}
```

**States**:
- `PRISTINE`: File matches registry SHA256
- `MODIFIED`: Local changes detected, patch exists
- `OUTDATED`: Registry has new version available
- `CONFLICT`: Both local mods AND upstream changes

### 2. Issue Routing (Phase C)

**Schema Enhancement** (`pack-manifest.schema.json`):
```json
{
  "repository": {
    "type": "object",
    "properties": {
      "type": { "enum": ["git"] },
      "url": { "type": "string" }
    }
  },
  "bugs": {
    "type": "object",
    "properties": {
      "url": { "type": "string" },
      "email": { "type": "string", "format": "email" }
    }
  },
  "homepage": { "type": "string", "format": "uri" }
}
```

**UX Impact**:
```bash
$ construct-bug observer-midi "observe-network fails on IPv6"
→ Creates issue at https://github.com/0xHoneyJar/midi-interface/issues
  (extracted from manifest.repository.url)
```

### 3. Upstream Contribution Flow (Phase D)

**New Command**: `/contribute-pack <slug> [description]`

**Workflow**:
1. **Validation**: Check for local modifications
2. **Fork Detection**: Auto-fork if user lacks write access
3. **Branch**: `contrib/<slug>-<timestamp>`
4. **Patch Export**: Extract `.patch` files from local changes
5. **PR Creation**: Auto-populate with construct context
6. **Review Loop**: Maintainer approval → registry update

**Script**: `.claude/scripts/constructs/contribute-pack.sh`

### 4. Private/Public Interaction (Phase E)

**Visibility Enum** (already designed in migration research):
```sql
CREATE TYPE construct_visibility AS ENUM ('public', 'private', 'unlisted');

CREATE TABLE construct_access_grants (
  construct_id UUID REFERENCES constructs(id),
  github_username TEXT,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES users(id)
);
```

**Access Control**:
- `public`: Anyone can install
- `private`: Requires `construct_access_grants` entry
- `unlisted`: Public but not in search/browse

### 5. MiDi Observer Hybrid Model Decision

**Context**: MiDi Observer (23 skills) vs Canonical Observer (6 skills) have **ZERO name overlap**.

**Decision**: **Hybrid Model with Optional Dependency**

```yaml
# observer-midi/pack-manifest.yaml
dependencies:
  packs:
    - slug: observer
      version: ">=1.0.0"
      required: false  # ← Optional dependency
      interop: events   # Interop at event/state level, not file level
```

**Rationale**:
- No file conflicts (zero skill name overlap)
- Allows standalone operation OR alongside canonical
- Event/state interop at runtime (not file-level)
- Clear provenance: "observer-midi is an extended Observer implementation"
- Avoids fork confusion while maintaining independence

**Migration Path**: MiDi Observer can be packaged immediately with no construct name conflicts.

## Implementation Phases

### Phase A: Content Hashing & State Tracking (2-3 days)
**Scripts**: `constructs-install.sh`, `constructs-loader.sh`
- Add SHA256 hashing to install flow (post-extraction)
- Create `.constructs-meta.json` state file
- Track PRISTINE/MODIFIED/OUTDATED states
- **Blocker**: None (foundational)

### Phase B: Patch Management (2-3 days)
**Scripts**: `constructs-install.sh`, new `constructs-diff.sh`
- Create `.patches/<slug>/` directory structure
- Generate `.patch` files on modification detection
- Apply patches on install if present
- Conflict detection (both local + upstream changes)
- **Blocker**: Requires Phase A

### Phase C: Issue Routing Metadata (1-2 days)
**Files**: `pack-manifest.schema.json`, `pack-manifest.md`, templates
- Add `repository`/`bugs`/`homepage` to schema
- Update docs and examples
- Create `construct-bug` helper command
- **Blocker**: None (parallel with A/B)

### Phase D: Upstream Contribution Flow (2-3 days)
**New Script**: `.claude/scripts/constructs/contribute-pack.sh`
- Implement `/contribute-pack` command
- Fork detection and auto-fork
- Patch extraction from `.constructs-meta.json`
- PR template with construct context
- **Blocker**: Requires Phase B (patch files)

### Phase E: Private Construct Access Control (1-2 days)
**Files**: Schema migration, API routes, UI components
- Already designed in migration research
- Visibility enum + access grants table
- JWT-based construct access validation
- UI for private construct management
- **Blocker**: None (parallel with other phases)

**Total Timeline**: 8-13 days (with parallelization)

**Parallelization**:
- Phases A+C+E can run in parallel (no dependencies)
- Phase B depends on A
- Phase D depends on B

## Security Considerations

### Pre-Launch Blockers (from Security Audit)

**BLOCKERS** (Must resolve before public launch):
1. **Credential Rotation** (`.env` files)
   - `loa-constructs/backend/.env` contains JWT secret
   - `loa-constructs/frontend/.env` contains Stripe test key
   - **Action**: Rotate secrets, add to `.env.example`, document in README

2. **Secrets Management** (no vault detected)
   - **Action**: Implement secrets management (AWS Secrets Manager, Vault, or similar)

**WARNINGS** (Recommended but not blocking):
3. No rate limiting on `/api/constructs/install`
4. CORS set to `*` in development
5. No audit logging for construct installations

### Additional Security Measures

**Content Integrity**:
- SHA256 hashing prevents tampered constructs
- Signature verification (future: GPG-signed manifests)

**License Clarity**:
- Pack-level MIT licensing (in manifest)
- Repo-level AGPL (platform code)
- Document in `LICENSE.md` and pack template

**Access Control**:
- JWT-based authentication for private constructs
- GitHub OAuth for identity verification
- Row-level security in database

## Migration Impact Analysis

### User-Facing Changes

**Breaking Changes**: NONE (all additive)

**New Commands**:
- `/contribute-pack <slug>` - Submit local modifications upstream
- `construct-bug <slug>` - Report issue to correct repository

**New Files**:
- `.claude/constructs/.constructs-meta.json` - State tracking
- `.claude/constructs/.patches/<slug>/` - Local modifications

**Modified Behavior**:
1. **Install**: Now prompts on overwrite if local mods detected
2. **Update**: Shows diff preview before applying updates
3. **Status**: New `constructs status` shows PRISTINE/MODIFIED/OUTDATED

### Backward Compatibility

**Version Detection**:
```bash
# In constructs-install.sh
if [[ ! -f ".claude/constructs/.constructs-meta.json" ]]; then
  # Legacy mode: No modification tracking
  warn "No .constructs-meta.json found. Run 'constructs upgrade' to enable tracking."
fi
```

**Migration Command**: `constructs upgrade`
- Scans all installed packs
- Generates SHA256 hashes for current files
- Creates `.constructs-meta.json`
- Non-destructive (marks all as PRISTINE initially)

## Decision Trees

### On Install

```
Install pack "observer-midi"
  ↓
Check .constructs-meta.json
  ↓
Pack already installed? → NO → Fresh install (mark PRISTINE)
  ↓ YES
  ↓
Check file states
  ↓
All PRISTINE? → YES → Overwrite with new version
  ↓ NO
  ↓
Has local MODIFIED files?
  ↓
Show diff preview
  ↓
User choice:
  - Keep local (mark OUTDATED, create patch)
  - Overwrite (lose local changes, mark PRISTINE)
  - Merge (attempt 3-way merge, may create CONFLICT)
```

### On Update Check

```
Check updates for "observer-midi"
  ↓
Fetch registry version
  ↓
Compare with .constructs-meta.json version
  ↓
Same version? → YES → No update available
  ↓ NO
  ↓
New version available
  ↓
Check local file states
  ↓
All PRISTINE? → YES → "Update available (safe to apply)"
  ↓ NO
  ↓
Has MODIFIED files? → "Update available (local changes detected, will prompt)"
```

### On Contribution

```
/contribute-pack observer-midi
  ↓
Check .constructs-meta.json
  ↓
Has MODIFIED files? → NO → Error: No local changes to contribute
  ↓ YES
  ↓
Extract patches from .patches/observer-midi/
  ↓
Check repository.url in manifest
  ↓
User has write access? → YES → Branch directly
  ↓ NO
  ↓
Auto-fork repository
  ↓
Create branch: contrib/observer-midi-<timestamp>
  ↓
Commit patches with provenance
  ↓
Create PR with template
  ↓
Link back to user's installation (optional telemetry)
```

## Next Steps

### Immediate (This PR)
1. **Review this plan** with @janitooor (expert architect)
2. **Align on approach** - confirm patch-package model
3. **Prioritize phases** - can we defer any to post-launch?
4. **Assign ownership** - who implements each phase?

### Pre-Launch (Must Complete)
1. **Security blockers** - rotate credentials, implement secrets management
2. **Phase A** - content hashing and state tracking (foundational)
3. **Phase B** - patch management (prevents data loss)
4. **Phase C** - issue routing (community health)

### Post-Launch (Can Defer)
5. **Phase D** - contribution flow (nice-to-have initially)
6. **Phase E** - private construct access (depends on business model timing)

### Integration Testing
- **Test Suite**: Create integration tests for all state transitions
- **Dogfooding**: Install/modify/update constructs in loa-constructs itself
- **User Testing**: Beta test with MiDi team before public launch

## Open Questions for Review

1. **Patch Format**: Use `diff -u` (standard) or custom format?
2. **Conflict Resolution**: Auto-merge, manual merge, or abort?
3. **Telemetry**: Track construct usage/modifications (opt-in)?
4. **Signing**: GPG-signed manifests for verified publishers?
5. **Pricing Model**: Ready for paid constructs or defer to Phase E?
6. **Registry CDN**: Content delivery for construct downloads at scale?

## References

- **Full Research**: [loa/grimoires/loa/context/constructs-sync-architecture.md](https://github.com/0xHoneyJar/loa/blob/main/grimoires/loa/context/constructs-sync-architecture.md) (794 lines)
- **Migration Plan**: loa-constructs constructs-public-migration team findings
- **Security Audit**: loa-constructs security-auditor findings
- **Product Strategy**: loa-constructs product-strategist recommendations
- **Pre-Launch Checklist**: `PRE_LAUNCH_CHECKLIST.md`

## Review Requested

**Primary Reviewer**: @janitooor
**Expertise Needed**: Architecture, FAANG-scale sync patterns, conflict resolution

**Questions for Reviewer**:
1. Is patch-package model appropriate for this use case?
2. Should we implement all phases before public launch, or can some defer?
3. Any concerns with MiDi Observer hybrid model approach?
4. Preferred conflict resolution strategy?
5. Should construct contribution require CLA/DCO?

---

**Note**: This is a **PLANNING DOCUMENT ONLY**. No implementation has occurred. This PR establishes the architectural approach for review and alignment before execution.
