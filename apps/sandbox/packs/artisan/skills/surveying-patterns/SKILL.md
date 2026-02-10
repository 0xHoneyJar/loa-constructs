---
name: surveying-patterns
description: UI baseline constraints and pattern enforcement to prevent interface slop
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Edit
---

# Surveying Patterns

Opinionated UI baseline constraints to prevent AI-generated interface slop. Enforces consistent patterns across stack, components, interactions, and animations.

## Trigger

```
/survey [file]
```

## Overview

Use this skill to:
- Apply baseline constraints to UI work
- Review files against pattern rules
- Catch common AI-generated UI anti-patterns
- Enforce consistent component usage

## Usage Modes

**Apply constraints:**
```
/survey
```
Apply these constraints to any UI work in this conversation.

**Review file:**
```
/survey src/components/Button.tsx
```
Review the file and output violations, why they matter, and fixes.

## Stack Constraints

### Required

| Rule | Requirement |
|------|-------------|
| CSS | MUST use Tailwind CSS defaults unless custom values exist |
| Animation | MUST use `motion/react` (formerly `framer-motion`) for JS animation |
| Class Logic | MUST use `cn` utility (`clsx` + `tailwind-merge`) |

### Recommended

| Rule | Recommendation |
|------|----------------|
| Micro-animations | SHOULD use `tw-animate-css` for entrance animations |

## Component Constraints

### Required

| Rule | Requirement |
|------|-------------|
| Primitives | MUST use accessible component primitives (Base UI, React Aria, Radix) |
| Existing First | MUST use project's existing components first |
| No Mixing | NEVER mix primitive systems within same interaction surface |
| Icon Buttons | MUST add `aria-label` to icon-only buttons |
| No Manual Focus | NEVER rebuild keyboard/focus behavior by hand |

### Recommended

| Rule | Recommendation |
|------|----------------|
| New Primitives | SHOULD prefer Base UI for new primitives if stack-compatible |

## Interaction Constraints

### Required

| Rule | Requirement |
|------|-------------|
| Destructive Actions | MUST use `AlertDialog` for destructive/irreversible actions |
| Viewport Height | NEVER use `h-screen`, use `h-dvh` |
| Safe Areas | MUST respect `safe-area-inset` for fixed elements |
| Error Placement | MUST show errors next to where action happens |
| Paste | NEVER block paste in `input` or `textarea` |

### Recommended

| Rule | Recommendation |
|------|----------------|
| Loading States | SHOULD use structural skeletons for loading |

## Animation Constraints

### Required

| Rule | Requirement |
|------|-------------|
| Explicit Only | NEVER add animation unless explicitly requested |
| Compositor Only | MUST animate only `transform`, `opacity` |
| No Layout | NEVER animate `width`, `height`, `top`, `left`, `margin`, `padding` |
| Duration | NEVER exceed `200ms` for interaction feedback |
| Off-screen | MUST pause looping animations when off-screen |

### Recommended

| Rule | Recommendation |
|------|----------------|
| Paint Props | SHOULD avoid animating `background`, `color` except small UI |
| Entrance | SHOULD use `ease-out` on entrance |
| Reduced Motion | SHOULD respect `prefers-reduced-motion` |
| Custom Easing | NEVER introduce custom easing unless requested |
| Large Surfaces | SHOULD avoid animating large images or full-screen |

## Typography Constraints

### Required

| Rule | Requirement |
|------|-------------|
| Headings | MUST use `text-balance` for headings |
| Body | MUST use `text-pretty` for body/paragraphs |
| Data | MUST use `tabular-nums` for numeric data |

### Recommended

| Rule | Recommendation |
|------|----------------|
| Dense UI | SHOULD use `truncate` or `line-clamp` |
| Letter Spacing | NEVER modify `tracking-*` unless requested |

## Layout Constraints

### Required

| Rule | Requirement |
|------|-------------|
| Z-Index | MUST use fixed z-index scale (no arbitrary `z-*`) |

### Recommended

| Rule | Recommendation |
|------|----------------|
| Square Elements | SHOULD use `size-*` instead of `w-*` + `h-*` |

## Performance Constraints

### Required

| Rule | Requirement |
|------|-------------|
| Blur | NEVER animate large `blur()` or `backdrop-filter` |
| Will-change | NEVER apply `will-change` outside active animation |
| useEffect | NEVER use `useEffect` for render-expressible logic |

## Design Constraints

### Required

| Rule | Requirement |
|------|-------------|
| Empty States | MUST give empty states one clear next action |

### Recommended

| Rule | Recommendation |
|------|----------------|
| Gradients | NEVER use gradients unless explicitly requested |
| Purple Gradients | NEVER use purple or multicolor gradients |
| Glow Effects | NEVER use glow effects as primary affordances |
| Shadows | SHOULD use Tailwind default shadow scale |
| Accent Colors | SHOULD limit accent color to one per view |
| Color Tokens | SHOULD use existing theme/Tailwind colors first |

## Counterfactuals — Pattern Survey Methodology

### The Target (What We Do)

