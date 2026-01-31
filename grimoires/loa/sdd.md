# Software Design Document: Intelligent Construct Discovery

**Version**: 1.0.0
**Date**: 2026-01-31
**Author**: Software Architect Agent
**Status**: Draft
**PRD Reference**: grimoires/loa/prd.md v1.0.0
**Cycle**: cycle-007
**Issue**: [#51](https://github.com/0xHoneyJar/loa-constructs/issues/51)

---

## 1. Executive Summary

This document describes the technical architecture for enhanced construct discovery in the Loa Constructs registry. The system improves search quality through multi-field matching and relevance scoring, enabling users to discover constructs more effectively both through direct API queries and through the `finding-constructs` agent skill.

### 1.1 Design Principles

1. **Backward Compatible**: Enhanced `?q=` parameter, no breaking changes to existing API
2. **API-First**: All discovery logic lives server-side, skills simply consume the API
3. **Incremental Enhancement**: Start with keyword matching, design for future semantic search
4. **Performance First**: Search remains <200ms p95, leverage existing indexes where possible
5. **Low Adoption Friction**: Keywords are optional; system works without them (falls back to name/description)

### 1.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Client Layer                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Agent (finding-constructs skill)                                   │
│  CLI (/constructs search)                                           │
│  Web (browse page with search)                                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API Layer (Hono)                                 │
├─────────────────────────────────────────────────────────────────────┤
│  GET /v1/constructs?q=<query>                                       │
│  ├── Multi-field search (name, description, keywords, use_cases)   │
│  ├── Relevance scoring                                              │
│  └── Returns relevance_score in response                           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Service Layer                                    │
├─────────────────────────────────────────────────────────────────────┤
│  constructs.ts                                                      │
│  ├── listConstructs() - enhanced with relevance scoring             │
│  ├── calculateRelevanceScore() - NEW                                │
│  └── searchMultiField() - NEW                                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Data Layer (PostgreSQL + Drizzle)                │
├─────────────────────────────────────────────────────────────────────┤
│  skills                                                             │
│  ├── search_keywords TEXT[] + GIN index                             │
│  └── search_use_cases TEXT[] + GIN index                            │
│                                                                     │
│  packs                                                              │
│  ├── search_keywords TEXT[] + GIN index                             │
│  └── search_use_cases TEXT[] + GIN index                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| Database | PostgreSQL 15 | Existing; GIN indexes for array search |
| ORM | Drizzle | Existing; type-safe schema changes |
| API | Hono | Existing; performant HTTP layer |
| Cache | Redis (optional) | Existing; skip cache for search queries |
| Skill Runtime | Claude Code | Existing; finding-constructs skill |

---

## 3. Database Design

### 3.1 Schema Changes

#### 3.1.1 Skills Table Modifications

```typescript
// apps/api/src/db/schema.ts

export const skills = pgTable(
  'skills',
  {
    // ... existing columns ...
    
    // Search enhancement columns
    // @see prd.md §5.1 Database Changes
    searchKeywords: text('search_keywords').array().default([]),
    searchUseCases: text('search_use_cases').array().default([]),
  },
  (table) => ({
    // ... existing indexes ...
    
    // GIN indexes for array containment queries
    searchKeywordsIdx: index('idx_skills_search_keywords')
      .on(table.searchKeywords)
      .using('gin'),
    searchUseCasesIdx: index('idx_skills_search_use_cases')
      .on(table.searchUseCases)
      .using('gin'),
  })
);
```

#### 3.1.2 Packs Table Modifications

```typescript
export const packs = pgTable(
  'packs',
  {
    // ... existing columns ...
    
    // Search enhancement columns
    searchKeywords: text('search_keywords').array().default([]),
    searchUseCases: text('search_use_cases').array().default([]),
  },
  (table) => ({
    // ... existing indexes ...
    
    searchKeywordsIdx: index('idx_packs_search_keywords')
      .on(table.searchKeywords)
      .using('gin'),
    searchUseCasesIdx: index('idx_packs_search_use_cases')
      .on(table.searchUseCases)
      .using('gin'),
  })
);
```

### 3.2 Migration Strategy

```sql
-- Migration: add_search_columns

-- Skills
ALTER TABLE skills
ADD COLUMN search_keywords TEXT[] DEFAULT '{}',
ADD COLUMN search_use_cases TEXT[] DEFAULT '{}';

CREATE INDEX idx_skills_search_keywords ON skills USING GIN (search_keywords);
CREATE INDEX idx_skills_search_use_cases ON skills USING GIN (search_use_cases);

-- Packs
ALTER TABLE packs
ADD COLUMN search_keywords TEXT[] DEFAULT '{}',
ADD COLUMN search_use_cases TEXT[] DEFAULT '{}';

CREATE INDEX idx_packs_search_keywords ON packs USING GIN (search_keywords);
CREATE INDEX idx_packs_search_use_cases ON packs USING GIN (search_use_cases);
```

---

## 4. Service Layer Design

### 4.1 Enhanced Search Algorithm

```typescript
// apps/api/src/services/constructs.ts

interface SearchResult extends Construct {
  relevanceScore: number;
  matchReasons: string[];
}

/**
 * Calculate relevance score for a construct against a query
 * @see prd.md §4.3 Search Ranking Factors
 */
function calculateRelevanceScore(
  construct: {
    name: string;
    description: string | null;
    searchKeywords: string[];
    searchUseCases: string[];
    downloads: number;
    maturity: MaturityLevel;
    rating: number | null;
  },
  queryTerms: string[]
): { score: number; matchReasons: string[] } {
  let score = 0;
  const matchReasons: string[] = [];
  
  const nameLower = construct.name.toLowerCase();
  const descLower = (construct.description || '').toLowerCase();
  const keywordsLower = construct.searchKeywords.map(k => k.toLowerCase());
  const useCasesLower = construct.searchUseCases.map(u => u.toLowerCase());
  
  for (const term of queryTerms) {
    const termLower = term.toLowerCase();
    
    // Name exact match (weight: 1.0)
    if (nameLower === termLower) {
      score += 1.0;
      if (!matchReasons.includes('name')) matchReasons.push('name');
    }
    // Name partial match (weight: 0.8)
    else if (nameLower.includes(termLower)) {
      score += 0.8;
      if (!matchReasons.includes('name')) matchReasons.push('name');
    }
    
    // Keywords match (weight: 0.9)
    if (keywordsLower.some(k => k.includes(termLower))) {
      score += 0.9;
      if (!matchReasons.includes('keywords')) matchReasons.push('keywords');
    }
    
    // Use cases match (weight: 0.7)
    if (useCasesLower.some(u => u.includes(termLower))) {
      score += 0.7;
      if (!matchReasons.includes('use_cases')) matchReasons.push('use_cases');
    }
    
    // Description match (weight: 0.6)
    if (descLower.includes(termLower)) {
      score += 0.6;
      if (!matchReasons.includes('description')) matchReasons.push('description');
    }
  }
  
  // Normalize by number of terms
  score = score / queryTerms.length;
  
  // Add popularity boost (weight: 0.3, log scale)
  const downloadBoost = Math.min(Math.log10(construct.downloads + 1) / 5, 1) * 0.3;
  score += downloadBoost;
  
  // Add maturity boost (weight: 0.2)
  const maturityBoost = {
    stable: 0.2,
    beta: 0.15,
    experimental: 0.05,
    deprecated: 0,
  }[construct.maturity];
  score += maturityBoost;
  
  // Add rating boost (weight: 0.2)
  if (construct.rating) {
    const ratingBoost = (construct.rating / 5) * 0.2;
    score += ratingBoost;
  }
  
  return { score: Math.min(score, 2.0), matchReasons }; // Cap at 2.0
}
```

### 4.2 Multi-Field Query Construction

```typescript
/**
 * Build SQL conditions for multi-field search
 * Uses OR across fields, scores calculated in application layer
 */
function buildSearchConditions(query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  const searchPattern = `%${query}%`;
  
  return or(
    // Name/description (existing ILIKE)
    ilike(skills.name, searchPattern),
    ilike(skills.description, searchPattern),
    // Keywords array overlap
    sql`${skills.searchKeywords} && ARRAY[${sql.join(terms.map(t => sql`${t}`), sql`, `)}]::text[]`,
    // Use cases array overlap  
    sql`${skills.searchUseCases} && ARRAY[${sql.join(terms.map(t => sql`${t}`), sql`, `)}]::text[]`
  );
}
```

### 4.3 Response Enhancement

```typescript
// When query is present, include relevance in response
interface ListConstructsResult {
  constructs: (Construct & {
    relevanceScore?: number;
    matchReasons?: string[];
  })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

## 5. API Design

### 5.1 Enhanced GET /v1/constructs

**Request** (unchanged):
```
GET /v1/constructs?q=user+research&type=pack&page=1&per_page=20
```

**Response** (enhanced when `q` present):
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "pack",
      "name": "Observer",
      "slug": "observer",
      "description": "UX research and validation pack",
      "maturity": "stable",
      "downloads": 1250,
      "relevance_score": 1.87,
      "match_reasons": ["name", "keywords", "use_cases"],
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 5,
    "total_pages": 1
  },
  "request_id": "req-123"
}
```

### 5.2 Sorting Behavior

| Condition | Sort Order |
|-----------|------------|
| `q` present | `relevance_score DESC, downloads DESC` |
| `q` absent | `downloads DESC` (existing behavior) |

---

## 6. finding-constructs Skill Design

### 6.1 Skill Structure

```
.claude/skills/finding-constructs/
├── index.yaml          # Metadata + triggers
├── SKILL.md            # Discovery workflow
└── resources/
    └── triggers.md     # Trigger pattern documentation
```

### 6.2 index.yaml

```yaml
name: finding-constructs
version: 1.0.0
description: Helps users discover relevant constructs from the Loa registry
author: 0xHoneyJar
triggers:
  patterns:
    - "find a skill for"
    - "find a construct for"
    - "is there a construct that"
    - "is there a skill that"
    - "I need help with"
    - "how do I do"
  domains:
    - security
    - testing
    - deployment
    - documentation
    - code-review
allowed-tools:
  - WebFetch
  - Read
```

### 6.3 SKILL.md Workflow

```markdown
# finding-constructs

## Trigger Detection

When the user's message matches a trigger pattern, extract the intent:

1. Parse the user's need into keywords
2. Query the registry API
3. Present results or offer direct assistance

## Workflow

### Step 1: Extract Keywords

From: "I need help with user research interviews"
Extract: ["user", "research", "interviews"]

### Step 2: Query API

```bash
curl "https://loa-constructs-api.fly.dev/v1/constructs?q=user+research+interviews&limit=5"
```

### Step 3: Present Results

If results with relevance_score >= 0.5:

```
I found relevant constructs:

1. **Observer** (pack) - UX research and validation
   Relevance: 87% | Downloads: 1,250 | Maturity: stable
   Install: `/constructs install observer`

2. **Crucible** (pack) - Validation testing framework
   Relevance: 65% | Downloads: 890 | Maturity: beta
   Install: `/constructs install crucible`

Would you like to install one, or should I help you directly?
```

If no results or all below threshold:

```
I didn't find a specific construct for that, but I can help you directly
with [extracted task]. Would you like me to proceed?
```

## Opt-Out

User can disable by adding to .claude/settings.json:
```json
{
  "skills": {
    "finding-constructs": { "enabled": false }
  }
}
```
```

---

## 7. OpenAPI Specification Updates

### 7.1 Schema Additions

```typescript
// apps/api/src/docs/openapi.ts

// Add to Construct schema
Construct: {
  type: 'object',
  properties: {
    // ... existing properties ...
    search_keywords: {
      type: 'array',
      items: { type: 'string' },
      description: 'Searchable keywords for discovery',
    },
    search_use_cases: {
      type: 'array',
      items: { type: 'string' },
      description: 'Use case descriptions for semantic matching',
    },
    relevance_score: {
      type: 'number',
      nullable: true,
      description: 'Relevance score (0-2) when search query present',
    },
    match_reasons: {
      type: 'array',
      items: { type: 'string', enum: ['name', 'description', 'keywords', 'use_cases'] },
      nullable: true,
      description: 'Fields that matched the search query',
    },
  },
},
```

---

## 8. Performance Considerations

### 8.1 Query Performance

| Operation | Target | Strategy |
|-----------|--------|----------|
| Search with `q` | <200ms | GIN indexes on arrays |
| Relevance scoring | <50ms | Application-layer calculation |
| Total response | <200ms p95 | Limit fetch to 100 max |

### 8.2 Index Strategy

```sql
-- GIN indexes enable efficient array containment
-- Query: search_keywords && ARRAY['term1', 'term2']
-- Uses GIN index scan, not sequential scan
```

### 8.3 Caching

Search queries are **NOT cached** because:
- Results depend on query string
- Cache key explosion risk
- Fresh results more important for discovery

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Test | Description |
|------|-------------|
| `calculateRelevanceScore` | Verify scoring weights |
| `buildSearchConditions` | SQL generation correctness |
| Multi-term queries | "user research" splits correctly |

### 9.2 Integration Tests

| Test | Description |
|------|-------------|
| Search with keywords | Construct with matching keywords ranks higher |
| Search with use_cases | Use case match boosts relevance |
| Empty keywords | Falls back to name/description |
| Sorting | Results sorted by relevance when q present |

### 9.3 E2E Tests

| Test | Description |
|------|-------------|
| API response shape | `relevance_score` present when q provided |
| finding-constructs skill | Triggers on patterns, presents results |

---

## 10. Implementation Checklist

### Sprint 19: Database & Schema
- [ ] T19.1: Add `search_keywords` column to skills table
- [ ] T19.2: Add `search_use_cases` column to skills table
- [ ] T19.3: Add `search_keywords` column to packs table
- [ ] T19.4: Add `search_use_cases` column to packs table
- [ ] T19.5: Create GIN indexes for all new columns
- [ ] T19.6: Run migration on staging/production

### Sprint 20: Search Service Enhancement
- [ ] T20.1: Implement `calculateRelevanceScore()` function
- [ ] T20.2: Implement multi-field SQL query builder
- [ ] T20.3: Update `fetchSkillsAsConstructs()` to include new columns
- [ ] T20.4: Update `fetchPacksAsConstructs()` to include new columns
- [ ] T20.5: Sort by relevance when `q` present
- [ ] T20.6: Add `relevance_score` and `match_reasons` to response
- [ ] T20.7: Update OpenAPI spec with new fields
- [ ] T20.8: Unit tests for scoring algorithm
- [ ] T20.9: Integration tests for search

### Sprint 21: finding-constructs Skill
- [ ] T21.1: Create skill directory structure
- [ ] T21.2: Write index.yaml with triggers
- [ ] T21.3: Write SKILL.md workflow
- [ ] T21.4: Add fallback behavior
- [ ] T21.5: Write resources/triggers.md documentation
- [ ] T21.6: Test skill trigger patterns
- [ ] T21.7: Document opt-out mechanism

---

## 11. Appendix

### A. File Inventory

**Files to Create:**
| File | Purpose |
|------|---------|
| `.claude/skills/finding-constructs/index.yaml` | Skill metadata |
| `.claude/skills/finding-constructs/SKILL.md` | Skill workflow |
| `.claude/skills/finding-constructs/resources/triggers.md` | Trigger docs |

**Files to Modify:**
| File | Changes |
|------|---------|
| `apps/api/src/db/schema.ts` | Add search_keywords, search_use_cases |
| `apps/api/src/services/constructs.ts` | Relevance scoring, multi-field search |
| `apps/api/src/routes/constructs.ts` | Include relevance in response |
| `apps/api/src/docs/openapi.ts` | Document new fields |

### B. Goal Traceability

| Goal | Tasks |
|------|-------|
| G-1 (Discoverable at right moment) | T21.1-T21.7 |
| G-2 (Quality search results) | T20.1-T20.6, T20.8-T20.9 |
| G-3 (Non-intrusive) | T21.2, T21.4 |
| G-4 (API-first) | T19.1-T19.6, T20.7 |

### C. References

- **Issue**: https://github.com/0xHoneyJar/loa-constructs/issues/51
- **skills.sh**: https://skills.sh
- **PRD**: grimoires/loa/prd.md
- **Existing constructs.ts**: apps/api/src/services/constructs.ts

---

**Document Status**: Draft
**Next Step**: `/sprint-plan` to create sprint breakdown
