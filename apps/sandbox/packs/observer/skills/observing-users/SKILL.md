---
name: observing-users
description: Capture user feedback as hypothesis-first research using Level 3 diagnostic. Forms theories (not conclusions) from quotes.
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Edit
---

# Observing Users

Capture user feedback as structured diagnostic observations using the Level 3 framework. Create or update individual user research canvases from feedback quotes.

---

## Core Principle

**Hypothesize, don't conclude.**

One quote = one data point. Never:
- Classify users into "types" from usernames or single quotes
- Claim to know their Level 3 goal (form hypotheses instead)
- Treat future promises as commitments

Always:
- Flag confidence levels explicitly
- Note what we DON'T know
- Generate frameworks for deeper conversation, not assumptions

---

## Triggers

```
/observe @{username} "{quote}"
/observe @{username} "{quote}" --context "{source}"
/observe @{username} --annotate              # Fetch Agentation annotations as research evidence
```

**Examples:**
```bash
/observe @papa-flavio "planning henlo burns"
/observe @tchallason "realtime harvesting counter" --context "Discord #feedback"
/observe @beta-tester --annotate             # Requires agentation MCP server
```

---

## The Three Levels

| Level | Question | Example | Value |
|-------|----------|---------|-------|
| **Level 1** | What did they say? | "Rewards aren't updating" | Surface symptom |
| **Level 2** | What do they want? | "I want to see my rewards" | Stated desire |
| **Level 3** | What are they trying to accomplish? | "Decide when to burn based on accumulation" | Actionable truth |

**Always dig to Level 3.** Level 1-2 lead to building the wrong thing.

---

## When to Use

- User reports an issue or request
- Feedback appears in Discord/Telegram/support channels
- You notice behavioral patterns worth investigating
- Before building features based on user requests

---

## Workflow

### Step 1: Parse Arguments

Extract from command:
- `username`: Target user (required)
- `quote`: Exact user quote (required)
- `context`: Source/channel (optional, default: "direct feedback")

### Step 2: Load or Create Canvas

Check if canvas exists:
```bash
grimoires/observer/canvas/{username}-canvas.md
```

**If exists**: Read current canvas, prepare to append
**If not exists**: Create new canvas with template

### Step 3: Apply Level 3 Diagnostic Framework

```
Quote → Level 1 (What they said)
      → Level 2 (What they want)
      → Level 3 Hypothesis (What they might be trying to accomplish)
```

**Analyze the quote to extract:**