Survey the FULL codebase to identify recurring visual patterns, then classify by frequency and consistency. The survey scans every component directory, groups by visual similarity (layout, spacing, color usage), and reports both patterns AND anti-patterns with their occurrence counts.

```
Survey scope: ALL components in src/
Classification: { pattern_name, occurrences, consistency_score, violations }
Output: Pattern inventory with frequency data
```

### The Near Miss — Selective Sampling (Seductively Close, But Wrong)

**What it looks like:** Surveying only "representative" components — the homepage, a settings page, and a modal — then declaring "these are the patterns."

```
Survey scope: 3-5 "key" pages
Classification: patterns found in sampled pages
Output: Pattern list without frequency data
```

**Why it's tempting:** Full codebase surveys take time. Sampling feels efficient and "statistically sound." The sampled pages often DO contain the primary patterns, so the results look reasonable.

**Physics of Error:** *Concept Impermanence* — Patterns identified from samples reflect the sample, not the system. Edge cases, admin views, error states, and onboarding flows often contain the highest-value pattern violations — the exact places where inconsistency causes user confusion. A sample-based survey creates false confidence: "we have 5 patterns" when the codebase actually contains 12, with 7 lurking in unsurveyed components.

**Detection signal:** Survey report that covers fewer than 80% of component directories; no violation/anti-pattern section; missing occurrence counts; no consistency score.

### The Category Error — Screenshot-Based Survey (Fundamentally Wrong)

**What it looks like:** Taking screenshots of the UI and visually identifying patterns without reading component source code.

```
Survey input: Screenshots of running application
Classification: "this looks like that"
Output: Visual similarity groups
```

**Why someone might try it:** Visual patterns are, by definition, visual. Screenshots show "what the user sees." This feels like the most direct approach.

**Physics of Error:** *Semantic Drift* — Screenshots capture rendered output, not design intent. Two components can look identical but use completely different implementation patterns (one uses design tokens, one uses hardcoded values). Visual similarity does NOT imply implementation consistency. This CANNOT produce a useful pattern inventory because the purpose of the survey is to find implementation patterns for standardization — rendered pixels tell you nothing about whether components share a token system, consistent spacing rhythm, or compatible motion curves.

**Bridgebuilder action:** Immediate rejection. Regenerate from Target using source code analysis.

## Review Output Format

When reviewing a file, output:

```
═══════════════════════════════════════════════════
BASELINE UI REVIEW: [filename]
═══════════════════════════════════════════════════

VIOLATIONS (X found)
────────────────────

[STACK] Line 15: Missing cn utility
  className={`${styles.button} ${isActive ? 'active' : ''}`}
  Why: Manual class concatenation bypasses Tailwind merge conflict resolution
  Fix: className={cn(styles.button, isActive && 'active')}

[ANIMATION] Line 32: Layout property animated
  animate={{ height: isOpen ? 'auto' : 0 }}
  Why: Animating height triggers layout recalculation every frame
  Fix: Use transform (scaleY) or opacity with fixed height container

[INTERACTION] Line 45: Using h-screen
  className="h-screen"
  Why: h-screen doesn't account for mobile browser chrome
  Fix: Use h-dvh for dynamic viewport height

═══════════════════════════════════════════════════
SUMMARY: X violations found
═══════════════════════════════════════════════════
```

## Quick Reference Card

```
STACK:
├── Tailwind CSS defaults
├── motion/react for JS animation
├── cn() for class logic
└── tw-animate-css for micro-animations

COMPONENTS:
├── Base UI / React Aria / Radix for primitives
├── Use existing components first
├── Don't mix primitive systems
├── aria-label on icon buttons
└── Never rebuild focus behavior

INTERACTION:
├── AlertDialog for destructive actions
├── h-dvh, not h-screen
├── Respect safe-area-inset
├── Errors next to actions
└── Never block paste

ANIMATION:
├── Only when explicitly requested
├── Only transform + opacity
├── Max 200ms for feedback
├── Pause when off-screen
└── Respect prefers-reduced-motion

TYPOGRAPHY:
├── text-balance for headings
├── text-pretty for body
├── tabular-nums for data
└── No tracking-* changes

DESIGN:
├── No gradients unless requested
├── No purple/multicolor gradients
├── No glow as primary affordance
├── One accent color per view
└── Clear next action in empty states
```

## Checklist

```
Before Writing UI:
├── [ ] Existing components checked
├── [ ] Primitive system identified
├── [ ] Animation explicitly requested?
└── [ ] Color tokens available?

Stack:
├── [ ] Using cn() for classes
├── [ ] motion/react for animation
├── [ ] Tailwind defaults used
└── [ ] No custom values without reason

Components:
├── [ ] Accessible primitive used
├── [ ] aria-label on icon buttons
├── [ ] No manual focus handling
└── [ ] No mixed primitive systems

Interaction:
├── [ ] h-dvh not h-screen
├── [ ] safe-area-inset on fixed
├── [ ] AlertDialog for destructive
├── [ ] Errors colocated
└── [ ] Paste not blocked

Animation:
├── [ ] Only if requested
├── [ ] transform/opacity only
├── [ ] Under 200ms
├── [ ] Pauses off-screen
└── [ ] Reduced motion respected
```
