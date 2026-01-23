# Software Design Document: Melange CLI Integration

**Version**: 1.0.0
**Date**: 2026-01-23
**Author**: Software Architect Agent
**Status**: Draft
**Cycle**: cycle-003
**Builds On**: cycle-002 (Melange Infrastructure)

---

## 1. Executive Summary

This SDD describes the architecture for integrating Melange Protocol into the Loa CLI experience. Building on the deployed infrastructure (GitHub Issues + Discord notifications), this cycle adds two Loa skills that enable operators to send and receive feedback without leaving the terminal.

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **CLI Tool** | GitHub CLI (`gh`) | Already available, handles auth, mature API |
| **Skill Pattern** | Command + Agent | Matches existing Loa architecture |
| **Config Storage** | `.loa.config.yaml` | Single source of truth for construct identity |
| **Interaction Model** | AskUserQuestion tool | Native Claude Code UX for triage flow |
| **State Storage** | None (MVP) | Query GitHub each time, no local cache |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MELANGE CLI INTEGRATION                                │
│                    (Loa Skills for /send and /inbox)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  .loa.config.yaml                .claude/skills/            .claude/commands/│
│  ┌─────────────────┐            ┌─────────────────┐       ┌───────────────┐ │
│  │ construct:      │            │ melange-send/   │       │ send.md       │ │
│  │   name: sigil   │◄───────────│   index.yaml    │◄──────│ (routing)     │ │
│  │   operator: soju│            │   SKILL.md      │       └───────────────┘ │
│  │   repo: ...     │            └─────────────────┘                         │
│  │   org: ...      │            ┌─────────────────┐       ┌───────────────┐ │
│  └─────────────────┘            │ melange-inbox/  │       │ inbox.md      │ │
│                                 │   index.yaml    │◄──────│ (routing)     │ │
│                                 │   SKILL.md      │       └───────────────┘ │
│                                 └─────────────────┘                         │
│                                          │                                   │
│                                          ▼                                   │
│                                 ┌─────────────────┐                         │
│                                 │  GitHub CLI     │                         │
│                                 │  (gh)           │                         │
│                                 │  - issue create │                         │
│                                 │  - issue list   │                         │
│                                 │  - issue view   │                         │
│                                 │  - issue comment│                         │
│                                 │  - issue edit   │                         │
│                                 └─────────────────┘                         │
│                                          │                                   │
│                                          ▼                                   │
│                                 ┌─────────────────┐                         │
│                                 │  GitHub Issues  │                         │
│                                 │  (Melange v0.9) │                         │
│                                 └─────────────────┘                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Design

### 2.1 Construct Identity Configuration

**Location**: `.loa.config.yaml`

**Schema Addition**:
```yaml
# =============================================================================
# Construct Identity (Melange Protocol)
# =============================================================================
# Required for /send and /inbox commands
construct:
  # Construct name (lowercase, matches labels like to:sigil)
  name: sigil
  # Human operator name (displayed in From field)
  operator: soju
  # GitHub repo for outbox (where Issues are created)
  repo: 0xHoneyJar/sigil
  # GitHub org for inbox queries
  org: 0xHoneyJar
  # Known constructs in the org (for validation)
  known_constructs:
    - sigil
    - loa
    - registry
    - loa-constructs
```

**Validation Rules**:
- `name`: Required, lowercase, alphanumeric + hyphens
- `operator`: Required, non-empty string
- `repo`: Required, format `owner/repo`
- `org`: Required, GitHub organization name
- `known_constructs`: Optional, defaults to `[sigil, loa, registry]`

**Error on Missing**:
```
Error: Construct identity not configured.

Add to .loa.config.yaml:

construct:
  name: your-construct
  operator: your-name
  repo: org/your-repo
  org: your-org
```

### 2.2 `/send` Command

**File**: `.claude/commands/send.md`

