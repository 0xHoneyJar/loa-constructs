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

### Phase 0: Load Visual Inspiration & Direction (if exists)

Before applying taste, check for direction constraints:

```
grimoires/artisan/inspiration/
├── direction.md       # "We Want" and "We Avoid"
└── references.md      # Reference vocabulary
```

**If direction.md exists:**

1. **Parse "We Avoid" constraints**:
   - Build list of patterns to warn about
   - E.g., "gradients", "heavy shadows", "rounded-full"

2. **Parse "We Want" attributes**:
   - Map to expected patterns
   - E.g., "premium" → spacious padding, subtle shadows

3. **Load reference vocabulary**:
   - Enable suggestions like "More like Stripe's buttons"

**Direction validation will be applied in Phase 3.**

---

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

### Phase 3: Apply Tokens (with Direction Validation)

**Before applying each token, validate against direction.md:**

```
Proposed: gradient-to-r from-blue-500 to-purple-500
direction.md says: "We avoid: gradients"

⚠️ DIRECTION CONFLICT
This conflicts with your design direction.

Options:
[A]pply anyway (override)
[S]uggest alternative (based on references)
[C]ancel

Suggested alternative (from Stripe reference):
  bg-blue-600 (solid color, confident)
```

```
Proposed: p-2 (tight padding)
direction.md says: "We want: premium (spacious)"
references.md: "Premium" → Stripe (p-6+)

⚠️ DIRECTION MISMATCH
This may conflict with your "premium" goal.

Suggested: Use p-6 to align with premium direction?
```

**If user overrides, log for evolution tracking:**
```
# grimoires/artisan/inspiration/evolution/overrides.log
2026-02-04: Applied p-2 despite "premium" direction (user choice)
2026-02-04: Applied gradient despite "no gradients" (intentional exception)
```

---

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

## Counterfactuals — Theme Token Compliance

### The Target (What We Do)

Apply taste tokens as CSS custom properties and Tailwind classes that reference the project's `taste.md`. Every color, spacing, typography, and motion value resolves to a defined token — never a raw hex, pixel, or duration literal.

```tsx
// Target: Token-based component
<Card className="bg-surface text-foreground rounded-radius-md p-spacing-4">
  <motion.div transition={{ duration: 'var(--duration-fast)', ease: 'var(--ease-default)' }}>
    {children}
  </motion.div>
</Card>
```

### The Near Miss — Partial Token Adoption (Seductively Close, But Wrong)

**What it looks like:** Colors use tokens but spacing/motion use raw values.

```tsx
// Near Miss: Mixed token and raw values
<Card className="bg-surface text-foreground rounded-lg p-4">
  <motion.div transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}>
    {children}
  </motion.div>
</Card>
```

**Why it's tempting:** The component looks correct — colors match the design system. Tailwind's `p-4` and `rounded-lg` feel like tokens, and hardcoded motion values "work."

**Physics of Error:** *Brittle Dependency* — Raw spacing values create a shadow design system. When taste.md spacing scale changes from 4px-base to 6px-base, token-based components adapt automatically; partial-token components silently drift. The system bifurcates into "components that respond to taste changes" and "components that don't," with no way to distinguish them programmatically.

**Detection signal:** Any Tailwind utility class that doesn't map to a taste.md token; any motion duration/easing expressed as a literal number rather than a CSS variable.

### The Category Error — Direct Style Override (Fundamentally Wrong)

**What it looks like:** Inline styles or `!important` overrides that bypass the token system entirely.

```tsx
// Category Error: Bypassing the design system
<Card style={{ backgroundColor: '#1a1a2e', padding: '16px', borderRadius: '8px' }}>
  <div style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
    {children}
  </div>
</Card>
```

**Why someone might try it:** "The design needs this specific shade" or "the token doesn't have exactly what I need." Inline styles provide immediate visual results without understanding the token architecture.

**Physics of Error:** *Layer Violation* — Inline styles operate at a different cascade layer than the design system. They cannot be overridden by theme changes, dark mode toggles, or responsive adaptations. This CANNOT produce a maintainable component because it severs the relationship between the component and the taste system — the component becomes a rendering island that no design system operation can reach.

**Bridgebuilder action:** Immediate rejection. Regenerate from Target using the nearest token values.

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
