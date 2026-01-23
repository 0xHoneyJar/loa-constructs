# Melange Inbox Skill

## Purpose

Interactive triage of incoming Melange feedback. Presents each Issue with structured context and handles accept/decline/comment actions with human approval.

## Invocation

```
/inbox                    # Default: game-changing + important only
/inbox --all              # Include nice-to-have
/inbox --from sigil       # Filter to specific sender
/inbox --from sigil,loa   # Filter to multiple senders
```

## Workflow

### Phase 1: Read Configuration

Read construct identity from `.loa.config.yaml`:
```yaml
construct:
  name: loa-constructs
  operator: soju
  repo: 0xHoneyJar/loa-constructs
  org: 0xHoneyJar
```

### Phase 2: Query GitHub

Build and execute search query:

```bash
gh issue list \
  --search "org:{org} is:open label:melange label:to:{construct}" \
  --json number,title,labels,repository,createdAt,body \
  --limit 50
```

**If `--all` flag NOT set**, filter results to exclude `impact:nice-to-have`.

### Phase 2.5: Apply Sender Filter (if --from specified)

**If `--from` specified**, filter results by parsing the `From` field in Issue body:

1. Parse `--from` argument (comma-separated):
   ```
   --from sigil       → ["sigil"]
   --from sigil,loa   → ["sigil", "loa"]
   ```

2. For each Issue, extract sender from body:
   ```javascript
   const fromMatch = body.match(/### From.*\n\n(.+)/i);
   const senderConstruct = fromMatch ? fromMatch[1].split('@')[1]?.toLowerCase() : null;
   ```

3. Keep Issue only if `senderConstruct` is in the filter list

4. If no Issues match, display:
   ```
   📥 Inbox for {construct} (from: {filter})

   ✨ No Issues from {filter}
   ```

### Phase 3: Sort & Present Summary

**Sort order:**
1. `impact:game-changing` first
2. `impact:important` second
3. By `createdAt` (oldest first)

**Present summary:**
```
📥 Inbox for {construct} ({count} issues)

🔴 #{n} [game-changing] {from} → {construct}: "{title}"
🟡 #{n} [important] {from} → {construct}: "{title}"
...

Starting triage...
```

**If `--from` filter applied:**
```
📥 Inbox for {construct} (from: {filter}) ({count} issues)
```

**If empty:**
```
📥 Inbox for {construct}

✨ Inbox zero! No pending Melange Issues.
```

### Phase 4: Interactive Triage Loop

For each Issue in sorted order:

#### 4.1 Fetch Full Details

```bash
gh issue view {number} --repo {repo} --json body,comments,labels
```

#### 4.2 Parse Melange Fields

Extract from Issue body using regex patterns:

```javascript
// To construct
/### To \(Receiving Construct\)\s*\n\n(\w+)/i

// From operator
/### From \(Your Construct \+ Operator\)\s*\n\n(.+)/i

// Intent
/### Intent\s*\n\n(\w+)/i

// Impact
/### Impact\s*\n\n([\w-]+)/i

// Experience
/### What are you experiencing\?\s*\n\n([\s\S]*?)(?=\n###|$)/i

// Request
/### What would help\?\s*\n\n([\s\S]*?)(?=\n###|$)/i
```

#### 4.3 Present Structured View

```
─────────────────────────────────────────
{emoji} #{number}: {title}
From: {operator}@{from_construct}
Impact: {impact}
Intent: {intent}

Experience:
{experience}

Request:
{request}
─────────────────────────────────────────
```

#### 4.4 Prompt for Action

Use `AskUserQuestion`:
```json
{
  "questions": [{
    "question": "What action do you want to take on this Issue?",
    "header": "Action",
    "options": [
      { "label": "Accept", "description": "Commit to addressing this feedback" },
      { "label": "Decline", "description": "Decline with reason" },
      { "label": "Comment", "description": "Add a comment without status change" },
      { "label": "Skip", "description": "Move to next Issue" }
    ],
    "multiSelect": false
  }]
}
```

### Phase 5: Handle Actions

#### Accept