```yaml
---
name: "send"
version: "1.0.0"
description: |
  Send feedback to another Construct via Melange Protocol.
  Creates a structured GitHub Issue in your repo addressed to the target.

arguments:
  - name: "target"
    type: "string"
    required: true
    description: "Target construct (e.g., loa, sigil, registry)"
  - name: "message"
    type: "string"
    required: true
    description: "Brief description of feedback"

agent: "melange-send"
agent_path: "skills/melange-send/"

pre_flight:
  - check: "config_exists"
    path: ".loa.config.yaml"
    key: "construct.name"
    error: "Construct identity not configured. Add construct block to .loa.config.yaml"

  - check: "command_exists"
    command: "gh"
    error: "GitHub CLI not found. Install: https://cli.github.com/"

  - check: "script"
    script: ".claude/scripts/check-gh-auth.sh"
    error: "GitHub CLI not authenticated. Run: gh auth login"

outputs:
  - path: "GitHub Issue URL"
    type: "external"
    description: "Created Melange Issue"

mode:
  default: "foreground"
  allow_background: false
---
```

### 2.3 `/inbox` Command

**File**: `.claude/commands/inbox.md`

```yaml
---
name: "inbox"
version: "1.0.0"
description: |
  Triage incoming Melange feedback addressed to this Construct.
  Interactive workflow: review, accept, decline, or comment on each issue.

arguments:
  - name: "all"
    type: "flag"
    required: false
    description: "Include nice-to-have issues (default: game-changing + important only)"
  - name: "construct"
    type: "string"
    required: false
    description: "Filter to specific sender construct"

agent: "melange-inbox"
agent_path: "skills/melange-inbox/"

pre_flight:
  - check: "config_exists"
    path: ".loa.config.yaml"
    key: "construct.name"
    error: "Construct identity not configured. Add construct block to .loa.config.yaml"

  - check: "command_exists"
    command: "gh"
    error: "GitHub CLI not found. Install: https://cli.github.com/"

  - check: "script"
    script: ".claude/scripts/check-gh-auth.sh"
    error: "GitHub CLI not authenticated. Run: gh auth login"

outputs:
  - path: "Triage session summary"
    type: "terminal"
    description: "Summary of actions taken"

mode:
  default: "foreground"
  allow_background: false
---
```

### 2.4 Melange Send Skill

**File**: `.claude/skills/melange-send/index.yaml`

```yaml
name: "melange-send"
version: "1.0.0"
model: "sonnet"
color: "blue"

description: |
  Send structured feedback to another Construct via Melange Protocol.
  Drafts a GitHub Issue with proper structure, gets human approval,
  then creates the Issue using gh CLI.

triggers:
  - "/send"
  - "send feedback to"
  - "melange to"
  - "create melange issue"

examples:
  - context: "User wants to report an issue to another team"
    user_says: "/send loa \"Error messages don't include file paths\""
    agent_action: "Launch melange-send to draft and create Melange Issue"

inputs:
  - name: "target"
    type: "string"
    required: true
    description: "Target construct name"
  - name: "message"
    type: "string"
    required: true
    description: "Brief feedback description"

outputs:
  - path: "GitHub Issue URL"
    description: "Created Melange Issue"
```

**File**: `.claude/skills/melange-send/SKILL.md`

```markdown
# Melange Send Skill

## Purpose

Draft and create a Melange Issue addressed to another Construct. Ensures
structured feedback with human approval before creation.

## Workflow

### Phase 1: Parse & Validate

1. Read construct identity from `.loa.config.yaml`
2. Validate target is in `known_constructs`
3. Extract brief message from arguments

### Phase 2: Gather Intent

Use AskUserQuestion to collect:

1. **Impact Level**
   - game-changing: Blocks core workflow
   - important: Significant friction
   - nice-to-have: Improvement idea

2. **Intent Type**
   - request: Asking for a change
   - ask: Question/clarification
   - report: Sharing observation

### Phase 3: Draft Issue

Expand the brief message into structured Melange fields:

- **Experience**: Concrete scenario describing what's happening
- **Evidence**: Links, logs, counts, screenshots
- **Request**: What would help resolve this
- **Why this impact**: Reasoning for the impact level

### Phase 4: Human Review

Present full Issue preview and ask for approval:

```
Create this Issue? [Y/n/edit]
```

- **Y**: Proceed to create
- **n**: Abort
- **edit**: Allow modifications

### Phase 5: Create Issue

Execute:
```bash
gh issue create \
  --repo {construct.repo} \
  --title "[Melange] {Intent}: {Title}" \
  --label "melange,status:open,to:{target},impact:{impact},intent:{intent}" \
  --body "{formatted_body}"
