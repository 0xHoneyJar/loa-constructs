---
name: styling-material
description: UI polish patterns for typography, visual design, layout, and dark mode
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Edit
---

# Styling Material

UI polish patterns for typography, visual design, layout, and dark mode. Transform functional interfaces into polished, professional experiences.

## Trigger

```
/style
```

## Overview

This skill provides guidance on the finishing touches that elevate UI from functional to refined. Use it when:

- Setting up typography systems
- Creating visual hierarchy with shadows and borders
- Implementing dark mode properly
- Preventing layout shift and visual glitches
- Polishing decorative elements

## Workflow

### Phase 1: Typography Foundation

#### Font Rendering

Always apply antialiased font smoothing:

```css
body {
  -webkit-font-smoothing: antialiased;
}
```

#### Font Subsetting

Subset fonts based on content to minimize file size. Only include characters you actually use.

```jsx
// next.config.js - Next.js automatic subsetting
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});
```

#### Font Weight Variables

Define weights as CSS variables for global control:

```css
:root {
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

#### Preventing Layout Shift

**Never change font weight on hover or selected states:**

```css
/* Bad - causes layout shift */
.tab:hover {
  font-weight: 600;
}

/* Good - consistent weight, change color instead */
.tab {
  font-weight: 500;
}
.tab.selected {
  color: var(--color-primary);
}
```

**Use tabular numbers for changing values:**

```css
.counter,
.price,
.timer {
  font-variant-numeric: tabular-nums;
}
```

#### Text Wrapping

Use `text-wrap: balance` on headings for better line breaks:

```css
h1, h2, h3 {
  text-wrap: balance;
}
```

#### Letter Spacing by Size

Larger text needs tighter spacing; smaller text needs looser:

```tsx
// Pair font sizes with optimal letter spacing in a Text component
const letterSpacing = {
  xs: '0.02em',   // Looser for small text
  sm: '0.01em',
  base: '0',
  lg: '-0.01em',
  xl: '-0.02em',  // Tighter for large text
  '2xl': '-0.025em',
};
```

### Phase 2: Visual Design

#### Typography Characters

Use proper typographic characters:

| Instead of | Use |
|------------|-----|
| `...` | `…` (ellipsis) |
| `'` | `'` (curly apostrophe) |
| `"` | `"` `"` (curly quotes) |

#### Shadows for Borders

Use shadows instead of borders for better blending:

```css
/* Instead of: border: 1px solid rgba(0, 0, 0, 0.08) */
box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
```

Benefits:
- Blends better with varying backgrounds
- Avoids harsh border look
- Works well with border-radius

#### Hairline Borders

Use 0.5px borders on retina displays:

```css
:root {
  --border-hairline: 1px;

  @media only screen and (min-device-pixel-ratio: 2),
    only screen and (min-resolution: 192dpi) {
    --border-hairline: 0.5px;
  }
}

.divider {
  border-bottom: var(--border-hairline) solid var(--gray-6);
}
```

#### Eased Gradients

Use eased gradients over linear for smoother transitions:

```css
/* Linear - visible banding */
background: linear-gradient(to bottom, black, transparent);

/* Eased - smoother */
background: linear-gradient(
  to bottom,
  hsl(0 0% 0% / 1) 0%,
  hsl(0 0% 0% / 0.738) 19%,
  hsl(0 0% 0% / 0.541) 34%,
  hsl(0 0% 0% / 0.382) 47%,
  hsl(0 0% 0% / 0.278) 56.5%,
  hsl(0 0% 0% / 0.194) 65%,
  hsl(0 0% 0% / 0.126) 73%,
  hsl(0 0% 0% / 0.075) 80.2%,
  hsl(0 0% 0% / 0.042) 86.1%,
  hsl(0 0% 0% / 0.021) 91%,
  hsl(0 0% 0% / 0.008) 95.2%,
  hsl(0 0% 0% / 0.002) 98.2%,
  transparent 100%
);
```

Tool: https://larsenwork.com/easing-gradients/

#### Mask Over Gradient

Prefer `mask-image` for fades - works better with varying content:

```css
.fade-bottom {
  mask-image: linear-gradient(to bottom, black 80%, transparent);
}
```

#### Scrollbars

Only customize scrollbars in smaller elements, not page-level:

```css
.code-block::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.code-block::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}
```

#### Focus Outlines

Keep focus outline colors neutral (grey, black, white). Custom colors often clash.

### Phase 3: Layout

#### Z-Index Scale

Use a fixed scale, avoid arbitrary values:

```css
:root {
  --z-dropdown: 100;
  --z-modal: 200;
  --z-tooltip: 300;
  --z-toast: 400;
}
```

**Better approach:** Avoid z-index when possible:

