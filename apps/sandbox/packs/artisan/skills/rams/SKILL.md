---
name: rams
description: Accessibility and visual design review based on WCAG 2.1
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Edit, Bash
---

# Rams Design Review

Expert accessibility and visual design review for React components based on WCAG 2.1 guidelines.

## Trigger

```
/rams [file]
```

## Overview

Rams reviews code for accessibility issues and visual design problems. Named after Dieter Rams whose design principles emphasize that good design makes a product useful and understandable.

Use this skill when:
- Reviewing components for accessibility compliance
- Auditing UI for WCAG 2.1 conformance
- Checking visual design consistency
- Preparing for accessibility testing

## Workflow

### Phase 1: File Selection

If a file is specified, analyze that file.
If no file specified, scan for component files:

```bash
# Find React components
find src -name "*.tsx" -o -name "*.jsx" | head -20
```

### Phase 2: Accessibility Review (WCAG 2.1)

#### Critical Issues (Must Fix)

| Check | WCAG | What to look for |
|-------|------|------------------|
| Images without alt | 1.1.1 | `<img>` without `alt` attribute |
| Icon-only buttons | 4.1.2 | `<button>` with only SVG/icon, no `aria-label` |
| Form inputs without labels | 1.3.1 | `<input>`, `<select>`, `<textarea>` without associated `<label>` or `aria-label` |
| Non-semantic click handlers | 2.1.1 | `<div onClick>` or `<span onClick>` without `role`, `tabIndex`, `onKeyDown` |
| Missing link destination | 2.1.1 | `<a>` without `href` using only `onClick` |

**Detection patterns:**

```typescript
// Missing alt text
<img src="..." />  // FAIL
<img src="..." alt="" />  // OK (decorative)
<img src="..." alt="Description" />  // OK

// Icon-only buttons
<button><CloseIcon /></button>  // FAIL
<button aria-label="Close"><CloseIcon /></button>  // OK

// Missing form labels
<input type="email" />  // FAIL
<label>Email <input type="email" /></label>  // OK
<input type="email" aria-label="Email" />  // OK

// Non-semantic handlers
<div onClick={handleClick}>Click me</div>  // FAIL
<button onClick={handleClick}>Click me</button>  // OK
```

#### Serious Issues (Should Fix)

| Check | WCAG | What to look for |
|-------|------|------------------|
| Focus outline removed | 2.4.7 | `outline-none` without visible focus replacement |
| Missing keyboard handlers | 2.1.1 | Interactive elements with `onClick` but no keyboard support |
| Color-only information | 1.4.1 | Status indicated only by color (no icon/text) |
| Touch target too small | 2.5.5 | Clickable elements smaller than 44x44px |

**Detection patterns:**

```css
/* Focus outline removed - FAIL */
.button {
  outline: none;
}

/* OK - has visible replacement */
.button {
  outline: none;
}
.button:focus-visible {
  ring: 2px;
}
```

```typescript
// Color-only error - FAIL
<input className={error ? "border-red-500" : ""} />

// OK - has text indicator
<input className={error ? "border-red-500" : ""} />
{error && <span className="text-red-500">{error}</span>}
```

#### Moderate Issues (Consider Fixing)

| Check | WCAG | What to look for |
|-------|------|------------------|
| Heading hierarchy | 1.3.1 | Skipped heading levels (h1 → h3) |
| Positive tabIndex | 2.4.3 | `tabIndex` > 0 (disrupts natural order) |
| Role without required attributes | 4.1.2 | `role="button"` without `tabIndex="0"` |

### Phase 3: Visual Design Review

#### Layout & Spacing

Check for:
- Inconsistent spacing values (mixing px, rem, Tailwind classes)
- Overflow issues, alignment problems
- Z-index conflicts

#### Typography

Check for:
- Mixed font families, weights, or sizes
- Line height issues
- Missing font fallbacks

#### Color & Contrast

Check for:
- Contrast ratio below 4.5:1 for text
- Missing hover/focus states
- Dark mode inconsistencies

#### Component States

Check for missing states:
- **Buttons:** disabled, loading, hover, active, focus
- **Form fields:** error, success, disabled
- **Interactive elements:** focus-visible ring

### Phase 4: Generate Report