```

### Phase 6: Confirm

Output:
```
✓ Created: {issue_url}
✓ Discord notification sent ({impact_emoji} {impact})
```

## Issue Body Template

```markdown
### To (Receiving Construct)

{target}

### From (Your Construct + Operator)

{operator}@{construct_name}

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
```

## Error Handling

| Error | Resolution |
|-------|------------|
| Target not in known_constructs | List valid targets, ask to confirm |
| gh issue create fails | Show error, suggest checking permissions |
| User aborts | Confirm abort, no action taken |
```

### 2.5 Melange Inbox Skill

**File**: `.claude/skills/melange-inbox/index.yaml`

```yaml
name: "melange-inbox"
version: "1.0.0"
model: "sonnet"
color: "purple"

description: |
  Interactive triage of incoming Melange feedback. Queries GitHub for
  Issues addressed to this Construct, presents each one, and handles
  accept/decline/comment actions with human approval.

triggers:
  - "/inbox"
  - "check melange inbox"
  - "triage feedback"
  - "review incoming issues"

examples:
  - context: "User wants to process incoming feedback"
    user_says: "/inbox"
    agent_action: "Launch melange-inbox to query and triage Melange Issues"

inputs:
  - name: "all"
    type: "boolean"
    required: false
    default: false
    description: "Include nice-to-have issues"
  - name: "construct"
    type: "string"
    required: false
    description: "Filter to specific sender"

outputs:
  - path: "Triage summary"
    description: "Summary of actions taken during session"
```

**File**: `.claude/skills/melange-inbox/SKILL.md`

```markdown
# Melange Inbox Skill

## Purpose

Interactive triage of incoming Melange feedback. Presents each Issue
with structured context and handles accept/decline/comment actions.

## Workflow

### Phase 1: Query GitHub

Build search query:
```
org:{org} is:issue is:open label:melange label:to:{construct}
```

Filter by impact (unless --all):
```
label:impact:game-changing OR label:impact:important
```

Execute:
```bash
gh issue list \
  --search "org:{org} is:open label:melange label:to:{construct}" \
  --json number,title,labels,repository,createdAt,body \
  --limit 50
```

### Phase 2: Sort & Present Summary

Sort order:
1. impact:game-changing first
2. impact:important second
3. By createdAt (oldest first)

Present summary:
```
📥 Inbox for {construct} ({count} issues)

🔴 #{n} [game-changing] {from} → {construct}: "{title}"
🟡 #{n} [important] {from} → {construct}: "{title}"
...

Starting triage...
```

If empty:
```
📥 Inbox for {construct}

✨ Inbox zero! No pending Melange Issues.
```

### Phase 3: Interactive Triage Loop

For each issue:

1. **Fetch full details**:
   ```bash
   gh issue view {number} --repo {repo} --json body,comments
   ```

2. **Parse Melange fields** from body

3. **Present structured view**:
   ```
   ─────────────────────────────────────────
   🔴 #{number}: {title}
   From: {operator}@{from_construct}
   Impact: {impact}
   Intent: {intent}

   Experience:
   {experience}

   Request:
   {request}
   ─────────────────────────────────────────
   ```

4. **Prompt for action** using AskUserQuestion:
   ```
   Action: [A]ccept / [D]ecline / [C]omment / [S]kip / [Q]uit
   ```

### Phase 4: Handle Actions

**Accept**:
1. AI drafts acceptance comment
2. Human approves comment text
3. Execute:
   ```bash
   gh issue comment {number} --repo {repo} --body "{comment}"
   gh issue edit {number} --repo {repo} --add-label "status:accepted" --remove-label "status:open"
   ```
4. Track in session stats

**Decline**:
1. Prompt for reason
2. AI drafts decline comment with reasoning
3. Human approves
4. Execute:
   ```bash
   gh issue comment {number} --repo {repo} --body "{comment}"
   gh issue edit {number} --repo {repo} --add-label "status:declined" --remove-label "status:open"
   gh issue close {number} --repo {repo}
   ```

**Comment**:
1. Prompt for message
2. AI helps draft response
3. Human approves
4. Execute:
   ```bash
   gh issue comment {number} --repo {repo} --body "{comment}"
   ```

**Skip**:
- Move to next Issue, no action

**Quit**:
- Exit loop, proceed to summary

### Phase 5: Session Summary

```
─────────────────────────────────────────
Triage complete:
  Accepted: {n}
  Declined: {n}
  Commented: {n}
  Skipped: {n}

