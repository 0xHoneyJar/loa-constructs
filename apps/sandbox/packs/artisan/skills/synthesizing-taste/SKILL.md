---
name: synthesizing-taste
description: Extract brand taste tokens from reference materials into taste.md
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Edit
---

# Synthesizing Taste

Extract brand taste tokens from reference materials and generate a taste.md file. Analyzes existing code, design files, and brand guidelines to codify the project's visual identity.

## Trigger

```
/synthesize [source]
```

## Overview

This skill reverse-engineers taste from existing materials:
- Existing codebase patterns
- Design files or Figma exports
- Brand guidelines documents
- Reference websites or screenshots

Use when:
- Starting a new project and need to capture existing brand
- Onboarding to a project with undefined taste
- Updating taste.md after design system changes
- Consolidating scattered style decisions

## Workflow

### Phase 1: Collect References

Identify sources to analyze:

```
Reference Sources:
├── Code: src/components/*, tailwind.config.js
├── Design: figma-export.json, design-tokens.json
├── Brand: brand-guidelines.pdf, style-guide.md
└── Examples: reference-sites.md, screenshots/
```

### Phase 2: Extract Patterns

#### From Code

Scan for repeated patterns:

```bash
# Find color usage
grep -rh "bg-\|text-\|border-" src/ | sort | uniq -c | sort -rn

# Find spacing patterns
grep -rh "gap-\|p-\|m-\|space-" src/ | sort | uniq -c | sort -rn

# Find typography patterns
grep -rh "font-\|text-\|tracking-\|leading-" src/ | sort | uniq -c | sort -rn
```

#### From Tailwind Config

Extract custom values:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',  // → color.primary
        accent: '#f59e0b',   // → color.accent
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],  // → typography.family
      },
    },
  },
};
```

#### From Design Tokens

Parse design system exports:

```json
{
  "color": {
    "primary": { "value": "#2563eb" },
    "secondary": { "value": "#1f2937" }
  },
  "spacing": {
    "xs": { "value": "4px" },
    "sm": { "value": "8px" }
  }
}
```

### Phase 3: Identify Brand Personality

Analyze patterns to determine personality traits:

| Pattern Observed | Personality Trait |
|------------------|-------------------|
| Tight spacing, small text | Precise, dense |
| Large padding, whitespace | Spacious, calm |
| Bold colors, high contrast | Confident, bold |
| Muted colors, subtle shadows | Refined, subtle |
| Sharp corners | Modern, technical |
| Rounded corners | Friendly, approachable |
| Sans-serif fonts | Clean, contemporary |
| Serif fonts | Traditional, editorial |

### Phase 4: Generate taste.md

Output structured taste file:

```markdown
# Taste: [Project Name]

## Brand Personality

- **Precise**: Tight spacing, minimal decoration
- **Confident**: Bold primary color, clear hierarchy
- **Minimal**: Limited color palette, no gradients

## Colors

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| primary | #2563eb | blue-600 | Buttons, links, accents |
| secondary | #1f2937 | gray-800 | Text, headings |
| accent | #f59e0b | amber-500 | Highlights, badges |
| background | #ffffff | white | Page background |
| surface | #f9fafb | gray-50 | Cards, panels |
| muted | #6b7280 | gray-500 | Secondary text |

## Typography

| Token | Classes | Usage |
|-------|---------|-------|
| heading | font-semibold tracking-tight | H1-H6 |
| body | font-normal text-gray-700 | Paragraphs |
| caption | text-sm text-gray-500 | Labels, helpers |
| mono | font-mono text-sm | Code |

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | gap-1, p-1 | Tight groupings |
| sm | gap-2, p-2 | Related items |
| md | gap-4, p-4 | Default spacing |
| lg | gap-6, p-6 | Section padding |
| xl | gap-8, p-8 | Page sections |

## Motion

| Token | Value | Usage |
|-------|-------|-------|
| duration-fast | 100ms | Micro-interactions |
| duration-default | 200ms | Standard transitions |
| duration-slow | 300ms | Page transitions |
| easing-default | ease-out | Entrances |
| easing-movement | ease-in-out | Position changes |

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| shadow-sm | 0 1px 2px | Subtle elevation |
| shadow-md | 0 4px 6px | Cards, dropdowns |
| shadow-lg | 0 10px 15px | Modals, popovers |

## Borders

| Token | Value | Usage |
|-------|-------|-------|
| border-default | border-gray-200 | Dividers, inputs |
| border-focus | ring-2 ring-blue-500 | Focus states |
| radius-default | rounded-lg | Buttons, cards |
| radius-full | rounded-full | Avatars, pills |

## Never Rules

Things that violate this brand's taste:

- Never use gradients (except loading skeletons)
- Never use shadows heavier than shadow-lg
- Never use colors outside the palette
- Never use animation duration > 300ms
- Never use purple or multicolor accents
```

### Phase 5: Generate Tailwind Config

Optionally generate matching Tailwind config:

```javascript
// tailwind.config.js (generated)
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#1f2937',
        accent: '#f59e0b',
        surface: '#f9fafb',
        muted: '#6b7280',
      },
      transitionDuration: {
        fast: '100ms',
        DEFAULT: '200ms',
        slow: '300ms',
      },
    },
  },
};
```

## Output Format

```
═══════════════════════════════════════════════════
TASTE SYNTHESIS: [Project Name]
═══════════════════════════════════════════════════

SOURCES ANALYZED:
├── Code: 47 component files
├── Config: tailwind.config.js
└── Design: design-tokens.json

PATTERNS EXTRACTED:
├── Colors: 6 tokens
├── Typography: 4 tokens
├── Spacing: 5 tokens
├── Motion: 5 tokens
└── Shadows: 3 tokens

PERSONALITY DETECTED:
├── Precise (tight spacing: 78% of components)
├── Confident (bold primary usage)
└── Minimal (3-color palette)

FILES GENERATED:
├── grimoires/taste.md
└── tailwind.config.taste.js (optional)

═══════════════════════════════════════════════════
```

## Quick Reference Card

```
COLLECT:
├── Component files
├── Tailwind config
├── Design tokens
└── Brand guidelines

EXTRACT:
├── Color patterns
├── Typography patterns
├── Spacing patterns
├── Motion patterns
└── Shadow patterns

IDENTIFY:
├── Personality traits
├── Consistency level
├── Outliers/violations
└── Never rules

GENERATE:
├── taste.md
├── Token tables
├── Never rules
└── Tailwind config (optional)
```

## Checklist

```
Before Synthesis:
├── [ ] Reference sources identified
├── [ ] Code access available
├── [ ] Config files located
└── [ ] Design assets available

During Synthesis:
├── [ ] Colors extracted
├── [ ] Typography extracted
├── [ ] Spacing extracted
├── [ ] Motion extracted
├── [ ] Personality identified
└── [ ] Never rules documented

After Synthesis:
├── [ ] taste.md generated
├── [ ] Tokens are consistent
├── [ ] Tailwind config matches
└── [ ] Team reviewed and approved
```
