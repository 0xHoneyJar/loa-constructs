---
name: envisioning-direction
description: Interactive design direction through visual reference capture and tension resolution. Use when starting a new project or refining design direction.
user-invocable: true
aliases: [envision]
allowed-tools: Read, Write, Glob, Grep, Edit, Bash, AskUserQuestion
---

# Envisioning Direction

Interactive design direction conversation that captures visual references and resolves tensions to generate a coherent design vision.

## Trigger

```
/envision                          # Start new direction capture
/envision stripe.com linear.app    # With initial reference URLs
/envision --refine                 # Refine existing direction
/envision --clear                  # Clear and start fresh
```

## Overview

This skill helps artists and developers **visualize and convey** their design direction through adaptive conversation, not template editing.

```
REFERENCES → CAPTURE → ANALYZE → RESOLVE → SYNTHESIZE → GENERATE
```

## Prerequisites

1. **agent-browser** (optional but recommended): `npm install -g agent-browser && agent-browser install`
2. **Inspiration folder**: `grimoires/artisan/inspiration/` (created by Artisan pack)

## Workflow

### Phase 0: Mode Detection

Check command flags and existing state:

| Flag | Behavior |
|------|----------|
| (none) | Start fresh or continue if direction.md exists |
| `--refine` | Load existing direction.md, add to it |
| `--clear` | Delete existing direction.md, start fresh |

Check for existing moodboard:
```bash
existing_screenshots=$(ls grimoires/artisan/inspiration/moodboard/*.png 2>/dev/null | wc -l)
```

---

### Phase 1: Reference Collection

If no URLs provided in command, prompt for input method:

```json
{
  "questions": [{
    "question": "What sites or apps inspire your design direction?",
    "header": "References",
    "multiSelect": false,
    "options": [
      {
        "label": "Let me type URLs",
        "description": "I'll provide specific site URLs (e.g., stripe.com)"
      },
      {
        "label": "Describe verbally",
        "description": "I'll describe the aesthetic I want in words"
      },
      {
        "label": "Use existing moodboard",
        "description": "Analyze screenshots already in moodboard/"
      }
    ]
  }]
}
```

**If "Let me type URLs"**: Ask user to provide URLs, then parse and validate.

**If "Describe verbally"**: Record description, skip screenshot capture.

**If "Use existing moodboard"**: Skip to Phase 3 using existing screenshots.

---

### Phase 2: Screenshot Capture

For each URL provided, capture a screenshot:

```bash
# Check if agent-browser is available
if ! command -v agent-browser &> /dev/null; then
  echo "agent-browser not found."
  echo "Install with: npm install -g agent-browser && agent-browser install"
  echo ""
  echo "Continuing without screenshots (text analysis only)..."
  SCREENSHOT_ENABLED=false
else
  SCREENSHOT_ENABLED=true
fi

# For each URL (disable globbing and split safely)
set -f
read -r -a url_list <<< "$urls"
set +f

for url in "${url_list[@]}"; do
  # Normalize URL scheme
  if [[ "$url" =~ ^https?:// ]]; then
    full_url="$url"
  else
    full_url="https://$url"
  fi

  # Basic URL validation
  if ! [[ "$full_url" =~ ^https?://[A-Za-z0-9.-]+ ]]; then
    echo "Invalid URL: $url - skipping"
    continue
  fi

  # Sanitize filename (strip scheme first)
  sanitized=$(echo "$full_url" | sed 's~https\?://~~' | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]')
  timestamp=$(date +%Y%m%d-%H%M%S)
  output_path="grimoires/artisan/inspiration/moodboard/${sanitized}-${timestamp}.png"

  # Capture
  agent-browser open "$full_url" --headed
  agent-browser wait --load networkidle
  agent-browser screenshot "$output_path"
  agent-browser close

  echo "Captured: $output_path"
done
```

**Error Handling**:
- URL unreachable: Skip, warn, continue with others
- Screenshot fails: Retry once, then skip with warning
- All URLs fail: Continue with text-only analysis

---

### Phase 3: Pattern Analysis

Read all moodboard screenshots and analyze visual patterns:

**Analysis Dimensions**:

| Dimension | What to Look For |
|-----------|------------------|
| Spacing | Padding, margins, whitespace (generous vs tight) |
| Color | Palette (muted vs vibrant), contrast, gradients |
| Typography | Font families, weights, sizes, line-height |
| Motion | Animations, transitions (subtle vs bold) |
| Density | Information density (sparse vs packed) |
| Corners | Border radius (sharp vs rounded) |
| Elevation | Shadows, depth (flat vs layered) |

**Output Structure**:

```markdown
## Pattern Analysis

### Common Patterns (appear in 2+ references)
- Generous whitespace (p-6+)
- Muted color palette
- Sans-serif typography

### Tensions Detected
1. **Spacing**: Stripe uses generous padding, Linear is dense
2. **Corners**: Stripe is rounded, Vercel is sharp

### Absent Patterns (not in any reference)
- Gradients
- Playful illustrations
- Heavy shadows
```

---

### Phase 4: Tension Resolution

For each detected tension, ask a targeted question:

**Example: Spacing Tension**