```css
.card {
  isolation: isolate; /* Creates new stacking context */
}
```

#### Safe Areas

Account for device notches and home indicators:

```css
.footer {
  padding-bottom: env(safe-area-inset-bottom);
}

.sidebar {
  padding-left: env(safe-area-inset-left);
}
```

#### Scroll Margins

Ensure proper space above anchored elements:

```css
[id] {
  scroll-margin-top: 80px; /* Height of sticky header */
}
```

#### Preventing Layout Shift

Use hardcoded dimensions for dynamic elements:

```tsx
// Skeleton loaders
<div className="h-[200px] w-full animate-pulse bg-gray-200" />

// Image placeholders
<div className="aspect-video relative">
  <Image fill src={src} alt={alt} />
</div>
```

#### Grid Text Truncation

Truncate text in grid cells:

```css
.grid-cell-text {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

### Phase 4: Dark Mode

#### Theme Variables

Use numerical scale for easy theme switching:

```css
:root {
  --gray-1: #fafafa;
  --gray-2: #f5f5f5;
  --gray-3: #e5e5e5;
  /* ... */
  --gray-11: #262626;
  --gray-12: #171717;
}

[data-theme="dark"] {
  --gray-1: #171717;
  --gray-2: #1f1f1f;
  --gray-3: #262626;
  /* ... */
  --gray-11: #e5e5e5;
  --gray-12: #fafafa;
}
```

#### Avoid Tailwind dark: Modifier

Use CSS variables instead of manual dark mode overrides:

```css
/* Good - variables flip automatically */
.button {
  background: var(--gray-12);
  color: var(--gray-1);
}

/* Avoid - manual dark mode everywhere */
.button {
  @apply bg-gray-900 dark:bg-gray-100;
}
```

Benefits:
- Cleaner code
- Single source of truth
- Easier to maintain
- Better for design system consistency

### Phase 5: Decorative Elements

#### Pointer Events

Decorative elements should not capture events:

```css
.decorative-bg,
.gradient-overlay,
.noise-texture {
  pointer-events: none;
}
```

#### Disable Selection

Code illustrations should not be selectable:

```css
.illustration {
  user-select: none;
}
```

### Phase 6: Refresh Behavior

Ensure no flash of content on refresh:

```tsx
// Store state in localStorage
const [theme, setTheme] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('theme') || 'light';
  }
  return 'light';
});

// Apply before render with script in <head>
<script dangerouslySetInnerHTML={{
  __html: `
    (function() {
      const theme = localStorage.getItem('theme') || 'light';
      document.documentElement.setAttribute('data-theme', theme);
    })();
  `
}} />
```

## Anti-Patterns to Avoid

| Don't | Do Instead |
|-------|------------|
| Change font-weight on hover | Change color or opacity |
| Use linear gradients with solid colors | Use eased gradients |
| Apply fade to scrollable content | Let content scroll naturally |
| Replace page scrollbars | Only customize in small elements |
| Use `z-index: 9999` | Use a fixed z-index scale |
| Use Tailwind `dark:` everywhere | Flip CSS variables |
| Custom colored focus outlines | Use grey/black/white outlines |

## Quick Reference Card

```
TYPOGRAPHY:
├── -webkit-font-smoothing: antialiased
├── font-variant-numeric: tabular-nums (for numbers)
├── text-wrap: balance (for headings)
└── Never change font-weight on hover

BORDERS:
├── box-shadow: 0 0 0 1px rgba(0,0,0,0.08) (instead of border)
└── --border-hairline: 0.5px (on retina)

LAYOUT:
├── env(safe-area-inset-*) for notches
├── scroll-margin-top for sticky headers
├── isolation: isolate (avoid z-index)
└── Hardcode dimensions for dynamic elements

DARK MODE:
├── Numerical color scale (gray-1 to gray-12)
├── Flip variables in [data-theme="dark"]
└── Avoid Tailwind dark: modifier

DECORATIVE:
├── pointer-events: none
└── user-select: none
```

## Checklist

```
Typography:
├── [ ] Antialiased font smoothing applied
├── [ ] Tabular nums for dynamic numbers
├── [ ] No font-weight changes on hover
└── [ ] Fonts properly subset

Visual:
├── [ ] Shadows used instead of borders where appropriate
├── [ ] Eased gradients for color transitions
├── [ ] Proper typographic characters (curly quotes, ellipsis)
└── [ ] Masks for fading content

Layout:
├── [ ] Z-index scale defined
├── [ ] Safe areas accounted for
├── [ ] Scroll margins set
└── [ ] No layout shift from dynamic content

Dark Mode:
├── [ ] CSS variable system for colors
├── [ ] Variables flip on theme change
├── [ ] No flash on refresh
└── [ ] Minimal use of dark: modifier
```