Output format:

```
═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: [filename]
═══════════════════════════════════════════════════

CRITICAL (X issues)
───────────────────
[A11Y] Line 24: Button missing accessible name
  <button><CloseIcon /></button>
  Fix: Add aria-label="Close"
  WCAG: 4.1.2

[A11Y] Line 45: Image missing alt text
  <img src="/hero.jpg" />
  Fix: Add alt="Hero image description"
  WCAG: 1.1.1

SERIOUS (X issues)
──────────────────
[A11Y] Line 67: Focus outline removed without replacement
  className="outline-none"
  Fix: Add focus-visible:ring-2
  WCAG: 2.4.7

[VISUAL] Line 89: Touch target too small
  className="w-6 h-6"
  Fix: Add min-w-[44px] min-h-[44px]
  WCAG: 2.5.5

MODERATE (X issues)
───────────────────
[A11Y] Line 102: Skipped heading level
  <h1>Title</h1> ... <h3>Section</h3>
  Fix: Use <h2> for sections under h1
  WCAG: 1.3.1

═══════════════════════════════════════════════════
SUMMARY: X critical, X serious, X moderate
Score: XX/100
═══════════════════════════════════════════════════
```

### Phase 5: Offer Fixes

After generating report, offer to fix issues:

```
Would you like me to fix these issues?

[1] Fix all critical issues
[2] Fix all issues
[3] Fix specific issue (by line number)
[4] Skip
```

## Quick Audit Commands

Run these to find common issues:

```bash
# Find images without alt
grep -rn "<img" --include="*.tsx" | grep -v "alt="

# Find buttons with only icons
grep -rn "<button>" --include="*.tsx" | grep -v "aria-label"

# Find outline-none without focus replacement
grep -rn "outline-none" --include="*.tsx"

# Find onClick on non-semantic elements
grep -rn "div onClick\|span onClick" --include="*.tsx"
```

## Scoring

| Category | Weight | Scoring |
|----------|--------|---------|
| Critical issues | 30 points each | -30 per issue |
| Serious issues | 15 points each | -15 per issue |
| Moderate issues | 5 points each | -5 per issue |

**Score thresholds:**
- 90-100: Excellent accessibility
- 70-89: Good, needs minor fixes
- 50-69: Fair, needs attention
- Below 50: Poor, requires remediation

## WCAG Quick Reference

| Level | Description | Required for |
|-------|-------------|--------------|
| A | Minimum accessibility | All websites |
| AA | Standard accessibility | Most regulations |
| AAA | Enhanced accessibility | Specialized needs |

**Common WCAG references:**
- 1.1.1: Non-text Content (images, icons)
- 1.3.1: Info and Relationships (structure)
- 1.4.1: Use of Color
- 2.1.1: Keyboard accessible
- 2.4.3: Focus Order
- 2.4.7: Focus Visible
- 2.5.5: Target Size
- 4.1.2: Name, Role, Value

## Quick Reference Card

```
CRITICAL (must fix):
├── img without alt
├── button without aria-label (icon-only)
├── input without label
├── div/span with onClick (use button)
└── a without href

SERIOUS (should fix):
├── outline-none without focus replacement
├── onClick without keyboard handler
├── Color-only status indicators
└── Touch targets < 44px

MODERATE (consider):
├── Skipped heading levels
├── tabIndex > 0
└── role without required attributes

AUTOMATED CHECKS:
├── grep for missing alt
├── grep for outline-none
├── grep for onClick on div/span
└── Review all button elements
```

## Checklist

```
Before Review:
├── [ ] Identify all interactive elements
├── [ ] Identify all images and icons
├── [ ] Identify all form inputs
└── [ ] Check heading structure

Critical Checks:
├── [ ] All images have alt text
├── [ ] All buttons have accessible names
├── [ ] All inputs have labels
├── [ ] All click handlers on semantic elements
└── [ ] All links have href

Serious Checks:
├── [ ] Focus indicators visible
├── [ ] Keyboard navigation works
├── [ ] Color not sole indicator
└── [ ] Touch targets adequate

Visual Checks:
├── [ ] Spacing consistent
├── [ ] Typography consistent
├── [ ] All states implemented
└── [ ] Dark mode works
```