Remaining in inbox: {n}
─────────────────────────────────────────
```

## Parsing Melange Issue Body

Extract fields using regex patterns:

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

## Error Handling

| Error | Resolution |
|-------|------------|
| No issues found | Show "Inbox zero" message |
| gh command fails | Show error, suggest checking auth |
| Issue already processed | Skip, note in log |
| Label update fails | Warn but continue |
```

---

## 3. Helper Scripts

### 3.1 `check-gh-auth.sh`

**File**: `.claude/scripts/check-gh-auth.sh`

```bash
#!/usr/bin/env bash
# Check if gh CLI is authenticated

set -euo pipefail

if ! gh auth status &>/dev/null; then
  exit 1
fi

exit 0
```

---

## 4. Data Flow

### 4.1 Send Flow

```
User: /send loa "Error messages unclear"
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Read .loa.config.yaml            │
│    - construct.name = sigil         │
│    - construct.operator = soju      │
│    - construct.repo = .../sigil     │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 2. AskUserQuestion: Impact?         │
│    [1] game-changing                │
│    [2] important                    │
│    [3] nice-to-have                 │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 3. AskUserQuestion: Intent?         │
│    [1] request                      │
│    [2] ask                          │
│    [3] report                       │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 4. AI drafts full Issue body        │
│    - Expands brief message          │
│    - Adds evidence section          │
│    - Adds reasoning                 │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 5. Show preview, ask approval       │
│    Create this Issue? [Y/n/edit]    │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 6. gh issue create --repo ...       │
│    Labels: melange, status:open,    │
│            to:loa, impact:...,      │
│            intent:...               │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 7. Discord webhook fires            │
│    (via GitHub Action)              │
└─────────────────────────────────────┘
         │
         ▼
✓ Created: github.com/.../issues/57
✓ Discord notification sent (🟡 important)
```

### 4.2 Inbox Flow

```
User: /inbox
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Read .loa.config.yaml            │
│    - construct.name = loa           │
│    - construct.org = 0xHoneyJar     │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 2. gh issue list --search ...       │
│    org:0xHoneyJar label:melange     │
│    label:to:loa is:open             │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 3. Present inbox summary            │
│    📥 Inbox for loa (3 issues)      │
│    🔴 #42 [game-changing] ...       │
│    🟡 #38 [important] ...           │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 4. For each issue:                  │
│    - Show structured view           │
│    - AskUserQuestion: Action?       │
│    - Handle accept/decline/comment  │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 5. Session summary                  │
│    Accepted: 2                      │
│    Declined: 0                      │
│    Commented: 1                     │
└─────────────────────────────────────┘
```

---

## 5. Security Considerations

### 5.1 Trust Model

| Actor | Trust Level | Notes |
|-------|-------------|-------|
| Construct Operator | High | Makes all accept/decline decisions |
| AI Agent | Assistant | Drafts content, never auto-approves |
| GitHub CLI | High | Uses operator's auth token |
| Target Construct | Untrusted | Issues can contain anything |

### 5.2 HITL Enforcement

**Every action requires explicit human approval:**

- Issue creation: "Create this Issue? [Y/n/edit]"
- Accept: "Post this comment? [Y/n/edit]"
- Decline: "Post this decline? [Y/n/edit]"
- Comment: "Post this comment? [Y/n/edit]"

**The AI agent MUST NOT:**
- Auto-create Issues without approval
- Auto-accept/decline without approval
- Modify Issue content after approval
- Close Issues without decline flow

### 5.3 Input Validation

