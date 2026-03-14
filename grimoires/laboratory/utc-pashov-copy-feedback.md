# User Truth Canvas — Pashov (Copy Clarity)

> Observer Level 3 diagnostic | 2026-03-14
> Source: Private DM conversation (Discord)
> Captured by: @zksoju

---

## User Profile

| Field | Value |
|-------|-------|
| **Name** | Pashov |
| **Role** | Founder/Operator — Pashov Audit Group |
| **Team size** | 40+ freelance auditors |
| **Domain** | Smart contract security auditing |
| **AI usage** | Built own AI audit agent ("My agent finds vulnerabilities") |
| **Agent sophistication** | Has people building agents for him. Not looking for solutions. |
| **Relationship to product** | Has done audits for 0xHoneyJar previously. Familiar with the team, not the product. |

## Context

First external test of constructs.network launch copy. Pashov was shown the Twitter launch post and site. This is NOT a cold user — he has context on the team and web3/security domain. His confusion is purely lexical, not conceptual.

## Hypotheses (not conclusions)

### H1: Abstract taglines fail the Bazaar Baseline test
**Evidence:**
> "Pretty much jibberish. Buzzwords. What is this at all? open agent expertise network. Doesn't speak anything to me."

**Theory:** Users arrive with vocabulary already loaded from the AI agent ecosystem (skills, tools, MCP, plugins). Abstract compound nouns ("Open Agent Expertise Network") don't map to any existing mental model. The words individually mean things but stacked together they mean nothing.

**Strength:** MEDIUM — single user, but a domain expert who knows agent tooling intimately.

### H2: "Skills marketplace" is the closest existing mental model
**Evidence:**
> zksoju: "this is simply a skills marketplace but curated by and for experts"
> pashov: "Skills marketplace I can understand, kind of"

**Theory:** The concept clicks when mapped to an existing pattern (marketplace/npm/registry). The word "skills" has gravity from Anthropic's ecosystem. The concept is understood — the wording was the barrier.

**Strength:** MEDIUM — immediate comprehension shift on reframe.

### H3: "Marketplace" implies commerce that doesn't exist
**Evidence:**
> "Skills are free right? Like Anthropic uses the word 'marketplace' but it's just like 'npm' - it's not a 'market' where you 'buy' anything"

**Theory:** "Marketplace" loads a Chekhov's Gun — users expect pricing, purchasing, reviews. When those don't exist, it creates cognitive dissonance. The word creates an expectation the product can't fulfill.

**Strength:** HIGH — Pashov identified the exact gap unprompted.

### H4: Operator-class users are not the install audience
**Evidence:**
> "I have people building agents for me sir. I am not looking for solutions really."
> "My agent finds vulnerabilities. I run the company."

**Theory:** Users at Pashov's level (company operators) are not the ones who install constructs. Their engineers are. The copy needs to work for the engineer who evaluates and installs, not the executive who approves budget. Pashov's confusion may be partly audience mismatch — the copy doesn't need to convince HIM, it needs to convince his builders.

**Strength:** LOW — single observation, could be unique to his management style.

### H5: "Expert" is aspirational until certification exists
**Evidence (from zksoju's reflection, not Pashov directly):**
> "expert eventually will be certified. right now it's like self proclaimed expert. OSINT etc will certain[ly verify]"

**Theory:** Quality claims ("expert-built", "best at its domain") are unearned until a verification mechanism (OSINT, Echelon, certification tiers) makes them provable. The word "expert" should enter the copy AFTER certification ships, not before.

**Strength:** HIGH — internal conviction, consistent with gravity principle.

## Quotes (verbatim, redacted for privacy)

| Quote | Tag |
|-------|-----|
| "Pretty much jibberish. Buzzwords." | comprehension-failure |
| "What is this at all? open agent expertise network. Doesn't speak anything to me." | comprehension-failure |
| "Skills marketplace I can understand, kind of" | reframe-success |
| "Skills are free right?" | expectation-mismatch |
| "it's not a 'market' where you 'buy' anything" | word-gravity |
| "I have people building agents for me sir" | audience-mismatch |
| "My agent finds vulnerabilities. I run the company" | user-role |
| "My attention is not just not free. I am not truly selling it" | attention-value |

## Actions Taken

| Action | Date | Status |
|--------|------|--------|
| Homepage H2: "The Open Agent Expertise Network" → "Skills for AI coding agents." | 2026-03-14 | Done |
| All metadata descriptions updated to match | 2026-03-14 | Done |
| "Named expertise" removed from all surfaces | 2026-03-14 | Done |
| "Expert-built" removed — unearned until certification | 2026-03-14 | Done |
| Terms: "marketplace" → "registry", "bundles" removed | 2026-03-14 | Done |
| README: pnpm → bun, "Marketplace" references removed | 2026-03-14 | Done |
| Nav: "What" → "About" | 2026-03-14 | Done |
| 404: "Explore Network" → "Browse Constructs" | 2026-03-14 | Done |
| Compose section body copy added to about page | 2026-03-14 | Done |
| Gravity rule saved to memory | 2026-03-14 | Done |

## Open Questions

- **CLI command mismatch**: Homepage shows `npx constructs install`, install page shows `npx @loa-constructs/cli install`. Which is canonical?
- **About page "the best at its domain"**: Superlative — earned or aspirational at 3 public constructs?
- **Ghost/redacted slots on about page**: Signal mystery or signal confusion?
- **When does "expert" earn its way back?**: Tied to Echelon OSINT verification + certification tiers shipping.

## Weight

This is ONE conversation. Pashov is sophisticated but may not represent the primary install audience (which is the engineer, not the operator). Don't over-index. But the vocabulary findings (abstract nouns fail, "skills" lands, "marketplace" implies commerce) are likely generalizable because they're structural, not personal.
