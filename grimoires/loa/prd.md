# PRD: Intelligent Construct Discovery

**Cycle**: cycle-007
**Issue**: [#51](https://github.com/0xHoneyJar/loa-constructs/issues/51)
**Created**: 2026-01-31
**Status**: Draft

---

## 1. Problem Statement

Users cannot efficiently discover relevant constructs at the moment they need them.

**Current State**:
- Basic `ILIKE` search on name/description only
- No semantic understanding of user intent
- Discovery requires explicit `/constructs search` command
- No proactive suggestions when context suggests a construct would help

**Inspiration**: [skills.sh](https://skills.sh) by Vercel Labs demonstrates effective agent-native discovery with their `find-skills` meta-skill that proactively suggests tools based on conversation context.

> Source: Issue #51

---

## 2. Goals and Success Criteria

### 2.1 Goals

| ID | Goal | Priority |
|----|------|----------|
| **G-1** | Discoverable at the Right Moment | P1 |
| **G-2** | Quality Search Results (top-3 relevant 80%+) | P0 |
| **G-3** | Non-Intrusive Suggestions (<5% rejection) | P1 |
| **G-4** | API-First Discovery | P0 |

### 2.2 Success Criteria

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| Search relevance | Top-3 contains match | 80%+ |
| Search latency | p95 response time | <200ms |
| Keyword coverage | Constructs with keywords | 50%+ in 30 days |

---

## 3. User Context

### 3.1 Primary Persona: Agent User

**Profile**: Developer using Claude Code with Loa framework

**Goals**:
- Find relevant constructs without leaving conversation
- Get suggestions at the right moment
- Quick install after discovery

**Current Pain**:
- Must explicitly search with exact keywords
- No suggestions when describing a need
- Search quality poor for conceptual queries

### 3.2 Secondary Persona: CLI User

**Profile**: Developer browsing constructs via API/CLI

**Goals**:
- Search for constructs by domain
- Filter by category and keywords
- Discover related constructs

---

## 4. Functional Requirements

### 4.1 Enhanced Search API

Extend `GET /v1/constructs` with improved search:

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (existing, enhanced) |
| `category` | string | Filter by category (existing) |

**Search Enhancement**:
- Match on name, description, `search_keywords`, `search_use_cases`
- Return `relevance_score` in results
- Rank by: keyword match > download count > maturity > rating

### 4.2 Construct Metadata Schema

Add searchable metadata fields to skills/packs:

```yaml
# In manifest or database
search_keywords: ["user research", "interviews", "personas"]
search_use_cases:
  - "conducting user interviews"
  - "synthesizing research findings"
```

### 4.3 Search Ranking Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Name exact match | 1.0 | Full word match in name |
| Name partial | 0.8 | Prefix/suffix match |
| Description match | 0.6 | Keyword in description |
| Keywords match | 0.9 | Match in search_keywords |
| Use case match | 0.7 | Match in search_use_cases |
| Downloads | 0.3 | Popularity signal (log scale) |
| Maturity | 0.2 | stable > beta > experimental |
| Rating | 0.2 | Average rating if exists |

### 4.4 Tiered Discovery

| Tier | Trigger | Behavior |
|------|---------|----------|
| **Active** | Explicit `?q=` search | Full ranked results |
| **Suggestive** | `finding-constructs` skill | Top 3 with install |
| **Passive** | Future: agent context | Mention construct exists |

### 4.5 finding-constructs Skill

A meta-skill for proactive discovery:

**Trigger Patterns**:
- "how do I do X" about common tasks
- "find a skill for X"
- "is there a construct that..."
- "I need help with [domain]"

**Workflow**:
1. Extract keywords from user intent
2. Query `GET /v1/constructs?q=keywords&limit=5`
3. Present top 3 with descriptions
4. Offer install command or direct assistance

**Example**:
```
User: "I need to validate my user journeys"

Agent: I found a relevant construct:
  ⚗️ Crucible - Validation & testing pack
  Install: /constructs install crucible
  
  Or I can help you directly. Which would you prefer?
```

---

## 5. Technical Requirements

### 5.1 Database Changes

**Modify `skills` table**:
```sql
ALTER TABLE skills
ADD COLUMN search_keywords TEXT[] DEFAULT '{}',
ADD COLUMN search_use_cases TEXT[] DEFAULT '{}';

CREATE INDEX idx_skills_keywords ON skills USING GIN (search_keywords);
```

**Modify `packs` table**:
```sql
ALTER TABLE packs
ADD COLUMN search_keywords TEXT[] DEFAULT '{}',
ADD COLUMN search_use_cases TEXT[] DEFAULT '{}';

CREATE INDEX idx_packs_keywords ON packs USING GIN (search_keywords);
```

### 5.2 Search Service Enhancement

Update `apps/api/src/services/constructs.ts`:

1. **Multi-field search**: Match across name, description, keywords, use_cases
2. **Relevance scoring**: Calculate composite score per result
3. **Sort by relevance**: When `?q=` present, sort by score desc
4. **Return score**: Include `relevance_score` in response

### 5.3 API Response Enhancement

Add relevance to search results:

```json
{
  "data": [
    {
      "slug": "observer",
      "name": "Observer",
      "type": "pack",
      "description": "UX research and user validation",
      "relevance_score": 0.87,
      "match_reasons": ["name", "keywords"]
    }
  ],
  "pagination": { ... }
}
```

### 5.4 finding-constructs Skill Structure

```
.claude/skills/finding-constructs/
├── index.yaml          # Metadata + triggers
├── SKILL.md            # Discovery logic
└── resources/
    └── triggers.md     # Trigger pattern documentation
```

---

## 6. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Search latency | <200ms p95 |
| Cache freshness | <5min |
| Skill response | <2s total |

---

## 7. Scope Definition

### 7.1 In Scope (MVP)

- [ ] `search_keywords` and `search_use_cases` columns
- [ ] GIN indexes for array search
- [ ] Multi-field search in constructs service
- [ ] Relevance scoring algorithm
- [ ] `relevance_score` in API response
- [ ] finding-constructs skill (basic triggers)
- [ ] OpenAPI documentation updates

### 7.2 Out of Scope

- Semantic/embedding-based search
- Proactive agent suggestions (passive tier)
- CLI tool (`npx loa-constructs find`)
- Anonymous telemetry for popularity
- Full-text search with stemming
- Personalized recommendations

### 7.3 Future Considerations

1. **Semantic Search**: Use embeddings for conceptual matching
2. **Passive Discovery**: Agent monitors context for opportunities
3. **CLI Tool**: Standalone `npx loa-constructs find` command
4. **Auto-Keywords**: Extract keywords from README if not provided

---

## 8. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Poor search relevance | High | Start simple, iterate with feedback |
| finding-constructs too noisy | Medium | Conservative triggers, easy opt-out |
| Keyword adoption slow | Medium | Auto-extract from manifest/README |
| GIN index performance | Low | Monitor, add partial indexes if needed |

---

## 9. Open Questions

1. ~~Should we add `/v1/constructs/search` or enhance `?q=`?~~
   **Decision**: Enhance existing `?q=` parameter
   
2. How to bootstrap keywords for existing constructs?
   **Proposal**: Extract from manifest description + README headings
   
3. Relevance score threshold for suggestions?
   **Proposal**: 0.5 minimum to show, 0.7+ for proactive suggest

---

## 10. Implementation Checklist

### Sprint 19: Database & Schema
- [ ] T19.1: Add search_keywords column to skills
- [ ] T19.2: Add search_use_cases column to skills
- [ ] T19.3: Add search_keywords column to packs
- [ ] T19.4: Add search_use_cases column to packs
- [ ] T19.5: Create GIN indexes

### Sprint 20: Search Service
- [ ] T20.1: Implement multi-field search
- [ ] T20.2: Implement relevance scoring
- [ ] T20.3: Sort by relevance when q= present
- [ ] T20.4: Add relevance_score to response
- [ ] T20.5: Update OpenAPI spec

### Sprint 21: finding-constructs Skill
- [ ] T21.1: Create skill structure
- [ ] T21.2: Implement trigger patterns
- [ ] T21.3: Implement search workflow
- [ ] T21.4: Add fallback behavior
- [ ] T21.5: Documentation

---

## 11. Appendix

### A. File Inventory

**Files to Create:**
| File | Purpose |
|------|---------|
| `.claude/skills/finding-constructs/` | Discovery skill |

**Files to Modify:**
| File | Changes |
|------|---------|
| `apps/api/src/db/schema.ts` | Add search columns |
| `apps/api/src/services/constructs.ts` | Multi-field search, scoring |
| `apps/api/src/routes/constructs.ts` | Include relevance_score |
| `apps/api/src/docs/openapi.ts` | Document new fields |

### B. Goal Traceability

| Goal | Tasks |
|------|-------|
| G-1 (Discoverable at right moment) | T21.1-T21.5 |
| G-2 (Quality search results) | T20.1-T20.4 |
| G-3 (Non-intrusive) | T21.2, T21.4 |
| G-4 (API-first) | T19.1-T19.5, T20.5 |

### C. References

- **Issue**: https://github.com/0xHoneyJar/loa-constructs/issues/51
- **skills.sh**: https://skills.sh
- **find-skills**: https://skills.sh/vercel-labs/skills/find-skills
- **Current API**: `GET /v1/constructs?q=`

---

**Document Status**: Draft
**Next Step**: `/architect` to create Software Design Document