1. **Draft acceptance comment** based on the Issue content
2. **Show preview** and ask for approval:
   ```json
   {
     "questions": [{
       "question": "Post this acceptance comment?",
       "header": "Confirm",
       "options": [
         { "label": "Yes", "description": "Post as shown" },
         { "label": "Edit", "description": "Modify before posting" },
         { "label": "Cancel", "description": "Go back to action selection" }
       ],
       "multiSelect": false
     }]
   }
   ```
3. **Execute** (on approval):
   ```bash
   gh issue comment {number} --repo {repo} --body "{comment}"
   gh issue edit {number} --repo {repo} --add-label "status:accepted" --remove-label "status:open"
   ```
4. **Confirm**:
   ```
   ✓ Commented on #{number}
   ✓ Added label: status:accepted
   ✓ Removed label: status:open
   ```
5. **Track** in session stats: `accepted += 1`
6. **Update cache** (`grimoires/loa/melange/threads.json`):
   - Update thread status to `accepted`
   - Set `accepted_at` timestamp

#### Decline

1. **Ask for reason**:
   ```json
   {
     "questions": [{
       "question": "Why are you declining this feedback?",
       "header": "Reason",
       "options": [
         { "label": "Out of scope", "description": "Not relevant to this Construct" },
         { "label": "Won't fix", "description": "Intentional behavior or won't change" },
         { "label": "Duplicate", "description": "Already addressed or tracked elsewhere" },
         { "label": "Other", "description": "Provide custom reason" }
       ],
       "multiSelect": false
     }]
   }
   ```
2. **Draft decline comment** with reasoning
3. **Show preview** and ask for approval
4. **Execute** (on approval):
   ```bash
   gh issue comment {number} --repo {repo} --body "{comment}"
   gh issue edit {number} --repo {repo} --add-label "status:declined" --remove-label "status:open"
   gh issue close {number} --repo {repo}
   ```
5. **Confirm**:
   ```
   ✓ Commented on #{number}
   ✓ Added label: status:declined
   ✓ Closed Issue #{number}
   ```
6. **Track**: `declined += 1`
7. **Update cache** (`grimoires/loa/melange/threads.json`):
   - Update thread status to `declined`

#### Comment

1. **Ask for message** (free text input via AskUserQuestion with "Other")
2. **Draft response** based on user input
3. **Show preview** and ask for approval
4. **Execute** (on approval):
   ```bash
   gh issue comment {number} --repo {repo} --body "{comment}"
   ```
5. **Confirm**:
   ```
   ✓ Commented on #{number}
   ```
6. **Track**: `commented += 1`

#### Skip

1. **Track**: `skipped += 1`
2. Move to next Issue

#### Quit

1. Exit triage loop
2. Proceed to session summary

### Phase 6: Session Summary

```
─────────────────────────────────────────
Triage complete:
  Accepted: {accepted_count}
  Declined: {declined_count}
  Commented: {commented_count}
  Skipped: {skipped_count}

Remaining in inbox: {remaining_count}
─────────────────────────────────────────
```

If all processed and remaining is 0:
```
Inbox clear! 🎉
```

## Error Handling

| Error | Resolution |
|-------|------------|
| No Issues found | Show "Inbox zero" message |
| gh command fails | Show error, suggest checking auth with `gh auth status` |
| Issue already processed | Skip with note in log |
| Label update fails | Warn but continue triage |
| Network error | Retry once, then show error and continue |

## HITL Requirements

**Every action requires explicit human approval:**

- ✅ Action selection: User chooses
- ✅ Accept comment: User approves before posting
- ✅ Decline reason: User chooses
- ✅ Decline comment: User approves before posting
- ✅ Comment text: User approves before posting

**The AI agent MUST NOT:**
- Auto-accept or auto-decline Issues
- Post comments without showing preview
- Close Issues without decline workflow
- Skip the approval step

## Session State

Track during session (not persisted):
- `accepted`: count of accepted Issues
- `declined`: count of declined Issues
- `commented`: count of Issues with new comments
- `skipped`: count of skipped Issues
- `remaining`: count of unprocessed Issues

## Related

- `/send` - Send feedback to another Construct
- `/threads` - View all Melange threads
- `melange/` - Melange Protocol documentation
