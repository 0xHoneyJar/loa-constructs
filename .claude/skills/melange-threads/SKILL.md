# Melange Threads Skill

## Purpose

Display a dashboard of all Melange threads across the org, organized by status.
Enables quick visibility into what's blocked, what needs attention, and what's been resolved.

## Invocation

```
/threads
/threads --mine
/threads --blocked
/threads --resolved
/threads --sync
```

## Workflow

### Phase 1: Read Configuration

1. **Read construct identity** from `.loa.config.yaml`:
   ```yaml
   construct:
     name: loa-constructs
     operator: soju
     repo: 0xHoneyJar/loa-constructs
     org: 0xHoneyJar
   ```

2. **Validate configuration** - error if missing:
   ```
   Error: Construct identity not configured.
   Add construct block to .loa.config.yaml
   ```

### Phase 2: Load or Sync Cache

1. **Check cache file**: `grimoires/loa/melange/threads.json`

2. **Check cache freshness** (5-minute threshold):
   - If `last_sync` is null OR older than 5 minutes → sync required
   - If `--sync` flag provided → force sync
   - Otherwise → use cached data

3. **If sync required**, query GitHub:
   ```bash
   gh issue list \
     --search "org:{org} label:melange is:open" \
     --json number,title,labels,repository,createdAt,body,comments \
     --limit 100
   ```

4. **Parse each Issue**:
   - Extract `from` field from body: `/### From.*\n\n(.+)/i`
   - Extract `to` field from body: `/### To.*\n\n(\w+)/i`
   - Extract `impact` from labels: `impact:game-changing`, `impact:important`, `impact:nice-to-have`
   - Extract `intent` from labels: `intent:request`, `intent:ask`, `intent:report`
   - Extract `status` from labels: `status:open`, `status:accepted`, `status:blocked`, etc.
   - Determine `direction`: if `to` matches construct → "received", else → "sent"

5. **Update cache** with new data and timestamp

### Phase 3: Categorize Threads

Sort threads into categories:

| Category | Criteria | Icon |
|----------|----------|------|
| **BLOCKED** | Has `status:blocked` label AND sent by this construct | ⏳ |
| **AWAITING RESPONSE** | Sent by this construct, `status:open`, no response | 📬 |
| **NEEDS TRIAGE** | Addressed to this construct, `status:open` | 📥 |
| **IN PROGRESS** | Has `status:accepted` label | ✅ |
| **RESOLVED** | Has `status:resolved` OR closed in last 7 days | 🎉 |

**Sorting within categories**:
1. Impact: game-changing first, then important, then nice-to-have
2. Date: oldest first (needs attention soonest)

### Phase 4: Apply Filters

If flags provided, filter before rendering:

| Flag | Filter Logic |
|------|--------------|
| `--mine` | Keep threads where `from` OR `to` matches construct |
| `--blocked` | Keep only BLOCKED category |
| `--resolved` | Keep only RESOLVED category (expand to 30 days) |

### Phase 5: Render Dashboard

Use plain text with markdown tables for reliable terminal rendering.

**Impact Emojis**:
- game-changing: 🔴
- important: 🟡
- nice-to-have: 🟢

**Dashboard Template**:

```
MELANGE THREADS DASHBOARD
{construct_name}
────────────────────────────────────────

Active: {n}    Blocked: {n}    Resolved (7d): {n}

⏳ BLOCKED ({n})
   (none)

📬 SENT - AWAITING RESPONSE ({n})

| # | Thread | To | Impact | Age |
|---|--------|-----|--------|-----|
| 1 | #{n} {title} | {to} | {emoji} {impact} | {duration} |
| 2 | #{n} {title} | {to} | {emoji} {impact} | {duration} |

📥 RECEIVED - NEEDS TRIAGE ({n})

| # | Thread | From | Impact | Age |
|---|--------|------|--------|-----|
| 1 | #{n} {title} | {from} | {emoji} {impact} | {duration} |

✅ IN PROGRESS ({n})
   (none)

```

