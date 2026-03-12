# Word Economy in Developer Tool Naming

> Dig session 2026-03-12 | 64 Gemini grounded searches | depth: +
> Via `dig-search.ts` — real sources with provenance
>
> Thesis: "The description is the entry point to you as a maintainer proving that you understand what your construct captures."

## The McIlroy Test

**Doug McIlroy's** "salvation through suffering" at Bell Labs established the foundational rule: if a tool's purpose requires a conjunction ("but" or "and"), its design is flawed. The Unix `NAME` section — the one-liner in every man page — is the original short description. Born from PDP-11 memory constraints, it survived as cognitive strategy.

**The rule translates directly**: if your construct's tagline needs "and," your construct may be doing too much.

## Semantic Density as Trust Signal

The most provocative finding: **Karl Maton's Legitimation Code Theory (LCT)** reveals that precise, high-density terms like *idempotent*, *stateless*, or *zero-copy* function as "high-cost signals" — shibboleths. In open-source environments, these aren't just descriptions; they are trust indicators that signal a maintainer has "paid the cost" of mastering the domain.

This mirrors **Mike Markkula's "Impute" principle** (1977 Apple Marketing Philosophy): users judge a tool's internal quality by its external "cover."

**For constructs**: the tagline IS the proof-of-work.

## Cognitive Load Research

| Researcher | Finding | Implication |
|-----------|---------|------------|
| **John Sweller** | Every extra word increases "extraneous cognitive load" | Fewer words = more developer brain for the actual problem |
| **Kathy Sierra** | Vague naming causes "cognitive leaks" away from flow state | Precision prevents leaks |
| **John Ousterhout** | "Deep Modules" — simple name should gateway complex implementation | The tagline compresses, the construct expands |
| **NNG** | F-shaped scanning — value captured in first 11 characters | Front-load the differentiator |

## The Density Shift

Evolution from **Brevity** (minimizing characters) to **Density** (minimizing words to maximize meaning). Modern word economy isn't the shortest name — it's the highest ratio of **meaning per syllable**.

| Era | Constraint | Example |
|-----|-----------|---------|
| 1970s Unix | Memory/terminal | `grep` — 4 chars |
| 1990s Debian | Terminal width | "A package manager" — 18 chars |
| 2020s Modern | Cognitive budget | "Hypothesis-first user research" — 3 words, dense |

## Construct Tagline Critique

Does each tagline prove the maintainer understands the construct?

### Strong (shibboleth present)

| Construct | Tagline | Why It Works |
|-----------|---------|-------------|
| **Observer** | Hypothesis-first user research | "Hypothesis-first" is a methodology shibboleth |
| **The Easel** | Aesthetic direction studio | "Direction" (not "design") signals intent over execution |
| **Hardening** | Defensive artifact forge | "Forge" is evocative; "defensive" is the right qualifier |
| **Herald** | Grounded product comms | "Grounded" is the differentiator — separates from generic comms |

### Good (clear but could be sharper)

| Construct | Tagline | Notes |
|-----------|---------|-------|
| **K-Hole** | Depth engine for exploration | "Depth engine" is strong; "for exploration" is redundant |
| **Artisan** | Design systems craft | "Craft" signals process but reads as noun or verb |
| **Beacon** | AI-retrievable trust signals | Dense, but "AI-retrievable" is precision the browser may not need |
| **Protocol** | On-chain verification | Clear but generic — what kind of verification? |

### Needs Work (generic or stacked abstractions)

| Construct | Current | Problem | Proposed |
|-----------|---------|---------|----------|
| **Crucible** | Journey validation testing | Three abstract nouns stacked | **User journey stress tests** |
| **Dynamic Auth** | Wallet identity resolution | "Resolution" is vague | **Wallet-to-session auth** |
| **GTM Collective** | Go-to-market operations | Anyone could claim this | **Launch strategy ensemble** |
| **Gecko** | Ecosystem intelligence | Two abstract nouns | **Autonomous construct telemetry** |
| **Social Oracle** | GitHub-to-social content | Pipeline description, not essence | **Release-to-reach translator** |
| **K-Hole** | Depth engine for exploration | Redundant tail | **Pair-research depth engine** |
| **GrowthPages** | Educational content pipeline | Infra jargon in content context | **Developer education authoring** |
| **WebReel** | Cinematic web capture | "Capture" ambiguous | **Cinematic browser recording** |
| **The Arcade** | Game design philosophy | Too abstract | **Playful interaction patterns** |
| **Mibera Codex** | Mibera universe knowledge | Domain-specific — fine for its audience | *(keep)* |

## Key Principles

1. **The one-liner is the universal interface** — Unix NAME, Apple tagline, GitHub README summary. The one-sentence constraint benchmarks whether a tool's mental model is sufficiently "compressed."
2. **Naming is proof-of-work** — Precise vocabulary acts as proxy for code quality. If a maintainer chose the exact right word, they likely wrote the exact right logic.
3. **Density over brevity** — Not the fewest characters, but the highest meaning-per-syllable ratio.
4. **Front-load the differentiator** — First 11 characters determine whether a scanner stops or scrolls.
5. **The McIlroy test** — If it needs "and," it's two constructs.

## Emergence

- **The One-Liner as Universal Interface**: Whether Unix NAME, Apple tagline, or GitHub summary, the one-sentence constraint is the universal benchmark for sufficient mental model compression.
- **Brevity → Density**: The field has shifted from minimizing characters to maximizing meaning-per-syllable.
- **Naming as Trust Filter**: Naming evolved from discovery aid to proof-of-work mechanism. Precise vocabulary proxies code quality.

## Provenance

Gemini grounded search via `construct-k-hole/scripts/dig-search.ts`
Trail file: `construct-k-hole/scripts/research-output/dig-session-2026-03-12.md`