- Target construct validated against `known_constructs`
- Issue body parsed defensively (missing fields → empty string)
- gh CLI handles authentication and authorization

---

## 6. File Structure Summary

```
.claude/
├── commands/
│   ├── send.md              # /send command definition
│   └── inbox.md             # /inbox command definition
├── skills/
│   ├── melange-send/
│   │   ├── index.yaml       # Skill metadata
│   │   └── SKILL.md         # Skill instructions
│   └── melange-inbox/
│       ├── index.yaml       # Skill metadata
│       └── SKILL.md         # Skill instructions
└── scripts/
    └── check-gh-auth.sh     # gh authentication check

.loa.config.yaml             # + construct: block
```

---

## 7. Implementation Notes

### 7.1 AskUserQuestion Integration

Use Claude Code's native `AskUserQuestion` tool for all user prompts:

```javascript
// Impact selection
{
  question: "What's the impact level?",
  header: "Impact",
  options: [
    { label: "game-changing", description: "Blocks core workflow" },
    { label: "important", description: "Significant friction" },
    { label: "nice-to-have", description: "Improvement idea" }
  ]
}

// Triage action
{
  question: "What action do you want to take?",
  header: "Action",
  options: [
    { label: "Accept", description: "Accept and commit to addressing" },
    { label: "Decline", description: "Decline with reason" },
    { label: "Comment", description: "Add a comment without status change" },
    { label: "Skip", description: "Move to next issue" }
  ]
}
```

### 7.2 gh CLI Commands

**Create Issue**:
```bash
gh issue create \
  --repo "0xHoneyJar/sigil" \
  --title "[Melange] Request: Include file paths in error messages" \
  --label "melange,status:open,to:loa,impact:important,intent:request" \
  --body "$(cat <<'EOF'
### To (Receiving Construct)

loa

### From (Your Construct + Operator)

soju@Sigil
...
EOF
)"
```

**List Issues**:
```bash
gh issue list \
  --search "org:0xHoneyJar is:open label:melange label:to:loa" \
  --json number,title,labels,repository,createdAt,body \
  --limit 50
```

**Comment on Issue**:
```bash
gh issue comment 42 \
  --repo "0xHoneyJar/sigil" \
  --body "Accepted - will implement in next sprint."
```

**Update Labels**:
```bash
gh issue edit 42 \
  --repo "0xHoneyJar/sigil" \
  --add-label "status:accepted" \
  --remove-label "status:open"
```

---

## 8. Testing Strategy

### 8.1 Manual Testing

1. **Send Happy Path**:
   - `/send loa "Test message"`
   - Select impact, intent
   - Approve creation
   - Verify Issue created with correct labels
   - Verify Discord notification

2. **Send Abort**:
   - `/send loa "Test"`
   - Select impact, intent
   - Type 'n' at approval
   - Verify no Issue created

3. **Inbox Happy Path**:
   - Create test Melange Issue manually
   - `/inbox`
   - Accept the Issue
   - Verify comment posted, labels updated

4. **Inbox Empty**:
   - Clear all Issues
   - `/inbox`
   - Verify "Inbox zero" message

### 8.2 Error Cases

1. **Missing construct config**: Verify helpful error message
2. **gh not authenticated**: Verify error points to `gh auth login`
3. **Invalid target**: Verify list of valid constructs shown
4. **gh command fails**: Verify error displayed, no state corruption

---

## 9. Future Considerations

### Out of Scope (MVP)

| Feature | Notes |
|---------|-------|
| Local tracking | Query GitHub each time for MVP |
| `/inbox --accepted` | Track accepted Issues locally |
| File attachments | Would need gh asset upload |
| Multi-org support | Single org for now |
| `/send status` | Check sent Issue status |

### Post-MVP Enhancements

1. **Accepted Issue Tracking**: `grimoires/loa/melange/accepted.json`
2. **Resolution PR Linking**: Auto-detect PR references
3. **Triage State Persistence**: Remember position across sessions
4. **Slack Integration**: Alternative to Discord

---

**Document Status**: Draft
**Next Step**: `/sprint-plan` to break down into implementable tasks