1. **User Profile** (if new canvas):
   - Signals Observed (behavioral evidence only)
   - Theories (possible interpretations - NOT conclusions)
   - Confidence: Low | Medium (never High from single quote)
   - Unknown (what we can't determine)
   - Stakes (what they have invested, if mentioned)

2. **Level 3 Hypothesis**:
   - What might they be trying to accomplish?
   - Quote anchor (exact words that led to theory)
   - Alternative interpretations
   - What would validate / invalidate

3. **Future Promises** (if detected):
   - Flag any "will", "would", "later", "tomorrow" statements
   - Add to Promise table for follow-up tracking

4. **Journey Fragment** (if applicable):
   - Trigger → Action → Expected → Actual → Emotion

5. **Expectation Gap** (if discovered):
   - Expected vs Actual mismatch
   - Gap type: Bug | Feature | Discoverability

### Step 4: Update Canvas

**New Canvas Template:**
```markdown
---
type: user-canvas
user: {username}
created: {timestamp}
updated: {timestamp}
linked_journeys: []
linked_observations: []
status: active
---

# {username} Canvas

## User Profile

| Field | Value |
|-------|-------|
| **Signals Observed** | {behavioral signals from quote} |
| **Theories** | {possible interpretations - NOT conclusions} |
| **Confidence** | Low / Medium |
| **Unknown** | {what we cannot determine from this quote} |
| **Stakes** | {what they have invested, if mentioned} |

---

## Level 3 Hypotheses

### Hypothesis 1: {theory about what they might be trying to accomplish}
- **Quote anchor**: "{exact words that led to this theory}"
- **Alternative interpretations**: {other valid readings of this quote}
- **Confidence**: Low | Medium
- **What would validate**: {observable behavior or statement that confirms}
- **What would invalidate**: {observable behavior or statement that disproves}

---

## Future Promises (Unvalidated)

| Promise | Date | Follow-up Trigger |
|---------|------|-------------------|
| {quoted promise} | {date} | {condition for follow-up} |

---

## Journey Fragments

| Trigger | Action | Expected | Actual | Emotion |
|---------|--------|----------|--------|---------|
| {if applicable} | | | | |

---

## Expectation Gaps

| Expected | Actual | Source | Resolution |
|----------|--------|--------|------------|

---

## Conversation Frameworks

When this user returns, anchor on their words:

**If they mention [{topic from quote}]:**
- Opener: "You mentioned [exact words]. How did that go?"
- Dig deeper: "Walk me through what happened."
- Past behavior: "When was the last time you [action]?"

**Red flags to listen for:**
- Future promises ("I would...", "I might...")
- Opinion without behavior ("That sounds useful")
- Compliments without specifics

---

## Quotes Library

> "{quote}" — {context}, {date}
```

**Existing Canvas Update:**
- Append to Level 3 Hypotheses if new hypothesis detected
- Append to Quotes Library
- Update `updated` timestamp in frontmatter
- Add to Future Promises if promise language detected
- Add Journey Fragment if quote contains flow information
- Add Expectation Gap if mismatch detected
- Update Conversation Frameworks with new anchors

### Step 5: Generate Conversation Frameworks

Create contextual follow-up frameworks (NOT template questions):

**Anchor to their words:**
- Use exact phrases from their quotes
- Reference specific topics they mentioned

**Structure:**
```markdown
**If they mention [{topic}]:**
- Opener: "You mentioned [their words]. How did that go?"
- Dig deeper: "Walk me through what happened."
- Past behavior: "When was the last time you [action]?"
```

For detailed framework patterns, see [conversation-frameworks.md](conversation-frameworks.md).

### Step 6: Link Existing Observations

Check for existing observations:
```bash
grimoires/artisan/observations/{username}-*.md
```

If found, add to `linked_observations` in frontmatter.

### Step 7: Update Laboratory State

Update `grimoires/observer/state.yaml`:
```yaml
active:
  phase: discovery
  canvas: {username}

canvases:
  {username}:
    created: {timestamp}
    updated: {timestamp}
    quotes_count: {n}
    hypotheses_count: {n}
    linked_journeys: []

queue:
  pending_synthesis:
    - {username}
```

### Step 8: Report Output

Display summary to user:

```
✓ Canvas updated: grimoires/observer/canvas/{username}-canvas.md

Level 3 Hypothesis Extracted:
  "{summarized hypothesis}"
  Confidence: Low | Medium
  Unknown: {what we don't know}

Canvas Status:
  - Quotes: {n}
  - Hypotheses: {n}
  - Promises Tracked: {n}

Next Steps:
  - Add more quotes: /observe @{username} "..."
  - Shape journeys: /shape --run
```

---

## Canvas Template Reference

```yaml
---
type: user-canvas
user: {username}
created: {ISO timestamp}
updated: {ISO timestamp}
linked_journeys: []
linked_observations: []
status: active | archived
---
```

**Sections:**
1. User Profile (signals, theories, confidence, unknown, stakes)
2. Level 3 Hypotheses (hypotheses with validation criteria)
3. Future Promises (unvalidated commitments to track)
4. Journey Fragments (trigger → action → expected → actual → emotion)
5. Expectation Gaps (expected vs actual mismatches)
6. Conversation Frameworks (anchored follow-up patterns)
7. Quotes Library (raw quotes with context)

---

## Reference Material

For detailed guidance, see these supporting files:

- [Cultural Context (Berachain/Crypto)](cultural-context.md) - Signal patterns, what NOT to infer from usernames
- [Conversation Frameworks](conversation-frameworks.md) - Mom Test principles, red/green flags, promise detection
- [Complete Example](examples/complete-diagnostic.md) - Full diagnostic walkthrough with new format

---

## Signal Patterns

Behavioral signals that may indicate user intent (use as hypotheses, not classifications):

| Signal Pattern | Possible Interpretation | Confidence Limit |
|----------------|------------------------|------------------|
| "planning", "deciding" | May be optimizing timing | Low-Medium |
| "checking", "verify" | May be validating expectations | Low |
| "API", "integrate" | May want programmatic access | Low-Medium |
| "trying", "wondering" | Exploring, not committed | Low |

**Important**: These are hypothesis generators, not type classifiers. See [cultural-context.md](cultural-context.md) for what NOT to infer.

---

## Promise Detection

Flag these signal words and add to Future Promises table:

| Category | Signal Words |
|----------|--------------|
| Future intent | will, would, might, going to, plan to |
| Temporal | later, tomorrow, soon, eventually |
| Conditional | if I..., when I..., once I... |
| Hedged | probably, maybe, I think I'll |

**Note**: Insights are synthesized only after validation, not from initial quotes.

## Counterfactuals — User Research Methodology

### The Target (What We Do)

Create hypothesis-first canvases from user feedback. Start with Level 3 diagnostic (what is the user's actual goal?) before recording. Each canvas contains raw quotes, a hypothesis about the underlying goal, and explicit confidence levels. Observations feed future validation — never conclusions.

```yaml
# Target: Hypothesis-first canvas
canvas:
  user: papa-flavio
  hypothesis: "User wants to optimize reward timing for maximum yield"
  confidence: low  # Only 1 data point
  level_3_goal: "Maximize returns with minimal active management"
  quotes:
    - text: "planning henlo burns"
      source: discord
      date: 2026-01-15
  promises: []  # No conclusions yet
```

### The Near Miss — Conclusion-First Recording (Seductively Close, But Wrong)

**What it looks like:** Recording feedback with immediate conclusions — "the user wants X" — without hypothesis framing or confidence calibration.

```yaml
# Near Miss: Conclusion-first canvas
canvas:
  user: papa-flavio
  finding: "User wants to burn HENLO tokens"  # Conclusion, not hypothesis
  action_item: "Add HENLO burn feature"        # Premature action
  quotes:
    - text: "planning henlo burns"
      source: discord
```

**Why it's tempting:** The quote seems clear. "Planning henlo burns" appears to directly state intent. Drawing conclusions feels productive — it creates actionable items for the product team.

**Physics of Error:** *Concept Impermanence* — Single quotes are ambiguous. "Planning henlo burns" could mean: planning to burn HENLO tokens, planning a HENLO community event ("burns" as slang), or discussing someone else's plans. Conclusion-first recording locks in one interpretation before gathering corroborating evidence. The canvas becomes evidence FOR the conclusion rather than a container for hypotheses. Subsequent observations get filtered through confirmation bias — quotes that support the conclusion are recorded, contradictory signals are ignored.

**Detection signal:** Canvas with "finding" or "conclusion" instead of "hypothesis"; missing confidence level; action items present before 3+ corroborating quotes; no Level 3 diagnostic.

### The Category Error — Aggregated Sentiment Analysis (Fundamentally Wrong)

**What it looks like:** Collecting feedback and running sentiment analysis to determine "what users feel" about features.

```yaml
# Category Error: Sentiment-based research
analysis:
  feature: "rewards"
  positive_mentions: 45
  negative_mentions: 12
  sentiment_score: 0.79
  recommendation: "Users are generally positive about rewards"
```

**Why someone might try it:** Sentiment analysis is quantitative, scalable, and produces clean metrics. It feels scientific. NLP tools can process thousands of messages automatically.

**Physics of Error:** *Semantic Collapse* — Sentiment analysis destroys the diagnostic signal. "I love the rewards but can never figure out when to claim" scores positive but contains a critical usability failure. "This sucks, fix the timing" scores negative but identifies the exact issue. Aggregating sentiment collapses individual user goals (Level 3) into a single scalar that cannot inform design decisions. This CANNOT produce useful research because user goals are not emotions — they are behaviors with context, constraints, and mental models that sentiment polarity cannot represent.

**Bridgebuilder action:** Immediate rejection. Regenerate from Target using hypothesis-first canvases with individual quote attribution.

---

## Integration Points

- **shaping-journeys**: Canvases feed into journey synthesis
- **Laboratory state**: Updates `state.yaml` for cross-session tracking
- **level-3-diagnostic**: Uses same diagnostic framework

---

## Validation

After canvas update:
- [ ] YAML frontmatter is valid
- [ ] Quote preserved exactly
- [ ] Level 3 hypothesis extracted (not asserted as goal)
- [ ] Confidence level explicit (Low or Medium)
- [ ] Unknown field populated
- [ ] No user type classification from username
- [ ] State.yaml updated with canvas entry

---

## Error Handling

| Error | Resolution |
|-------|------------|
| No username provided | Prompt for @username |
| No quote provided | Prompt for quote in quotes |
| Canvas corrupted | Create backup, reinitialize |
| Observation link broken | Remove from linked_observations |

---

## Related

- `/shape` - Extract journeys from canvases
- `/diagram` - Generate diagrams from journeys
- `/craft` - Generate with observation context
- `/plan-and-analyze` - Full PRD discovery
