# Sprint Plan: Intelligent Construct Discovery

**Version**: 1.0.0
**Date**: 2026-01-31
**Author**: Sprint Planner Agent
**Status**: Ready for Implementation
**Cycle**: cycle-007
**Issue**: [#51](https://github.com/0xHoneyJar/loa-constructs/issues/51)
**PRD Reference**: grimoires/loa/prd.md v1.0.0
**SDD Reference**: grimoires/loa/sdd.md v1.0.0

---

## Sprint Overview

### Project Summary

Enhance construct discovery in the Loa Constructs registry through multi-field search with relevance scoring and a proactive `finding-constructs` agent skill. Users will be able to discover relevant constructs more effectively through improved search quality and contextual suggestions.

### Business Value

| Metric | Impact |
|--------|--------|
| **Discovery Quality** | Top-3 results contain relevant match 80%+ of time |
| **User Experience** | Find constructs without exact keyword matching |
| **Agent Integration** | Proactive suggestions at the right moment |
| **Adoption** | Lower friction to discover and install constructs |

### Sprint Configuration

| Parameter | Value |
|-----------|-------|
| **Sprint Count** | 3 (Sprints 19-21) |
| **Total Effort** | ~12-16 hours |
| **Team Size** | 1 engineer |
| **Risk Level** | Low |

### Success Criteria

- [ ] `search_keywords` and `search_use_cases` columns added to skills/packs
- [ ] GIN indexes created for array search performance
- [ ] Multi-field search matches across name, description, keywords, use_cases
- [ ] Relevance scoring algorithm implemented
- [ ] `relevance_score` and `match_reasons` returned when `?q=` present
- [ ] Results sorted by relevance when searching
- [ ] finding-constructs skill triggers on intent patterns
- [ ] Skill presents top 3 results with install commands
- [ ] OpenAPI documentation updated
- [ ] All existing functionality preserved (backward compatible)

---

## Sprint 19: Database & Schema

**Goal**: Add search metadata columns and indexes to enable multi-field search

**Duration**: 1 sprint (~3-4 hours)

### Tasks

#### T19.1: Add search_keywords column to skills table

**Description**: Add `search_keywords TEXT[]` column to the skills table for storing searchable keyword arrays.

**Acceptance Criteria**:
- [ ] Column added with `DEFAULT '{}'`
- [ ] Drizzle schema updated in `apps/api/src/db/schema.ts`
- [ ] Migration generated and applied
- [ ] Existing skills have empty array (backward compatible)

**Effort**: S (30 min)
**Dependencies**: None

---

#### T19.2: Add search_use_cases column to skills table

**Description**: Add `search_use_cases TEXT[]` column to the skills table for storing use case descriptions.

**Acceptance Criteria**:
- [ ] Column added with `DEFAULT '{}'`
- [ ] Schema updated alongside T19.1
- [ ] Existing skills have empty array

**Effort**: S (15 min)
**Dependencies**: T19.1 (same migration)

---

#### T19.3: Add search_keywords column to packs table

**Description**: Add `search_keywords TEXT[]` column to the packs table.

**Acceptance Criteria**:
- [ ] Column added with `DEFAULT '{}'`
- [ ] Schema updated in same file
- [ ] Migration covers both tables

**Effort**: S (15 min)
**Dependencies**: T19.1 (same migration)

---

#### T19.4: Add search_use_cases column to packs table

**Description**: Add `search_use_cases TEXT[]` column to the packs table.

**Acceptance Criteria**:
- [ ] Column added with `DEFAULT '{}'`
- [ ] Schema complete for both tables

**Effort**: S (15 min)
**Dependencies**: T19.3 (same migration)

---

#### T19.5: Create GIN indexes for search columns

**Description**: Create GIN indexes on all search columns for efficient array containment queries.

**Acceptance Criteria**:
- [ ] `idx_skills_search_keywords` GIN index created
- [ ] `idx_skills_search_use_cases` GIN index created
- [ ] `idx_packs_search_keywords` GIN index created
- [ ] `idx_packs_search_use_cases` GIN index created
- [ ] Indexes defined in Drizzle schema

**Effort**: S (30 min)
**Dependencies**: T19.1-T19.4

---

#### T19.6: Generate and verify migration

**Description**: Generate Drizzle migration and verify it applies cleanly.

**Acceptance Criteria**:
- [ ] `npx drizzle-kit generate` creates migration
- [ ] Migration file reviewed for correctness
- [ ] TypeScript types updated
- [ ] Local database migration succeeds

**Effort**: S (30 min)
**Dependencies**: T19.5

---

### Sprint 19 Deliverables

| Deliverable | Location |
|-------------|----------|
| Schema changes | `apps/api/src/db/schema.ts` |
| Migration | `apps/api/drizzle/migrations/` |

---

## Sprint 20: Search Service Enhancement

**Goal**: Implement multi-field search with relevance scoring

**Duration**: 1 sprint (~5-6 hours)

### Tasks

#### T20.1: Implement calculateRelevanceScore function

**Description**: Create a function that calculates relevance score based on match weights.

**Acceptance Criteria**:
- [ ] Function accepts construct data and query terms
- [ ] Weights applied: name(1.0/0.8), keywords(0.9), use_cases(0.7), description(0.6)
- [ ] Popularity boost via log-scale downloads (0.3)
- [ ] Maturity boost: stable(0.2), beta(0.15), experimental(0.05)
- [ ] Rating boost when present (0.2)
- [ ] Returns `{ score: number, matchReasons: string[] }`
- [ ] Score capped at 2.0

**Effort**: M (1.5 hours)
**Dependencies**: None

---

#### T20.2: Implement multi-field SQL query builder

**Description**: Extend query conditions to match across all searchable fields.

**Acceptance Criteria**:
- [ ] Query terms extracted from `?q=` parameter
- [ ] ILIKE on name and description (existing)
- [ ] Array overlap (`&&`) on search_keywords
- [ ] Array overlap (`&&`) on search_use_cases
- [ ] OR combination of all conditions
- [ ] Terms properly escaped for SQL injection

**Effort**: M (1 hour)
**Dependencies**: Sprint 19 complete

---

#### T20.3: Update fetchSkillsAsConstructs to include new columns

**Description**: Modify the skills fetch function to select and return search columns.

**Acceptance Criteria**:
- [ ] `search_keywords` selected from skills table
- [ ] `search_use_cases` selected from skills table
- [ ] Columns mapped to Construct interface
- [ ] Empty arrays handled gracefully

**Effort**: S (30 min)
**Dependencies**: T20.2

---

#### T20.4: Update fetchPacksAsConstructs to include new columns

**Description**: Modify the packs fetch function to select and return search columns.

**Acceptance Criteria**:
- [ ] `search_keywords` selected from packs table
- [ ] `search_use_cases` selected from packs table
- [ ] Consistent with skills implementation

**Effort**: S (30 min)
**Dependencies**: T20.3

---

#### T20.5: Sort by relevance when query present

**Description**: When `?q=` parameter is provided, sort results by relevance score.

**Acceptance Criteria**:
- [ ] When `query` present: sort by `relevance_score DESC, downloads DESC`
- [ ] When `query` absent: sort by `downloads DESC` (existing behavior)
- [ ] Application-layer sort after scoring

**Effort**: S (30 min)
**Dependencies**: T20.1, T20.4

---

#### T20.6: Add relevance_score and match_reasons to response

**Description**: Include relevance data in API response when searching.

**Acceptance Criteria**:
- [ ] `relevance_score` field added to construct in response
- [ ] `match_reasons` array added to construct in response
- [ ] Only present when `?q=` parameter provided
- [ ] Null/undefined when not searching (backward compatible)

**Effort**: S (30 min)
**Dependencies**: T20.5

---

#### T20.7: Update OpenAPI spec with new fields

**Description**: Document the new response fields in OpenAPI specification.

**Acceptance Criteria**:
- [ ] `search_keywords` documented on Construct schema
- [ ] `search_use_cases` documented on Construct schema
- [ ] `relevance_score` documented (nullable)
- [ ] `match_reasons` documented (nullable array)
- [ ] Description explains when fields are present

**Effort**: S (30 min)
**Dependencies**: T20.6

---

#### T20.8: Unit tests for scoring algorithm

**Description**: Write unit tests for the relevance scoring function.

**Acceptance Criteria**:
- [ ] Test exact name match scores highest
- [ ] Test keyword match boosts score
- [ ] Test use case match boosts score
- [ ] Test description-only match scores lower
- [ ] Test popularity boost (log scale)
- [ ] Test maturity boost (stable > beta > experimental)
- [ ] Test multi-term queries
- [ ] Test empty/missing fields handled

**Effort**: M (1 hour)
**Dependencies**: T20.1

---

#### T20.9: Integration tests for search

**Description**: Write integration tests for the enhanced search endpoint.

**Acceptance Criteria**:
- [ ] Test search returns relevance_score when q present
- [ ] Test results sorted by relevance
- [ ] Test keyword match ranks higher than description-only
- [ ] Test no relevance_score when q absent
- [ ] Test empty query returns all (existing behavior)

**Effort**: M (1 hour)
**Dependencies**: T20.6

---

### Sprint 20 Deliverables

| Deliverable | Location |
|-------------|----------|
| Scoring function | `apps/api/src/services/constructs.ts` |
| Search enhancement | `apps/api/src/services/constructs.ts` |
| Response update | `apps/api/src/routes/constructs.ts` |
| OpenAPI update | `apps/api/src/docs/openapi.ts` |
| Unit tests | `apps/api/src/services/constructs.test.ts` |
| Integration tests | `apps/api/tests/e2e/constructs.test.ts` |

---

## Sprint 21: finding-constructs Skill

**Goal**: Create agent skill for proactive construct discovery

**Duration**: 1 sprint (~4-5 hours)

### Tasks

#### T21.1: Create skill directory structure

**Description**: Set up the finding-constructs skill directory with required files.

**Acceptance Criteria**:
- [ ] Directory created at `.claude/skills/finding-constructs/`
- [ ] `index.yaml` file created
- [ ] `SKILL.md` file created
- [ ] `resources/` directory created
- [ ] `resources/triggers.md` file created

**Effort**: S (15 min)
**Dependencies**: None

---

#### T21.2: Write index.yaml with triggers

**Description**: Define skill metadata and trigger patterns in index.yaml.

**Acceptance Criteria**:
- [ ] Name, version, description defined
- [ ] Trigger patterns: "find a skill for", "find a construct for"
- [ ] Trigger patterns: "is there a construct that", "I need help with"
- [ ] Trigger patterns: "how do I do"
- [ ] Domain hints: security, testing, deployment, documentation
- [ ] Allowed tools: WebFetch, Read

**Effort**: S (30 min)
**Dependencies**: T21.1

---

#### T21.3: Write SKILL.md workflow

**Description**: Implement the discovery workflow logic in SKILL.md.

**Acceptance Criteria**:
- [ ] Step 1: Extract keywords from user intent
- [ ] Step 2: Query API `GET /v1/constructs?q=keywords&limit=5`
- [ ] Step 3: Filter results with relevance_score >= 0.5
- [ ] Step 4: Present top 3 with name, description, relevance %, install command
- [ ] Step 5: Offer choice between install or direct assistance
- [ ] Response format is clear and actionable

**Effort**: M (1.5 hours)
**Dependencies**: T21.2, Sprint 20 complete

---

#### T21.4: Add fallback behavior

**Description**: Implement graceful fallback when no relevant constructs found.

**Acceptance Criteria**:
- [ ] If no results or all below 0.5 threshold
- [ ] Offer direct assistance with the extracted task
- [ ] Mention user can create their own skill with `skills init`
- [ ] Tone is helpful, not apologetic

**Effort**: S (30 min)
**Dependencies**: T21.3

---

#### T21.5: Write resources/triggers.md documentation

**Description**: Document the trigger patterns and opt-out mechanism.

**Acceptance Criteria**:
- [ ] List all trigger patterns with examples
- [ ] Explain domain hints and when they activate
- [ ] Document opt-out via settings.json
- [ ] Include example user messages that trigger the skill

**Effort**: S (30 min)
**Dependencies**: T21.2

---

#### T21.6: Test skill trigger patterns

**Description**: Manually test that the skill triggers correctly.

**Acceptance Criteria**:
- [ ] "find a skill for X" triggers skill
- [ ] "is there a construct that..." triggers skill
- [ ] "I need help with deployment" triggers skill
- [ ] Regular questions don't trigger skill
- [ ] Skill presents results correctly

**Effort**: M (1 hour)
**Dependencies**: T21.4

---

#### T21.7: Document opt-out mechanism

**Description**: Add documentation for disabling the skill.

**Acceptance Criteria**:
- [ ] Settings.json snippet in SKILL.md
- [ ] Explain when user might want to opt out
- [ ] Note that opt-out is per-project

**Effort**: S (15 min)
**Dependencies**: T21.5

---

### Sprint 21 Deliverables

| Deliverable | Location |
|-------------|----------|
| Skill index | `.claude/skills/finding-constructs/index.yaml` |
| Skill workflow | `.claude/skills/finding-constructs/SKILL.md` |
| Trigger docs | `.claude/skills/finding-constructs/resources/triggers.md` |

---

## Appendix A: Task Summary

| Sprint | Task | Effort | Dependencies |
|--------|------|--------|--------------|
| 19 | T19.1: search_keywords to skills | S | - |
| 19 | T19.2: search_use_cases to skills | S | T19.1 |
| 19 | T19.3: search_keywords to packs | S | T19.1 |
| 19 | T19.4: search_use_cases to packs | S | T19.3 |
| 19 | T19.5: GIN indexes | S | T19.1-T19.4 |
| 19 | T19.6: Generate migration | S | T19.5 |
| 20 | T20.1: calculateRelevanceScore | M | - |
| 20 | T20.2: Multi-field SQL builder | M | Sprint 19 |
| 20 | T20.3: fetchSkillsAsConstructs update | S | T20.2 |
| 20 | T20.4: fetchPacksAsConstructs update | S | T20.3 |
| 20 | T20.5: Sort by relevance | S | T20.1, T20.4 |
| 20 | T20.6: Response enhancement | S | T20.5 |
| 20 | T20.7: OpenAPI update | S | T20.6 |
| 20 | T20.8: Unit tests | M | T20.1 |
| 20 | T20.9: Integration tests | M | T20.6 |
| 21 | T21.1: Skill directory | S | - |
| 21 | T21.2: index.yaml | S | T21.1 |
| 21 | T21.3: SKILL.md workflow | M | T21.2, Sprint 20 |
| 21 | T21.4: Fallback behavior | S | T21.3 |
| 21 | T21.5: triggers.md docs | S | T21.2 |
| 21 | T21.6: Test triggers | M | T21.4 |
| 21 | T21.7: Opt-out docs | S | T21.5 |

**Effort Key**: S = Small (< 30 min), M = Medium (30 min - 2 hours), L = Large (> 2 hours)

---

## Appendix B: Goal Traceability

| Goal | Tasks |
|------|-------|
| G-1 (Discoverable at right moment) | T21.1-T21.7 |
| G-2 (Quality search results 80%+) | T20.1-T20.6, T20.8-T20.9 |
| G-3 (Non-intrusive <5% rejection) | T21.2, T21.4, T21.7 |
| G-4 (API-first discovery) | T19.1-T19.6, T20.7 |

---

## Appendix C: E2E Validation Task

**Final Sprint (21) includes E2E goal validation:**

- [ ] G-1: finding-constructs skill triggers on patterns, surfaces relevant construct
- [ ] G-2: Search query returns top-3 with relevance_score, matches expected construct
- [ ] G-3: Skill fallback tested, opt-out mechanism documented
- [ ] G-4: API returns search metadata, OpenAPI documented

---

**Document Status**: Ready for Implementation
**Next Step**: `/implement sprint-19` (or `/run sprint-19` for autonomous execution)
