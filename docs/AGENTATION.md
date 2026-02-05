# Agentation Integration Guide

Agentation enables precise visual feedback by capturing element selectors when you click on UI problems.

## What is Agentation?

[Agentation](https://github.com/benjitaylor/agentation) is a React component that lets you annotate UI elements with structured feedback. It captures class names, selectors, and positions so AI can `grep` for the exact code you're referring to.

## Installation

```bash
npm install agentation -D
```

## Setup

Add the component to your app's root:

```tsx
import { Agentation } from 'agentation';

function App() {
  return (
    <>
      <YourApp />
      <Agentation />
    </>
  );
}
```

A small UI appears in the bottom-right corner.

## Workflow with Artisan

### Step 1: Iterate Visuals

When iterating on design with `/iterate-visual`, select "Let me annotate" when asked for feedback.

### Step 2: Activate Agentation

1. Click the Agentation icon (bottom-right)
2. The UI activates with selection mode

### Step 3: Point at Problems

1. Click the element that's off
2. Agentation captures:
   - CSS class names
   - Element selector
   - Position coordinates

### Step 4: Copy Output

Click "Copy" to get markdown like:

```markdown
## Annotation

**Element**: `.card-shadow`
**Position**: (234, 156)
**Note**: Shadow too heavy

**Selector**: `[class*="shadow-md"]`
```

### Step 5: Paste into Claude

Paste the markdown into the conversation. Artisan's skills will:

1. Parse the selector
2. Grep codebase for matches
3. Propose specific fix

## Features

| Feature | Description |
|---------|-------------|
| Element selection | Click any element for auto selector detection |
| Text highlighting | Mark specific content within elements |
| Batch selection | Drag across multiple components |
| Animation pause | Freeze CSS animations to capture state |
| Structured export | Copy markdown with selectors and positions |
| Theme support | Auto dark/light mode |

## Why Use Agentation?

| Before | After |
|--------|-------|
| "The shadow feels heavy" | `[class*="shadow-md"]` at Card.tsx:15 |
| "Something's off with spacing" | `.card-content` has `p-2`, suggest `p-4` |
| "The button doesn't look right" | `[data-testid="submit-btn"]` needs `font-semibold` |

**Result**: Vague feedback → Precise code location → Fast fix

## Integration with Skills

### `/iterate-visual`

When you select "Let me annotate":
1. Skill pauses for your annotation
2. You use Agentation to select element
3. Paste the markdown
4. Skill maps selector to code and proposes fix

### `/decompose`

If decomposition questions don't help:
1. Offer Agentation as alternative
2. Direct pointing often faster than verbal description
3. Parsed annotation feeds into specific fix

## Troubleshooting

### Agentation not appearing

Ensure it's after your app content:
```tsx
<>
  <YourApp />
  <Agentation />  {/* Must be last */}
</>
```

### Selector not found in codebase

The element may use dynamic classes. Try:
- Looking for partial matches
- Checking parent elements
- Using data-testid if available

### Copy not working

Check clipboard permissions in browser settings.

## Related

- [Agentation GitHub](https://github.com/benjitaylor/agentation)
- [iterating-visuals skill](/apps/sandbox/packs/artisan/skills/iterating-visuals/SKILL.md)
- [decomposing-feel skill](/apps/sandbox/packs/artisan/skills/decomposing-feel/SKILL.md)
