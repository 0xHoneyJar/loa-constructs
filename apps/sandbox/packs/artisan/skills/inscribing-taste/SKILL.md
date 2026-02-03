---
name: inscribing-taste
description: Apply brand taste tokens to components from taste.md
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Edit
---

# Inscribing Taste

Apply brand taste tokens to components. Reads from `taste.md` and ensures consistent brand expression across UI.

## Trigger

```
/inscribe [component]
```

## Overview

This skill applies captured taste tokens to components, ensuring brand consistency. It bridges the gap between abstract brand guidelines and concrete implementation.

Use when:
- Implementing new components that need brand styling
- Reviewing components for taste compliance
- Applying design system tokens to existing code

## Workflow

### Phase 1: Load Taste Tokens

Read the project's taste file:

```
grimoires/taste.md
# or
contexts/taste/taste.md
```

**Taste Token Structure:**

```yaml
# taste.md
brand:
  name: "ProjectName"
  personality: ["precise", "confident", "minimal"]

colors:
  primary: "blue-600"
  secondary: "gray-900"
  accent: "amber-500"
  background: "white"
  surface: "gray-50"

typography:
  heading: "font-semibold tracking-tight"
  body: "font-normal text-gray-700"
  caption: "text-sm text-gray-500"

spacing:
  tight: "gap-2"
  default: "gap-4"
  loose: "gap-8"

motion:
  duration: "200ms"
  easing: "ease-out"

shadows:
  default: "shadow-sm"
  elevated: "shadow-md"

borders:
  default: "border border-gray-200"
  focus: "ring-2 ring-blue-500"
```

### Phase 2: Identify Component Needs

For the target component, identify:

1. **Color tokens** - What colors are used?
2. **Typography tokens** - What text styles?
3. **Spacing tokens** - What spacing patterns?
4. **Motion tokens** - What animations?
5. **Interactive states** - Hover, focus, active?

### Phase 3: Apply Tokens

Map taste tokens to component styles:

```tsx
// Before - generic styles
function Button({ children }) {
  return (
    <button className="bg-blue-500 px-4 py-2 rounded font-medium">
      {children}
    </button>
  );
}

// After - taste tokens applied
function Button({ children }) {
  return (
    <button className={cn(
      // Colors from taste
      "bg-primary text-white",
      // Spacing from taste
      "px-4 py-2",
      // Typography from taste
      "font-semibold tracking-tight",
      // Interactive states
      "hover:bg-primary/90",
      "focus-visible:ring-2 focus-visible:ring-primary",
      // Motion from taste
      "transition-colors duration-200 ease-out"
    )}>
      {children}
    </button>
  );
}
```

### Phase 4: Validate Compliance

Check that the component follows taste guidelines:

```
Taste Compliance Check:
├── [ ] Uses defined color tokens
├── [ ] Uses defined typography tokens
├── [ ] Uses defined spacing tokens
├── [ ] Motion matches taste duration/easing
├── [ ] Interactive states use focus ring
└── [ ] No hardcoded values that bypass tokens
```

## Token Mapping Reference

### Colors

| Token | CSS Variable | Tailwind |
|-------|-------------|----------|
| primary | `--color-primary` | `bg-primary` |
| secondary | `--color-secondary` | `bg-secondary` |
| accent | `--color-accent` | `text-accent` |
| background | `--color-bg` | `bg-background` |
| surface | `--color-surface` | `bg-surface` |

### Typography

| Token | Application |
|-------|-------------|
| heading | H1-H6 elements, card titles |
| body | Paragraphs, descriptions |
| caption | Labels, helper text |
| mono | Code, technical content |

### Motion

| Token | Value | Use |
|-------|-------|-----|
| duration | `200ms` | All transitions |
| easing | `ease-out` | Entrances |
| easing-in-out | `ease-in-out` | Movement |

## Example Output

```
═══════════════════════════════════════════════════
TASTE INSCRIPTION: Button.tsx
═══════════════════════════════════════════════════

TOKENS APPLIED:
├── color.primary → bg-blue-600
├── typography.heading → font-semibold tracking-tight
├── motion.duration → 200ms
├── motion.easing → ease-out
└── borders.focus → ring-2 ring-blue-500

CHANGES MADE:
├── Line 5: bg-blue-500 → bg-primary (taste token)
├── Line 5: Added tracking-tight (taste typography)
├── Line 8: Added transition-colors duration-200
└── Line 9: Added focus-visible ring

COMPLIANCE: 100%
═══════════════════════════════════════════════════
```

## Quick Reference Card

```
LOAD TASTE:
├── Read grimoires/taste.md
├── Parse color tokens
├── Parse typography tokens
├── Parse spacing tokens
└── Parse motion tokens

APPLY TO COMPONENT:
├── Map colors to Tailwind classes
├── Map typography to text classes
├── Map spacing to gap/padding
├── Map motion to transitions
└── Map focus to ring styles

VALIDATE:
├── No hardcoded colors
├── No hardcoded font styles
├── No hardcoded spacing
├── Motion uses taste duration
└── Focus uses taste ring
```

## Checklist

```
Before Inscribing:
├── [ ] taste.md exists and is readable
├── [ ] Component identified
├── [ ] Current styles documented
└── [ ] Token mapping planned

During Inscription:
├── [ ] Colors use taste tokens
├── [ ] Typography uses taste tokens
├── [ ] Spacing uses taste tokens
├── [ ] Motion uses taste duration/easing
└── [ ] Focus states use taste ring

After Inscription:
├── [ ] No hardcoded values remain
├── [ ] Component renders correctly
├── [ ] Interactive states work
└── [ ] Compliance check passes
```
