---
name: Verification Surface Guide
type: guide
description: How to define grounded verification checks for any construct. Template for construct-base.
updated: 2026-03-17
tags:
  - network
  - verification
  - guide
  - construct-base
---

# Verification Surface Guide

> Every construct makes claims about what it does. Verification is proving those claims are true.
> Not vanity metrics. Not "users liked it." What ACTUALLY matters to you.

## The Principle

**The construct defines what "correct" means. Echelon verifies whether the claim is true.**

Echelon doesn't impose universal metrics. It runs YOUR checks against reality. You define the surface. You decide what matters. You own the standard you're measured against.

This is self-knowledge, not credentialing.

## The Schema

Add this to your `construct.yaml`:

```yaml
workflow:
  verification:
    # What tier are you aiming for?
    # UNVERIFIED → BACKTESTED → PROVEN
    target_tier: BACKTESTED

    # Your specific, measurable checks
    checks:
      check_name:
        description: "What this check measures — one sentence"
        measurement: "How to measure it — specific method, script, or comparison"
        ground_truth: "What the check is measured AGAINST — the source of truth"
        target: "The threshold for passing — a number, percentage, or boolean"
        current_status: "verified | partial | unmeasured | not_applicable"

    # How often should re-verification happen?
    cadence: 30d  # 30 days is default certificate expiry
```

## Five Archetypes of Verification

Every construct falls into one or more of these patterns. Use the archetype that matches your output type.

### 1. Observable Constructs (output matches reality)

**Examples**: Observer/Beehive, Protocol, Beacon

The output makes claims about the real world. Verification = comparing claims to ground truth.

```yaml
# Pattern: claim → compare → score
checks:
  claim_accuracy:
    description: "Do my claims match observable reality?"
    measurement: "Compare N outputs against ground truth source"
    ground_truth: "The external system being observed (chain state, user quotes, search results)"
    target: ">85% accuracy over 30-day window"
```

**Ground truth sources**: on-chain state, user interviews, git history, search engine results, API responses

### 2. Taste Constructs (output matches the spec)

**Examples**: Artisan, The Easel, Showcase, The Speakers

The output claims to follow design principles. Taste IS measurable — oklch deltas, spring constants, spacing rhythms are numbers. Verification = does the output match the specification it claims to follow?

```yaml
# Pattern: spec → implement → compare
checks:
  spec_fidelity:
    description: "Do implementations match the taste tokens I inscribed?"
    measurement: "Compare component CSS/props against taste.md values"
    ground_truth: "The taste.md file or TDR that defines the standard"
    target: ">90% of inscribed tokens reflected in implementation"
```

**Ground truth sources**: taste.md tokens, TDR criteria, design system docs, component prop values

### 3. Depth Constructs (sources are real and grounded)

**Examples**: K-Hole, Mibera Codex

The output claims to synthesize from real sources. Verification = do the sources exist, and do they say what you claim?

```yaml
# Pattern: cite → verify → ground
checks:
  source_validity:
    description: "Do cited sources exist and contain the claimed information?"
    measurement: "Fetch each cited URL/reference, verify content matches claim"
    ground_truth: "The actual source document/page/paper"
    target: ">95% of citations resolve to valid, matching sources"
```

**Ground truth sources**: URLs, papers, books, repositories, API documentation

### 4. Communication Constructs (output matches the artifact)

**Examples**: Herald, Social Oracle, GTM Collective, GrowthPages, Vocabulary Bank

The output translates one artifact into another. Verification = does the translation preserve the truth of the source?

```yaml
# Pattern: source_artifact → transform → compare
checks:
  translation_precision:
    description: "Do claims in output match the source artifact?"
    measurement: "Cross-reference each claim against source PR/release/docs"
    ground_truth: "The git diff, release notes, or documentation being translated"
    target: ">90% precision (no fabricated claims)"
```

**Ground truth sources**: PR diffs, release notes, commit messages, documentation, changelogs

### 5. Security Constructs (findings are real vulnerabilities)

**Examples**: Hardening, Crucible, Dynamic Auth

The output claims to find vulnerabilities. Verification = are the findings real, and did you miss any?

```yaml
# Pattern: scan → find → confirm
checks:
  true_positive_rate:
    description: "Of reported vulnerabilities, how many are real?"
    measurement: "Manual pen test or CVE database confirmation of each finding"
    ground_truth: "Known vulnerability databases, manual exploitation attempts"
    target: ">80% true positive rate"
```

**Ground truth sources**: CVE databases, pen test results, exploit reproduction, OWASP benchmarks

---

## How to Write Good Checks

### DO
- **Be specific**: "Compare oklch lightness delta against taste.md token" not "check design quality"
- **Name your ground truth**: Every check needs a source of truth that exists outside the construct
- **Set honest targets**: 85% is better than 100% (100% means you're not measuring hard enough)
- **Include `current_status`**: Be honest about what you've measured and what you haven't
- **Think about what makes you BETTER**: Verification should drive improvement, not gatekeeping

### DON'T
- **Don't use vanity metrics**: "Number of outputs generated" measures volume, not correctness
- **Don't use self-referential truth**: "Output matches my own expectations" — you can't verify yourself
- **Don't require human judgment as ground truth**: If the check requires "someone reviews and approves," it's not measurable by Echelon
- **Don't set unmeasurable targets**: "Users feel satisfied" — how? compared to what?
- **Don't confuse effort with accuracy**: "Analyzed 10,000 lines" measures input, not output quality

---

## The Verification Gradient

```
UNVERIFIED (default)
  → Define checks in construct.yaml
  → Echelon runs first Product Theatre evaluation

BACKTESTED (historical verification)
  → All checks have current_status != "unmeasured"
  → Core checks pass against historical output
  → 30-day certificate issued

PROVEN (sustained real-time verification)
  → All checks pass rolling 30-day window
  → Automated re-verification via Echelon
  → Certificate auto-renews on pass
```

---

## The Meta-Question

Before defining your checks, ask yourself:

> "If I'm wrong about this, who gets hurt and how?"

- If Artisan inscribes wrong taste tokens → every component built on them is visually inconsistent
- If K-Hole cites a source that doesn't exist → every downstream decision built on that research is ungrounded
- If Protocol misses a revert path → users lose funds
- If Hardening misses a vulnerability → the system gets exploited
- If Herald fabricates a claim → users expect features that don't exist

**The check you need most is the one that catches the failure that hurts the most.**

---

## Navigation

← [[_index]] · [[_echelon]] · [[_health]] · [[_personas]]