**Empty State**:
```
MELANGE THREADS DASHBOARD
{construct_name}
────────────────────────────────────────

✨ No active Melange threads

Use /send to start a conversation with another construct
```

### Phase 6: Interactive Mode (Optional)

After displaying the dashboard, use `AskUserQuestion` to prompt for next action:

```json
{
  "questions": [{
    "question": "What would you like to do?",
    "header": "Action",
    "options": [
      { "label": "Triage received", "description": "Open /inbox to process incoming Issues" },
      { "label": "View thread details", "description": "See full details of a specific thread" },
      { "label": "Done", "description": "Close dashboard" }
    ],
    "multiSelect": false
  }]
}
```

**If "View thread details" selected**, follow up with thread selection:

```json
{
  "questions": [{
    "question": "Which thread do you want to view?",
    "header": "Thread",
    "options": [
      { "label": "#26 Testing targeted mentions", "description": "To: sigil • 🟡 important • 2h ago" },
      { "label": "#25 Testing CLI integration", "description": "To: loa • 🟢 nice-to-have • 2h ago" }
    ],
    "multiSelect": false
  }]
}
```

**After viewing thread**, offer actions:

```json
{
  "questions": [{
    "question": "What would you like to do with this thread?",
    "header": "Action",
    "options": [
      { "label": "Open in browser", "description": "View full Issue on GitHub" },
      { "label": "Back to dashboard", "description": "Return to thread list" },
      { "label": "Done", "description": "Close dashboard" }
    ],
    "multiSelect": false
  }]
}
```

**Note**: The dashboard display is always shown first. Interactive prompts only appear when there are actionable items.

## Duration Formatting

| Range | Format | Example |
|-------|--------|---------|
| < 1 hour | "Nm" | "45m" |
| < 24 hours | "Nh" | "3h" |
| < 7 days | "Nd" | "2d" |
| >= 7 days | "Nw" | "2w" |

## Title Truncation

- Maximum title length: 40 characters
- If longer, truncate with "..."
- Remove "[Melange] " prefix if present

## Error Handling

| Error | Resolution |
|-------|------------|
| No threads found | Show "No active Melange threads" empty state |
| Cache file missing | Create empty cache, sync from GitHub |
| GitHub API fails | Show cached data with "⚠ Cached data (sync failed)" warning |
| Rate limited | Show cached data, note "Sync unavailable (rate limited)" |
| Construct not configured | Show config error with example |

## Cache File Schema

**File**: `grimoires/loa/melange/threads.json`

See `resources/schema.json` for full JSON Schema.

```json
{
  "$schema": "threads-v1",
  "last_sync": "2026-01-23T12:00:00Z",
  "construct": "loa-constructs",
  "threads": [
    {
      "id": "0xHoneyJar/sigil#42",
      "repo": "0xHoneyJar/sigil",
      "number": 42,
      "title": "Auth tokens expire during long sessions",
      "from": "jani@loa",
      "to": "sigil",
      "impact": "game-changing",
      "intent": "request",
      "status": "accepted",
      "direction": "received",
      "created_at": "2026-01-22T10:00:00Z",
      "updated_at": "2026-01-22T11:00:00Z",
      "accepted_at": "2026-01-22T11:00:00Z",
      "resolution_pr": null,
      "blocked": false,
      "comments": 3
    }
  ],
  "blocked": [
    {
      "id": "0xHoneyJar/loa#38",
      "blocked_at": "2026-01-23T09:00:00Z",
      "waiting_on": "loa"
    }
  ]
}
```

## HITL Requirements

The dashboard is **read-only** and informational. No HITL required for viewing.

For actions (triage, navigation), the skill announces intent and either:
- Transitions to another skill (e.g., `/inbox`)
- Opens browser (user can cancel)

## Related

- `/send` - Send new Melange feedback
- `/inbox` - Triage incoming Melange feedback
- Melange Protocol documentation in `melange/` directory
