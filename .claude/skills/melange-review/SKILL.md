# Melange Review Skill

## Purpose

Review and verify resolved Melange threads. Interactive workflow to verify, reopen, or comment on threads that have been resolved by the receiving Construct.

## Invocation

```
/review-resolution
/review-resolution --all
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

### Phase 2: Query Resolved Threads

Query GitHub for resolved threads sent by this construct:

```bash
gh issue list \
  --search "org:{org} label:melange label:status:resolved label:from:{construct_name}" \
  --state all \
  --json number,title,labels,repository,body,closedAt,comments \
  --limit 50
```

**Filter results**:
- Exclude threads with `status:verified` label (unless `--all` flag)
- Sort by `closedAt` (newest first)

### Phase 3: Display Summary

Show count and table of pending reviews:

```
🔍 Resolved Threads Pending Review ({n})

| # | Thread | To | Resolved | Age |
|---|--------|-----|----------|-----|
| 1 | #{n} {title} | {to} | {duration} ago | {total_age} |
```

**Empty state**:
```
🔍 Resolved Threads Pending Review

✨ No threads pending review

All your resolved threads have been verified!
```

### Phase 4: Interactive Triage

For each thread, display details and prompt for action:

**Thread Detail Display**:
```
─────────────────────────────────────────
🔔 #{number}: {title}
To: {to_construct}
Resolved: {time_since_resolved} ago
Resolution: {resolution_method}

Original Request:
{original_request_from_body}

Resolution Comment:
{last_comment_or_close_reason}

Linked PR: #{pr_number} (merged)
─────────────────────────────────────────
```

**Action Prompt**:
```json
{
  "questions": [{
    "question": "What would you like to do with this resolution?",
    "header": "Action",
    "options": [
      { "label": "Verify", "description": "Resolution addresses the concern" },
      { "label": "Reopen", "description": "Need follow-up, create new Issue" },
      { "label": "Comment", "description": "Add clarification without changing status" },
      { "label": "Skip", "description": "Move to next thread" },
      { "label": "Quit", "description": "Exit review session" }
    ],
    "multiSelect": false
  }]
}
```

### Phase 5: Handle Actions

#### Verify Action

1. Confirm verification:
   ```json
   {
     "questions": [{
       "question": "Does this resolution address your original concern?",
       "header": "Confirm",
       "options": [
         { "label": "Yes", "description": "Mark as verified" },
         { "label": "No", "description": "Cancel, choose different action" }
       ],
       "multiSelect": false
     }]
   }
   ```

2. If confirmed, add label:
   ```bash
   gh issue edit {number} --repo {repo} --add-label "status:verified" --remove-label "status:resolved"
   ```

3. Update local cache:
   ```javascript
   thread.status = 'verified';
   thread.verified_at = new Date().toISOString();
   cache.pending_review = cache.pending_review.filter(t => t.id !== thread.id);
   ```

4. Show confirmation:
   ```
   ✓ Added label: status:verified
   ✓ Thread marked as verified
   ```

#### Reopen Action

1. Get follow-up reason:
   ```
   Why does this need follow-up?
   > {user input}
   ```

2. Draft follow-up Issue:
   ```markdown
   ### Follow-up to #{original_number}

   The original Issue was resolved but requires additional work.

   **Original request:**
   {original_request}

   **Why follow-up needed:**
   {user_provided_reason}

   **Previous resolution:** {resolution_pr_or_comment}

   ---
   Re-opened from #{original_number}
   ```

3. Preview and confirm:
   ```json
   {
     "questions": [{
       "question": "Create this follow-up Issue?",
       "header": "Confirm",
       "options": [
         { "label": "Yes", "description": "Create follow-up Issue" },
         { "label": "Edit", "description": "Modify before creating" },
         { "label": "Cancel", "description": "Don't create" }
       ],
       "multiSelect": false
     }]
   }
   ```

4. Create follow-up Issue:
   ```bash
   gh issue create \
     --repo "{construct.repo}" \
     --title "[Melange] Follow-up: {original_title}" \
     --label "melange,status:open,to:{to_construct},from:{construct_name},intent:request" \
     --body "{follow_up_body}"
   ```

5. Update original Issue:
   ```bash
   gh issue edit {original_number} --repo {original_repo} \
     --add-label "status:reopened" \
     --remove-label "status:resolved"

   gh issue comment {original_number} --repo {original_repo} \
     --body "↩️ Follow-up created: #{new_number}"
   ```

6. Show confirmation:
   ```
   ✓ Created: {new_issue_url}
   ✓ Added label: status:reopened to original #{original_number}
   ✓ Linked follow-up in original thread
   ```

#### Comment Action

1. Get comment content:
   ```
   What would you like to comment?
   > {user input}
   ```

2. Post comment:
   ```bash
   gh issue comment {number} --repo {repo} --body "{comment}"
   ```

3. Show confirmation:
   ```
   ✓ Comment posted on #{number}
   ```

### Phase 6: Session Summary

After all threads processed or quit:

```
─────────────────────────────────────────
Review complete:
  Verified: {n}
  Reopened: {n}
  Commented: {n}
  Skipped: {n}

Pending review: {remaining}
```

## Error Handling

| Error | Resolution |
|-------|------------|
| No resolved threads | Show "No threads pending review" empty state |
| GitHub API fails | Show error, suggest `gh auth status` |
| Label add fails | Warn but continue |
| Issue create fails | Show error, ask to retry or skip |

## HITL Requirements

**Every action requires explicit human approval:**

- ✅ Action selection: User chooses
- ✅ Verify confirmation: User confirms
- ✅ Reopen reason: User provides
- ✅ Follow-up preview: User approves
- ✅ Comment content: User provides

**The AI agent MUST NOT:**
- Auto-verify threads
- Create follow-up Issues without approval
- Skip threads without user action
- Modify thread content after user approves

## Related

- `/threads --pending-review` - Quick view of pending queue
- `/threads` - Full Melange threads dashboard
- `/send` - Send new Melange feedback
- `/inbox` - Triage incoming feedback