```json
{
  "questions": [{
    "question": "I see tension in spacing between your references. Which direction for your design?",
    "header": "Spacing",
    "multiSelect": false,
    "options": [
      {
        "label": "Spacious (Stripe)",
        "description": "Generous whitespace, breathing room"
      },
      {
        "label": "Dense (Linear)",
        "description": "Efficient, compact layout"
      },
      {
        "label": "Hybrid",
        "description": "Spacious containers, dense content"
      },
      {
        "label": "Context-dependent",
        "description": "Different rules for different areas"
      }
    ]
  }]
}
```

**Skip resolution if**:
- No tensions detected
- User chose "Use existing moodboard" and direction.md already exists with --refine

---

### Phase 5: Direction Synthesis

Combine analysis and resolutions into coherent direction:

**Algorithm**:
1. Common patterns → "We Want" (these define core identity)
2. Absent patterns → "We Avoid" (these are anti-patterns)
3. Resolved tensions → "Key Tensions" with chosen resolutions
4. Generate "Core Vision" summary from patterns + resolutions

---

### Phase 6: Artifact Generation

Generate two output files:

**grimoires/artisan/inspiration/direction.md**:

```markdown
# Design Direction

## Core Vision

{Synthesized vision statement based on patterns and resolutions}

## We Want

| Attribute | Description | Source |
|-----------|-------------|--------|
| {pattern} | {description} | {reference} |

## We Avoid

| Attribute | Description | Why |
|-----------|-------------|-----|
| {anti-pattern} | {description} | {reason} |

## Key Tensions (Resolved)

| Tension | Resolution |
|---------|------------|
| {dimension} | {chosen direction} |

## Priority Rules

When attributes conflict:
1. {rule based on resolutions}
2. {rule based on resolutions}

---

*Generated by /envision on {date}*
*References: {url list}*
*Run /envision --refine to update*
```

**grimoires/artisan/inspiration/references.md**:

```markdown
# Visual References

## Source Analysis

### {reference_name}

**URL**: {url}
**Screenshot**: moodboard/{filename}.png

**Patterns Observed**:
- **Spacing**: {analysis}
- **Color**: {analysis}
- **Typography**: {analysis}
- **Motion**: {analysis}
- **Density**: {analysis}

**Key Takeaways**:
- {what to borrow from this reference}

---

*Generated by /envision on {date}*
```

---

## Example Session

```
User: /envision stripe.com linear.app

AI: Let me capture screenshots from your references...
    [Captures stripe.com → moodboard/stripe-com-20260204-143022.png]
    [Captures linear.app → moodboard/linear-app-20260204-143045.png]

AI: Analyzing visual patterns...

    Common Patterns:
    - Sans-serif typography (both)
    - Confident CTAs with clear hierarchy (both)
    - Subtle animations (both)

    Tensions Detected:
    - Spacing: Stripe is very spacious, Linear is dense

User: [Selects "Hybrid" for spacing]

AI: Got it - spacious containers with dense content.

    Generating direction...

    ═══════════════════════════════════════════════════════════════
    DESIGN DIRECTION GENERATED
    ═══════════════════════════════════════════════════════════════

    Core Vision:
    Premium efficiency - the spaciousness of Stripe with the
    information density of Linear, achieved through generous
    container padding and tight content spacing.

    Files Created:
    ├── grimoires/artisan/inspiration/direction.md
    ├── grimoires/artisan/inspiration/references.md
    └── grimoires/artisan/inspiration/moodboard/
        ├── stripe-com-20260204-143022.png
        └── linear-app-20260204-143045.png

    Run /envision --refine to update your direction.
    ═══════════════════════════════════════════════════════════════
```

---

## Output Format

```
═══════════════════════════════════════════════════════════════
ENVISIONING DIRECTION
═══════════════════════════════════════════════════════════════

Mode: {new | refine | clear}
References: {url list}

Capture:
├── {url}: ✓ Captured
├── {url}: ✓ Captured
└── {url}: ✗ Failed (skipped)

Analysis:
├── Common patterns: {count}
├── Tensions detected: {count}
└── Tensions resolved: {count}

Output:
├── direction.md: Generated
├── references.md: Generated
└── moodboard/: {count} screenshots

═══════════════════════════════════════════════════════════════
```

---

## Error Handling

| Error | Resolution |
|-------|------------|
| agent-browser not installed | Warn, offer install command, continue with text-only |
| URL unreachable | Skip, warn, continue with others |
| Screenshot fails | Retry once, then skip with warning |
| All URLs fail | Abort with guidance |
| No tensions detected | Skip resolution, use defaults |
| No common patterns | Warn, generate minimal direction |

---

## Configuration

Add to `.loa.config.yaml`:

```yaml
artisan:
  envision:
    auto_capture: true
    headed_mode: true          # Show browser during capture
    wait_strategy: networkidle # or "load", "domcontentloaded"
    screenshot_format: png
```

---

## Related Skills

- `/synthesize` - Extract taste tokens from code (different from /envision which captures direction)
- `/inscribe` - Apply taste tokens to components
- `/iterate-visual` - Design iteration loop (uses direction.md for context)
