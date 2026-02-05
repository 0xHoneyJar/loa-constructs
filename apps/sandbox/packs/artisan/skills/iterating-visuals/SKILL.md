---
name: iterating-visuals
description: Auto-screenshot design iteration loop with active feedback request. Use when making visual/style changes to components.
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Edit, Bash, AskUserQuestion
---

# Iterating Visuals

Design iteration loop that automatically captures screenshots after visual changes and actively requests feedback.

## Trigger

```
/iterate-visual [component]     # Start iteration on component
/iterate-visual --screenshot    # Manual screenshot capture
```

**Auto-trigger signals** (skill activates automatically when detected):
- Editing `.tsx`, `.jsx`, `.css`, `.scss` files with style changes
- Tailwind class modifications
- Multiple rounds of edits on same component
- User mentions "looks", "visual", "screenshot", "design"

## Overview

This skill closes the visual feedback loop:

```
CHANGE → CAPTURE → ASK → RECEIVE → REFINE → COMPOUND → REPEAT
```

Without this loop, AI makes changes blindly and can't evaluate visual output.

## Prerequisites

1. **agent-browser installed**: `npm install -g agent-browser && agent-browser install`
2. **Dev server running**: On port 3000, 5173, 8080, or 4000
3. **Taste context** (optional): `grimoires/artisan/taste.md` for grounded decisions

## Workflow

### Phase 0: Detect Design Iteration Context

Check if we're in a design iteration context:

**Trigger Signals:**

| Signal | Weight | Detection |
|--------|--------|-----------|
| Editing style files | High | `.tsx`, `.jsx`, `.css`, `.scss` changes |
| Tailwind class changes | High | `className=` modifications |
| Multiple edits on same component | High | >2 edits to same file |
| User mentions visuals | Medium | "looks", "visual", "screenshot" |
| Dev server running | Prerequisite | Check common ports |

**Detection Logic:**
```bash
# Check for dev server on common ports
for port in 3000 5173 8080 4000; do
  if curl -s --max-time 1 "http://localhost:$port" > /dev/null 2>&1; then
    DEV_SERVER="http://localhost:$port"
    break
  fi
done
```

If no dev server detected:
```
No dev server found on ports 3000, 5173, 8080, 4000.

Options:
1. Start your dev server (npm run dev / bun dev)
2. Specify custom port
3. Continue without screenshots
```

---

### Phase 1: Make Visual Change

Execute the requested style/visual change:

1. Read the target component
2. Load `grimoires/artisan/taste.md` for context (if exists)
3. Load `grimoires/artisan/inspiration/direction.md` for constraints
4. Apply the change
5. Save the file

---

### Phase 2: Capture Screenshot

After style change, capture the visual result:

```bash
# Open dev server page
agent-browser open $DEV_SERVER --headed

# Wait for render
agent-browser wait --load networkidle

# Take screenshot
agent-browser screenshot grimoires/artisan/screenshots/{component}-{timestamp}.png

# Close browser
agent-browser close
```

**Screenshot naming:**
```
grimoires/artisan/screenshots/
├── Card-20260204-143022.png
├── Button-20260204-143045.png
└── Sidebar-20260204-143112.png
```

**If agent-browser not installed:**
```
agent-browser not found.

Install with: npm install -g agent-browser && agent-browser install

Or continue without screenshots (less effective iteration).
```

---

### Phase 3: Active Feedback Request

**CRITICAL: Always ask for feedback after visual changes.**

Present the screenshot and request feedback using AskUserQuestion:

```json
{
  "questions": [{
    "question": "Here's the updated component. How does it look?",
    "header": "Visual Check",
    "multiSelect": false,
    "options": [
      {
        "label": "Looks good",
        "description": "Continue to next change"
      },
      {
        "label": "Something's off",
        "description": "I'll help you identify what"
      },
      {
        "label": "Let me annotate",
        "description": "Use Agentation to point precisely"
      },
      {
        "label": "Show alternatives",
        "description": "Generate variation ideas"
      }
    ]
  }]
}
```

---

### Phase 3.5: Log Feedback (NEW in v1.2.0)

**Log every feedback interaction for pattern detection.**

```bash
log_feedback() {
  local feedback="$1"
  local context="$2"
  local resolution="${3:-}"

  local log_dir="grimoires/artisan/feedback"
  local log_file="${log_dir}/$(date +%Y-%m-%d).jsonl"
  local session_id="${ARTISAN_SESSION_ID:-$(date +%s | sha256sum | cut -c1-8)}"

  mkdir -p "$log_dir"

  local entry="{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"session_id\":\"${session_id}\",\"skill\":\"iterating-visuals\",\"feedback\":\"${feedback}\",\"context\":${context}"

  if [[ -n "$resolution" ]]; then
    entry="${entry},\"resolution\":\"${resolution}\"}"
  else
    entry="${entry}}"
  fi

  echo "$entry" >> "$log_file"
}
```

**Log after each feedback response:**

```bash
# After "Looks good"
log_feedback "looks_good" "{\"change\":\"${change}\",\"component\":\"${component}\"}"

# After "Something's off"
log_feedback "something_off" "{\"component\":\"${component}\"}"

# After resolution applied
log_feedback "resolved" "{\"component\":\"${component}\"}" "${old_value}→${new_value}"
```

---

