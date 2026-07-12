---
name: "source-command-ride"
description: "Analyze an existing codebase and generate Loa grimoire artifacts.
Extracts code truth, validates against existing docs and user context,
performs three-way drift analysis, and creates evidence-grounded PRD/SDD.
\"The Loa rides through the code, channeling truth into the grimoire.\""
---

# source-command-ride

Use this skill when the user asks to run the migrated source command `ride`.

## Command Template

# /ride - Analyze Codebase and Generate Grimoire

> *"The Loa rides through the code, channeling truth into the grimoire."*

## Purpose

Analyze an existing codebase to generate evidence-grounded documentation. Extracts actual code behavior, compares against existing docs and user context, identifies drift, and creates Loa-standard artifacts.

## Invocation

```
/ride
/ride --target ../other-repo
/ride --phase extraction
/ride --reconstruct-changelog
/ride --interactive
/ride --ground-truth
/ride --ground-truth --non-interactive
```

## Agent

Launches `riding-codebase` from `skills/riding-codebase/`.

See: `skills/riding-codebase/SKILL.md` for full workflow details.

## Cardinal Rule: CODE IS TRUTH

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMMUTABLE TRUTH HIERARCHY                    │
├─────────────────────────────────────────────────────────────────┤
│   1. CODE               ← Absolute source of truth              │
│   2. Loa Artifacts      ← Derived FROM code evidence            │
│   3. Legacy Docs        ← Claims to verify against code         │
│   4. User Context       ← Hypotheses to test against code       │
│                                                                 │
│   NOTHING overrides code. Not context. Not docs. Not claims.   │
└─────────────────────────────────────────────────────────────────┘
```

## Phases

| Phase | Name | Output |
|-------|------|--------|
| 0 | Preflight & Integrity Check | Mount + checksum verification |
| 1 | Interactive Context Discovery | `context/claims-to-verify.md` |
| 2 | Code Reality Extraction | `reality/` |
| 2b | Code Hygiene Audit | `reality/hygiene-report.md` |
| 3 | Legacy Doc Inventory | `legacy/` |
| 4 | Drift Analysis (Three-Way) | `drift-report.md` |
| 5 | Consistency Analysis | `consistency-report.md` |
| 6 | Loa Artifact Generation | `prd.md`, `sdd.md` |
| 7 | Governance Audit | `governance-report.md` |
| 8 | Legacy Deprecation | Deprecation notices |
| 9 | Trajectory Self-Audit | `trajectory-audit.md` |
| 10 | Maintenance Handoff | Drift detection installed |
| 11 | Ground Truth Generation | `ground-truth/` (--ground-truth only) |

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `--target <path>` | Target repo path (if in framework repo) | No |
| `--phase <name>` | Run single phase | No |
| `--dry-run` | Preview without writing | No |
| `--skip-deprecation` | Don't modify legacy docs | No |
| `--reconstruct-changelog` | Generate CHANGELOG from git | No |
| `--interactive` | Force interactive context discovery | No |
| `--force-restore` | Reset System Zone if integrity fails | No |
| `--ground-truth` | Generate Grounded Truth output (Phase 11) | No |
| `--non-interactive` | Skip interactive phases (1, 3, 8) — for bridge loop | No |

## Zone Compliance

All outputs go to **State Zone** in the **target repo**:

```
{target-repo}/
  └── grimoires/loa/           ← All /ride outputs here
      ├── context/            ← User-provided context
      ├── reality/            ← Code extraction results
      ├── legacy/             ← Legacy doc inventory
      ├── prd.md              ← Generated PRD
      ├── sdd.md              ← Generated SDD
      ├── drift-report.md     ← Three-way drift analysis
      ├── consistency-report.md
      ├── governance-report.md
      └── NOTES.md            ← Structured memory
