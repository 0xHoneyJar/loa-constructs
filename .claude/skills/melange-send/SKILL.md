# Melange Send Skill

## Purpose

Draft and create a Melange Issue addressed to another Construct. Ensures structured feedback with human approval before creation. Validates sender identity using GitHub OAuth before allowing Issue creation.

## Invocation

```
/send <target> "<message>"
/send <target> "<message>" --block
/send human "<message>"
```

## Workflow

### Phase 0: Identity Validation (Pre-flight)

Before any other action, validate the sender's identity:

1. **Get authenticated GitHub username**:
   ```bash
   gh api user --jq '.login'
   ```
   - Returns the OAuth-authenticated GitHub username (e.g., "zkSoju")
   - Handles errors: `gh` not installed, not authenticated

2. **Read construct identity** from `.loa.config.yaml`:
   ```yaml
   construct:
     name: loa-constructs
     operator: soju
     repo: 0xHoneyJar/loa-constructs
     org: 0xHoneyJar
   ```

3. **Fetch construct from registry** (for Discord ID lookup):
   ```bash
   curl -s "https://loa-constructs-api.fly.dev/v1/constructs/{construct.name}"
   ```
   - Parse the JSON response
   - Extract `operator.discord_id` for notifications

4. **Validate identity**:
   - If `gh` not authenticated → ERROR: "GitHub CLI not authenticated. Run `gh auth login`"
   - If construct NOT FOUND in registry → WARN: "Construct not in registry. Proceeding with local config."
   - If registry unavailable → WARN: "Registry unreachable. Proceeding with local config."
   - Otherwise → PROCEED

   **Note**: No username matching required. Like GitHub, anyone with execution environment access can act on behalf of the construct. The `operator` field identifies the primary maintainer for notifications, not exclusive access.

5. **Store validated identity** for use in Issue creation:
   - `github_username`: The authenticated GitHub username (actual sender)
   - `discord_id`: From registry response `operator.discord_id` (for notifications)

### Phase 1: Parse & Validate

1. **Read construct identity** from `.loa.config.yaml`:
   ```yaml
   construct:
     name: loa-constructs
     operator: soju
     repo: 0xHoneyJar/loa-constructs
     org: 0xHoneyJar
     known_constructs: [sigil, loa, registry, loa-constructs]
     human_discord_id: "259646475666063360"  # Optional, for /send human
   ```

2. **Validate target** is in `known_constructs` list
   - If target is `human`: Valid only if `human_discord_id` is configured
   - If not found: List valid constructs and ask to confirm

3. **Extract brief message** from arguments

4. **Check for `--block` flag** - sets blocking state for this Issue

### Phase 2: Gather Intent

Use `AskUserQuestion` tool to collect impact and intent:

**Question 1: Impact Level**
```json
{
  "questions": [{
    "question": "What's the impact level of this feedback?",
    "header": "Impact",
    "options": [
      { "label": "game-changing", "description": "Blocks core workflow" },
      { "label": "important", "description": "Significant friction" },
      { "label": "nice-to-have", "description": "Improvement idea" }
    ],
    "multiSelect": false
  }]
}
```

**Question 2: Intent Type**
```json
{
  "questions": [{
    "question": "What's your intent with this feedback?",
    "header": "Intent",
    "options": [
      { "label": "request", "description": "Asking for a change" },
      { "label": "ask", "description": "Question or clarification" },
      { "label": "report", "description": "Sharing an observation" }
    ],
    "multiSelect": false
  }]
}
```

### Phase 3: Draft Issue

Expand the brief message into structured Melange fields:

- **Experience**: Concrete scenario describing what's happening
- **Evidence**: Links, logs, counts, screenshots (ask user if needed)
- **Request**: What would help resolve this
- **Why this impact**: Reasoning for the impact level

### Phase 4: Human Review

Present full Issue preview (note: From now uses verified GitHub username):

```
─────────────────────────────────────────
📝 Preview: Melange Issue

Title: [Melange] {Intent}: {Title}

To: {target}
From: {github_username}@{construct_name}
Impact: {impact}
Intent: {intent}

Experience:
{experience}

Evidence:
{evidence}

Request:
{request}

Why {impact}:
{reasoning}
─────────────────────────────────────────
```

Ask for approval using `AskUserQuestion`:
```json
{
  "questions": [{
    "question": "Create this Melange Issue?",
    "header": "Confirm",
    "options": [
      { "label": "Yes", "description": "Create the Issue as shown" },
      { "label": "Edit", "description": "Modify before creating" },
      { "label": "Cancel", "description": "Abort without creating" }
    ],
    "multiSelect": false
  }]
}
```

- **Yes**: Proceed to create
- **Edit**: Ask what to change, update draft, show preview again
- **Cancel**: Abort with confirmation message

### Phase 5: Create Issue

Execute `gh issue create` with validated GitHub username in From field and embedded metadata:

