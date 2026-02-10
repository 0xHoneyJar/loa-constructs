# Counterfactual Authoring Guide

> How to write Near Miss / Category Error blocks for skill distillation.

## Purpose

Counterfactual blocks teach agents (and the Bridgebuilder review system) to distinguish between correct approaches, seductively similar mistakes, and fundamentally wrong approaches. Each block contains three sections: **Target**, **Near Miss**, and **Category Error**.

## Template

Insert this block into the skill's `SKILL.md` at the documented insertion point (typically after the main workflow, before output format sections).

```markdown
## Counterfactuals — [Domain Name]

### The Target (What We Do)
[Description of the correct approach with concrete examples from the skill's domain.
Show code, config, or design patterns that represent the gold standard.]

### The Near Miss — [Name] (Seductively Close, But Wrong)
**What it looks like:**
[Concrete example from the skill's domain — code, config, or workflow
that appears correct at first glance]

**Why it's tempting:**
[The reasoning that makes this approach seem correct]

**Physics of Error:** [Named principle — see vocabulary below]
[Explanation of the architectural consequence. Why does this approach
break under real-world conditions?]

**Detection signal:**
[How Bridgebuilder or an agent should recognize this pattern.
Specific markers, code patterns, or structural tells.]

### The Category Error — [Name] (Fundamentally Wrong)
**What it looks like:**
[Concrete example that represents a fundamental misunderstanding]

**Why someone might try it:**
[The reasoning path that leads to this mistake]

**Physics of Error:** [Named principle — see vocabulary below]
[Structural impossibility explanation — why this CANNOT produce
the outcome, not just why we prefer alternatives]

**Bridgebuilder action:** Immediate rejection. Regenerate from Target.
```

## Physics of Error Vocabulary

Each counterfactual must cite one of these named principles explaining **why** the error is structurally wrong:

| Principle | Definition | Example |
|-----------|------------|---------|
| **Brittle Dependency** | Coupling to a specific value that will change | Hardcoding a wallet address instead of using a context slot |
| **Concept Impermanence** | Treating a snapshot as permanent truth | Recording user feedback conclusions before testing hypotheses |
| **Semantic Drift** | Using a concept outside its valid domain | Applying CSS easing to state transition timing |
| **Coupling Inversion** | Depending on implementation instead of interface | Testing DOM selectors instead of user-visible behavior |
| **Semantic Collapse** | Reducing a rich concept to a single dimension | Summarizing user research as a sentiment score |
| **Layer Violation** | Operating at the wrong level of abstraction | Overriding design tokens with inline styles |

## Line Target

Aim for **50–80 lines** per counterfactual block. This balances:
- Enough detail for agents to distinguish patterns (minimum ~50 lines)
- Token efficiency to avoid bloating SKILL.md context (maximum ~80 lines)

## Choosing the Right Insertion Point

Insert counterfactual blocks **after** the main workflow phases and **before** output format or reference sections. The block should feel like a "calibration checkpoint" between doing the work and formatting the output.

**Good locations:**
- After the last workflow phase
- After validation/compliance steps
- Before "Output Format" or "Review Output Format"

**Bad locations:**
- At the very top (before the agent understands the skill)
- Inside a workflow phase (breaks the flow)
- After references/appendices (agent may not read this far)

## Examples

### Example 1: Design System Domain (Artisan)

```markdown
## Counterfactuals — Theme Token Compliance

### The Target (What We Do)
All visual properties flow through the design token pipeline:
`BEAUVOIR.md → theme.config → Tailwind tokens → component classes`

### The Near Miss — Partial Token Adoption (Seductively Close, But Wrong)
**What it looks like:**
```css
.card {
  @apply bg-surface-primary;     /* token: correct */
  border-radius: 12px;           /* raw value: wrong */
  box-shadow: 0 4px 12px #0002;  /* raw value: wrong */
}
```

**Why it's tempting:** The primary colors use tokens, so it "looks" compliant.
Border radius and shadows seem too minor to tokenize.

**Physics of Error:** Brittle Dependency — Raw values create invisible
coupling to a specific visual language that cannot be theme-switched.

**Detection signal:** Any CSS/Tailwind with literal px, hex, or rgb values
outside of token definitions.

### The Category Error — Direct Style Override (Fundamentally Wrong)
**What it looks like:**
```tsx
<Card style={{ backgroundColor: '#1a1a2e', borderRadius: 12 }} />
```

**Why someone might try it:** Fastest way to match a design mockup.

**Physics of Error:** Layer Violation — Inline styles bypass the entire
token pipeline. They cannot be themed, audited, or systematically updated.

**Bridgebuilder action:** Immediate rejection. Regenerate from Target.
```

### Example 2: User Research Domain (Observer)

```markdown
## Counterfactuals — User Research Methodology

### The Target (What We Do)
Hypothesis-first research: observe → form theory → test → refine.
Never record a conclusion, only record a falsifiable hypothesis.

### The Near Miss — Conclusion-First Recording (Seductively Close, But Wrong)
**What it looks like:**
"Users find the onboarding confusing" (recorded as observation)

**Why it's tempting:** It summarizes multiple data points efficiently
and feels like a useful insight.

**Physics of Error:** Concept Impermanence — A conclusion recorded as
fact becomes immune to contradiction. New evidence cannot update it
because it was never framed as testable.

**Detection signal:** Observation contains value judgments (confusing,
difficult, intuitive) without a falsifiable condition.

### The Category Error — Aggregated Sentiment Analysis (Fundamentally Wrong)
**What it looks like:**
"78% of users rated onboarding 4/5 or higher → onboarding is successful"

**Why someone might try it:** Quantitative data feels more rigorous
than qualitative observation.

**Physics of Error:** Semantic Collapse — A Likert score cannot
represent the multi-dimensional reality of user experience. A user
may rate 5/5 while failing to complete the core task.

**Bridgebuilder action:** Immediate rejection. Regenerate from Target.
```

## Checklist

Before submitting a counterfactual block:

- [ ] All three sections present (Target, Near Miss, Category Error)
- [ ] Each error section cites a Physics of Error principle
- [ ] Near Miss is genuinely seductive (not obviously wrong)
- [ ] Category Error is fundamentally wrong (not just suboptimal)
- [ ] Detection signals are specific and actionable
- [ ] Examples use the skill's actual domain (not generic)
- [ ] Block is 50–80 lines
- [ ] Inserted at documented insertion point
