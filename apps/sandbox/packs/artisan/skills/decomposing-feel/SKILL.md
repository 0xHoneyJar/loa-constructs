---
name: decomposing-feel
description: Convert vague "feel" feedback into specific actionable fixes via decomposition questions
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Edit, AskUserQuestion
---

# Decomposing Feel

Convert vague "feel" feedback into specific actionable fixes through guided decomposition.

## Trigger

```
/decompose                    # Start decomposition for current context
/decompose "it feels off"     # Decompose specific feedback
```

**Auto-trigger**: When `iterating-visuals` receives "Something's off" feedback.

## Overview

Humans often know something is wrong but can't articulate what. This skill bridges the gap:

```
"It doesn't feel right" → Decomposition → "The shadow is too heavy"
```

## The Three Feedback Types

| Type | Signal | Example | Actionability |
|------|--------|---------|---------------|
| **Feel** | Vibe is off | "Something's wrong but I can't say what" | Low - needs this skill |
| **Specifics** | Concrete delta | "This margin should be 24px not 16px" | High - direct fix |
| **Taste** | Pattern preference | "More like Stripe, less like Bootstrap" | Medium - needs reference |

**Goal**: Convert FEEL → SPECIFICS or TASTE so AI can act.

## Workflow

### Phase 1: Present Decomposition Matrix

When user says something vague, present targeted questions:

```json
{
  "questions": [{
    "question": "Let me help identify what's off. Is it...",
    "header": "Decompose",
    "multiSelect": false,
    "options": [
      {
        "label": "The spacing",
        "description": "Padding, margins, gaps feel wrong"
      },
      {
        "label": "The color",
        "description": "Palette, contrast, tone feels wrong"
      },
      {
        "label": "The hierarchy",
        "description": "Text weight, size, emphasis feels wrong"
      },
      {
        "label": "The motion",
        "description": "Animation, transitions feel wrong"
      }
    ]
  }]
}
```

If user selects "Other" or can't identify:
→ Move to Phase 2: A/B Comparison

---

### Phase 2: Drill Down on Dimension

Once dimension identified, drill deeper:

#### Spacing
```
You said spacing feels off. More specifically:

1. Too tight? (needs more breathing room)
2. Too loose? (feels disconnected)
3. Inconsistent? (some parts tight, others loose)
4. Wrong balance? (visual weight distribution)
```

#### Color
```
You said color feels off. More specifically:

1. Too saturated? (too vibrant)
2. Too muted? (too washed out)
3. Poor contrast? (hard to read)
4. Wrong palette? (doesn't match brand)
```

#### Hierarchy
```
You said hierarchy feels off. More specifically:

1. No clear focus? (everything same weight)
2. Too many levels? (confusing priority)
3. Wrong emphasis? (important things don't stand out)
4. Typography issues? (font size, weight, spacing)
```

#### Motion
```
You said motion feels off. More specifically:

1. Too fast? (feels jarring)
2. Too slow? (feels sluggish)
3. Wrong easing? (doesn't feel natural)
4. Too much motion? (distracting)
```

---

### Phase 3: A/B Comparison (if still stuck)

When user can't identify even with drill-down, offer comparison:

```
I'll generate two descriptions. Which feels closer to what you want?

VERSION A:
- Tighter spacing (p-2 instead of p-4)
- No shadows
- Sharper corners (rounded-sm)

VERSION B:
- Generous spacing (p-6 instead of p-4)
- Subtle shadow (shadow-sm)
- Softer corners (rounded-lg)

Which direction feels closer? Or neither?
```

Based on response:
- "A" → Apply A's patterns, ask again
- "B" → Apply B's patterns, ask again
- "Neither" → Ask what's different about ideal

---

### Phase 3.5: Log Decomposition (NEW in v1.2.0)

**Log decomposition path for pattern detection.**

```bash
log_decomposition() {
  local dimension="$1"
  local aspect="$2"
  local resolution="$3"

  local log_dir="grimoires/artisan/feedback"
  local log_file="${log_dir}/$(date +%Y-%m-%d).jsonl"
  local session_id="${ARTISAN_SESSION_ID:-$(date +%s | sha256sum | cut -c1-8)}"

  mkdir -p "$log_dir"

  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"session_id\":\"${session_id}\",\"skill\":\"decomposing-feel\",\"feedback\":\"decomposed\",\"context\":{\"dimension\":\"${dimension}\",\"aspect\":\"${aspect}\"},\"resolution\":\"${resolution}\"}" >> "$log_file"
}
```