```bash
gh issue create \
  --repo "{construct.repo}" \
  --title "[Melange] {Intent}: {Title}" \
  --label "melange,status:open,to:{target},from:{construct_name},impact:{impact},intent:{intent}" \
  --body "$(cat <<'EOF'
### To (Receiving Construct)

{target}

### From (Your Construct + Operator)

{github_username}@{construct_name}

### Intent

{intent}

### Impact

{impact}

### What are you experiencing?

{experience}

### Evidence

{evidence}

### What would help?

{request}

### Why this impact level?

{reasoning}

<!-- melange-metadata
source_repo: {construct.repo}
sender_github: {github_username}
sender_construct: {construct_name}
sender_discord: {discord_id}
created_at: {iso_timestamp}
-->
EOF
)"
```

**Important changes from v1:**
- `From` field now uses `{github_username}` (OAuth-verified) instead of `{operator}` (config-based)
- Added `from:{construct_name}` label for easier filtering
- Added hidden `<!-- melange-metadata -->` block for resolution tracking
```

### Phase 5.5: Handle Blocking (if --block flag)

If `--block` flag was provided:

1. **Add `status:blocked` label** to created Issue:
   ```bash
   gh issue edit {number} --repo {repo} --add-label "status:blocked"
   ```

2. **Update local cache** (`grimoires/loa/melange/threads.json`):
   ```javascript
   // Add to threads array
   cache.threads.push({
     id: "{repo}#{number}",
     repo: "{repo}",
     number: {number},
     title: "{title}",
     from: "{operator}@{construct_name}",
     to: "{target}",
     impact: "{impact}",
     intent: "{intent}",
     status: "blocked",
     direction: "sent",
     created_at: new Date().toISOString(),
     blocked: true,
     comments: 0
   });

   // Add to blocked array
   cache.blocked.push({
     id: "{repo}#{number}",
     blocked_at: new Date().toISOString(),
     waiting_on: "{target}"
   });
   ```

3. **Note in Discord notification** (handled by workflow):
   ```
   ⏳ Sender is blocked waiting for response
   ```

### Phase 5.6: Update Cache (always)

Regardless of --block flag, add thread to local cache for tracking:

1. **Load cache** from `grimoires/loa/melange/threads.json`
2. **Add new thread** to `threads` array
3. **Save cache** with updated timestamp

### Phase 6: Confirm

Output success message:

```
✓ Created: {issue_url}
✓ Discord notification sent ({impact_emoji} {impact})
```

If `--block` flag was used:
```
✓ Created: {issue_url}
✓ Discord notification sent ({impact_emoji} {impact})
✓ Marked as BLOCKED - waiting on {target}
✓ Use /threads --blocked to see status
```

If target was `human`:
```
✓ Created: {issue_url}
✓ Discord notification sent to operator
✓ Awaiting human response
```

Impact emojis:
- game-changing: 🔴
- important: 🟡
- nice-to-have: (no Discord notification)

## Issue Body Template

```markdown
### To (Receiving Construct)

{target}

### From (Your Construct + Operator)

{github_username}@{construct_name}

### Intent

{intent}

### Impact

{impact}

### What are you experiencing?

{experience}

### Evidence

{evidence}

### What would help?

{request}

### Why this impact level?

{reasoning}

<!-- melange-metadata
source_repo: {construct.repo}
sender_github: {github_username}
sender_construct: {construct_name}
sender_discord: {discord_id}
created_at: {iso_timestamp}
-->
```

**Note**: The `<!-- melange-metadata -->` block is hidden when viewing the Issue in GitHub UI but is parsed by the `melange-resolve.yml` webhook to send resolution notifications back to the sender.

## Error Handling

| Error | Resolution |
|-------|------------|
| `gh api user` fails (not authenticated) | Show: "GitHub CLI not authenticated. Run `gh auth login` to authenticate." |
| `gh` not installed | Show: "GitHub CLI not found. Install: https://cli.github.com/" |
| Construct not found in registry | WARN: "Construct not in registry. Proceeding with local config." (soft failure) |
| Registry unavailable (network error) | WARN: "Could not reach registry. Proceeding with local config only." (soft failure) |
| Target not in known_constructs | List valid targets, ask to confirm or add to config |
| Target is `human` but no `human_discord_id` | Show: "Add `human_discord_id` to config to use /send human" |
| gh issue create fails | Show error message, suggest checking repo permissions |
| User cancels | Confirm: "Issue creation cancelled. No action taken." |
| Cache file missing | Create empty cache, then update |
| --block label add fails | Warn but continue (Issue still created) |

## HITL Requirements

**Every action requires explicit human approval:**

- ✅ Impact selection: User chooses
- ✅ Intent selection: User chooses
- ✅ Issue preview: User approves/edits/cancels
- ✅ Issue creation: Only after approval

**The AI agent MUST NOT:**
- Auto-select impact or intent
- Create Issues without showing preview
- Skip the approval step
- Modify Issue content after user approves

## Related

- `/inbox` - Triage incoming Melange feedback
- `/threads` - View all Melange threads including blocked
- `melange/` - Melange Protocol documentation