### Phase 4: Process Feedback

Based on user response:

#### "Looks good"
- Log feedback: `log_feedback "looks_good" ...`
- Continue to next requested change
- Log successful pattern for taste learning

#### "Something's off"
- Invoke decomposition questions:
  ```
  Let me help identify what's off.

  Is it:
  1. The spacing? (padding, margins, gaps)
  2. The color? (palette, contrast)
  3. The hierarchy? (typography, weight)
  4. The motion? (animation, transitions)
  5. The density? (too much/little info)
  ```
- Based on answer, propose specific fix
- If pattern emerges, offer to add to taste.md

#### "Let me annotate"
- Provide Agentation instructions:
  ```
  To annotate precisely:

  1. If not installed: npm install agentation -D
  2. Add <Agentation /> to your app
  3. Click the bottom-right UI to activate
  4. Click/highlight the problematic element
  5. Copy the markdown output
  6. Paste it here

  I'll parse the selectors and map to code.
  ```
- When user pastes annotation, parse and apply fix

#### "Show alternatives"
- Generate 2-3 text-based variations:
  ```
  Alternatives based on your direction.md:

  A) More Stripe-like:
     - Increase padding to p-6
     - Reduce shadow to shadow-sm
     - Add subtle border

  B) More Linear-like:
     - Tighten padding to p-3
     - Remove shadow entirely
     - Use border-subtle

  C) Middle ground:
     - Keep current padding
     - Adjust shadow to shadow-xs

  Which direction feels closer?
  ```

---

### Phase 5: Refine and Loop

Apply the fix based on feedback, then return to Phase 2 (capture screenshot).

Loop continues until user says "Looks good" or explicitly ends iteration.

---

### Phase 6: Compound Learning

After iteration completes, check for taste learning opportunities:

```
During this session, I noticed you:
- Preferred shadow-sm over shadow-md (3 times)
- Chose p-6 over p-4 (2 times)

Add these preferences to taste.md?

[Y]es - Update taste.md
[N]o - This was context-specific
```

If yes, update taste.md and create evolution snapshot.

---

## Protocol: Design Iteration Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                    DESIGN ITERATION LOOP                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. CHANGE ───► 2. CAPTURE ───► 3. ASK ───► 4. RECEIVE         │
│       │              │              │              │             │
│       ▼              ▼              ▼              ▼             │
│   [Edit code]   [Screenshot]  [Feedback    [Process           │
│                               prompt]      response]           │
│                                                │                 │
│                                                ▼                 │
│   7. COMPOUND ◄── 6. TASTE? ◄── 5. REFINE ◄──┘                │
│       │                                                         │
│       │   Pattern     If user says    Apply fix                 │
│       │   emerges?    "looks good"    based on                  │
│       │                               feedback                  │
│       ▼                                                         │
│   [Update                                                       │
│   taste.md]                                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example Session

```
User: "Make the card feel more premium"

AI: [Reads direction.md: premium = spacious, subtle shadows]
AI: [Edits Card.tsx: p-4 → p-6, shadow-md → shadow-sm]
AI: [Runs agent-browser screenshot]
AI: "Here's the updated card. Added generous padding and subtle
     shadow based on your 'premium' direction. How does it look?"

User: [Selects "Something's off"]

AI: "Is it the spacing, color, hierarchy, motion, or density?"

User: "The shadow is still too heavy"

AI: [Edits Card.tsx: shadow-sm → shadow-xs]
AI: [Takes another screenshot]
AI: "Reduced to shadow-xs. How about now?"

User: [Selects "Looks good"]

AI: "Great! I noticed you preferred shadow-xs over shadow-sm.
     Add to taste.md as a preference?"

User: "Yes"

AI: [Updates taste.md, creates evolution snapshot]
```

---

## Output Format

```
═══════════════════════════════════════════════════════════════
DESIGN ITERATION: Card.tsx
═══════════════════════════════════════════════════════════════

Change #1:
├── Applied: p-4 → p-6 (premium spacing)
├── Applied: shadow-md → shadow-sm (subtle elevation)
├── Screenshot: grimoires/artisan/screenshots/Card-20260204-143022.png
└── Feedback: "Shadow still too heavy"

Change #2:
├── Applied: shadow-sm → shadow-xs
├── Screenshot: grimoires/artisan/screenshots/Card-20260204-143045.png
└── Feedback: "Looks good"

Session Summary:
├── Total iterations: 2
├── Taste learned: shadow-xs preferred over shadow-sm
└── taste.md updated: Yes

═══════════════════════════════════════════════════════════════
```

---

## Error Handling

| Error | Resolution |
|-------|------------|
| No dev server | Prompt to start, or continue without screenshots |
| agent-browser not installed | Provide install command |
| Screenshot fails | Retry once, then continue with note |
| No direction.md | Use taste.md only, or proceed without constraints |

---

## Related Skills

- `/synthesize` - Extract taste from references
- `/inscribe` - Apply taste to components
- `/decompose` - Convert vague feedback to specifics (Sprint 3)

---

## Configuration

Add to `.loa.config.yaml`:

```yaml
artisan:
  iterate_visuals:
    auto_screenshot: true
    dev_server_ports: [3000, 5173, 8080, 4000]
    screenshot_dir: grimoires/artisan/screenshots
    taste_learning: true
```