**Log after resolution applied:**

```bash
# Example: Spacing → Too tight → p-2→p-4
log_decomposition "spacing" "too_tight" "p-2→p-4"
```

---

### Phase 4: Map to Specific Fix

Once identified, propose concrete change:

```
IDENTIFIED: Spacing → Too tight

Specific Fix:
├── Current: p-2 (8px padding)
├── Proposed: p-4 (16px padding)
└── Alternative: p-6 (24px for more "premium" feel)

Apply which option?
```

---

### Phase 5: Pattern Learning

After successful decomposition, track for taste learning:

```
Decomposition Session Summary:
├── Started with: "It doesn't feel right"
├── Identified: Spacing → Too tight
├── Fixed with: p-4

I've noticed this is the 3rd time you've preferred more padding.
Add "prefer generous spacing" to taste.md?
```

---

## Decomposition Reference Card

```
FEEL → DECOMPOSE → SPECIFY

Level 1: What dimension?
├── Spacing
├── Color
├── Hierarchy
├── Motion
└── Density

Level 2: What aspect?
├── Spacing: tight/loose/inconsistent/balance
├── Color: saturated/muted/contrast/palette
├── Hierarchy: focus/levels/emphasis/typography
├── Motion: fast/slow/easing/amount
└── Density: crowded/sparse/rhythm

Level 3: Specific fix
├── Token change (p-2 → p-4)
├── Class change (shadow-md → shadow-sm)
└── Value change (#000 → #333)
```

---

## Agentation Integration

When user has Agentation installed, offer annotation option:

```
Can you point to exactly what's off?

If you have Agentation installed:
1. Activate it (bottom-right corner)
2. Click the problematic element
3. Copy the markdown output
4. Paste it here

I'll parse the selector and map to the exact code.
```

**Parsing Agentation Output:**

```markdown
## Annotation

**Element**: `.card-shadow`
**Position**: (234, 156)
**Note**: Too heavy

**Selector**: `[class*="shadow-md"]`
```

→ Parse selector
→ Grep codebase for `shadow-md`
→ Propose `shadow-sm` or `shadow-xs`

---

## Example Sessions

### Session 1: Successful Decomposition

```
User: "The card doesn't feel right"

AI: "Is it the spacing, color, hierarchy, or motion?"

User: [Selects "Spacing"]

AI: "Is it too tight, too loose, inconsistent, or wrong balance?"

User: [Selects "Too tight"]

AI: "Current padding is p-2. Proposed fix:
     - p-4 (subtle increase)
     - p-6 (generous, more premium)

     Which to apply?"

User: "p-6"

AI: [Applies p-6, takes screenshot]
AI: "Updated. How does it look now?"

User: "Perfect!"
```

### Session 2: A/B Required

```
User: "Something's off but I can't say what"

AI: "Is it spacing, color, hierarchy, or motion?"

User: [Selects "Other"]

AI: "Let me try A/B comparison.

     VERSION A: Tighter, sharper, no shadows
     VERSION B: Spacious, soft, subtle shadows

     Which feels closer?"

User: "B, but not the shadows"

AI: "Got it - spacious and soft, but no shadows.
     Applying: p-6, rounded-lg, no shadow.
     [Takes screenshot]

     How about now?"

User: "Yes, that's it!"
```

---

## Output Format

```
═══════════════════════════════════════════════════════════════
DECOMPOSITION: Card.tsx
═══════════════════════════════════════════════════════════════

Initial feedback: "It doesn't feel right"

Decomposition Path:
├── L1: Spacing
├── L2: Too tight
└── L3: p-2 → p-6

Fix Applied: padding: p-6
Result: Approved

Pattern Noted:
└── User prefers generous spacing (3rd occurrence)
    → Suggested for taste.md

═══════════════════════════════════════════════════════════════
```

---

## Error Handling

| Scenario | Response |
|----------|----------|
| User can't choose dimension | Offer A/B comparison |
| A/B doesn't help | Ask for reference ("like what site?") |
| Still stuck | Offer to step back and describe ideal |
| User frustrated | Acknowledge, offer break, save context |

---

## Related Skills

- `/iterate-visual` - Triggers this skill on "Something's off"
- `/inscribe` - Applies fixes using taste tokens
- `/synthesize` - Extracts taste for grounding