```

## Workflow Summary

### Phase 0: Preflight
- Verify Loa is mounted (`.loa-version.json` exists)
- Check System Zone integrity via checksums
- Detect execution context (framework repo vs project repo)
- Initialize trajectory logging

### Phase 1: Context Discovery
- Prompt user for context file upload
- Analyze existing `grimoires/loa/context/` files
- Conduct gap-focused interview via `AskUserQuestion`
- Generate `claims-to-verify.md`

### Phase 2: Code Extraction
- Directory structure analysis
- Entry points and routes discovery
- Data models and entities extraction
- Environment dependencies detection
- Tech debt markers collection
- Test coverage detection

### Phase 2b: Hygiene Audit
- Files outside standard directories
- Temporary/WIP folders detection
- Commented-out code blocks
- Dependency conflicts
- **Flag for human decision, don't assume fixes**

### Phase 3: Legacy Inventory
- Find all documentation files
- Assess AI guidance quality (AGENTS.md)
- Categorize by type and extract claims

### Phase 4: Drift Analysis
- Three-way comparison: Code vs Docs vs Context
- Identify Ghosts (documented but missing)
- Identify Shadows (exists but undocumented)
- Identify Conflicts (code disagrees with claims)

### Phase 5: Consistency Analysis
- Detect naming patterns
- Analyze code organization
- Score consistency
- Flag improvement opportunities

### Phase 6: Artifact Generation
- Generate evidence-grounded PRD
- Generate evidence-grounded SDD
- All claims cite `file:line` evidence

### Phase 7: Governance Audit
- Check for CHANGELOG.md
- Check for CONTRIBUTING.md
- Check for SECURITY.md
- Check for CODEOWNERS
- Verify semver tags

### Phase 8: Legacy Deprecation
- Add deprecation notices to legacy docs
- Update README with Loa docs section

### Phase 9: Trajectory Self-Audit
- Scan generated artifacts for ungrounded claims
- Flag assumptions without evidence
- Generate audit summary

### Phase 10: Handoff
- Install drift detection
- Update NOTES.md with ride summary
- Create handoff tasks

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| "Loa not mounted" | No `.loa-version.json` | Run `/mount` first |
| "System Zone missing" | No `.Codex/` | Run `/mount` first |
| "System Zone integrity violation" | Files modified | Use `--force-restore` or move changes to overrides |
| "Target is not a git repository" | Invalid target path | Verify target path |

### Phase 11: Ground Truth Generation (--ground-truth only)
- Read reality/ extraction results
- Synthesize into token-efficient hub-and-spoke GT files
- Generate checksums.json for all referenced source files
- Validate token budgets (index < 500, sections < 2000 each)
- When `--non-interactive`: phases 1, 3, 8 are skipped

## Post-Ride

After `/ride` completes:

1. Review `drift-report.md` for critical issues
2. Address items in `governance-report.md`
3. Schedule stakeholder review of `prd.md` and `sdd.md`
4. Resolve high-priority drift via `/implement`
5. Communicate Loa docs are now source of truth

## When to Re-Ride

- After major refactoring
- Before significant new development
- When drift detection flags issues
- After onboarding new team members (to regenerate context)

## Session Continuity Integration (v0.9.0)

The `/ride` command is session-aware and integrates with the Lossless Ledger Protocol.

### Session Start Actions

When `/ride` initializes:

```
SESSION START SEQUENCE:
1. br ready                     # Identify if there's an active riding task
2. br show <active_id>          # Load prior decisions[], handoffs[] if resuming
3. Tiered Ledger Recovery       # Load NOTES.md Session Continuity section
4. Verify lightweight identifiers # Don't load full content yet
5. Resume from "Reasoning State" # Continue where left off if applicable
```

**Protocol**: See `.Codex/protocols/session-continuity.md`

### During Session Actions

Throughout the `/ride` execution:

```
CONTINUOUS SYNTHESIS:
1. Write discoveries to NOTES.md immediately
2. Log drift findings to trajectory as discovered
3. Store code identifiers (paths + lines only)
4. Monitor attention budget (advisory, not blocking)
5. Trigger Delta-Synthesis at Yellow threshold (5k tokens)
```

**Delta-Synthesis** persists work-in-progress to ledgers, ensuring survival across unexpected termination.

### On Complete Actions

When `/ride` completes:

```
SYNTHESIS CHECKPOINT:
1. Run grounding verification (>= 0.95 ratio)
2. Verify negative grounding (Ghost Features)
3. Update Decision Log with evidence citations
4. Log session handoff to trajectory
5. Decay code blocks to lightweight identifiers
6. Verify EDD (3 test scenarios documented per major finding)
```

**Protocol**: See `.Codex/protocols/synthesis-checkpoint.md`

### Session Recovery

If `/ride` was interrupted:

1. New session starts with Level 1 recovery (~100 tokens)
2. `br ready` shows in-progress riding tasks
3. Session Continuity section has last checkpoint
4. Resume from last known state
5. Some extraction work may need re-execution

## Next Step

After riding: Review `drift-report.md` and address critical issues, then `/sprint-plan` to plan implementation work
