# Software Design Document: Melange CLI Integration

**Version**: 2.0.0
**Date**: 2026-01-23
**Author**: Software Architect Agent
**Status**: Draft
**Cycle**: cycle-003
**Builds On**: cycle-002 (Melange Infrastructure), Phase 1 (Sprints 3-4)

---

## 1. Executive Summary

This SDD describes the architecture for integrating Melange Protocol into the Loa CLI experience. Building on the deployed infrastructure (GitHub Issues + Discord notifications), this cycle adds Loa skills that enable operators to send and receive feedback without leaving the terminal.

**Phase 1** (complete): `/send` and `/inbox` commands with HITL approval.
**Phase 2** (this update): `/threads` dashboard, blocking flag, sender filtering, local tracking, PR auto-linking.

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **CLI Tool** | GitHub CLI (`gh`) | Already available, handles auth, mature API |
| **Skill Pattern** | Command + Agent | Matches existing Loa architecture |
| **Config Storage** | `.loa.config.yaml` | Single source of truth for construct identity |
| **Interaction Model** | AskUserQuestion tool | Native Claude Code UX for triage flow |
| **State Storage** | Local JSON + GitHub sync | Cache for fast queries, GitHub as source of truth |
| **Dashboard Rendering** | Unicode box characters | Terminal-native, no external dependencies |
| **PR Resolution** | GitHub Action + labels | Automated detection, manual review still required |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MELANGE CLI INTEGRATION v2.0                           │
│              (Loa Skills for /send, /inbox, and /threads)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  .loa.config.yaml                .claude/skills/            .claude/commands/│
│  ┌─────────────────┐            ┌─────────────────┐       ┌───────────────┐ │
│  │ construct:      │            │ melange-send/   │       │ send.md       │ │
│  │   name: sigil   │◄───────────│   index.yaml    │◄──────│ (routing)     │ │
│  │   operator: soju│            │   SKILL.md      │       └───────────────┘ │
│  │   repo: ...     │            └─────────────────┘                         │
│  │   org: ...      │            ┌─────────────────┐       ┌───────────────┐ │
│  │   human_discord │            │ melange-inbox/  │       │ inbox.md      │ │
│  └─────────────────┘            │   index.yaml    │◄──────│ (routing)     │ │
│                                 │   SKILL.md      │       └───────────────┘ │
│  grimoires/loa/melange/         └─────────────────┘                         │
│  ┌─────────────────┐            ┌─────────────────┐       ┌───────────────┐ │
│  │ threads.json    │◄───────────│ melange-threads/│◄──────│ threads.md    │ │
│  │ (local cache)   │            │   index.yaml    │       │ (routing)     │ │
│  └─────────────────┘            │   SKILL.md      │       └───────────────┘ │
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
│                                 │  - api (search) │                         │
│                                 └─────────────────┘                         │
│                                          │                                   │
│                                          ▼                                   │
│  .github/workflows/             ┌─────────────────┐                         │
│  ┌─────────────────┐            │  GitHub Issues  │                         │
│  │ melange-notify  │◄───────────│  (Melange v2.0) │                         │
│  │ melange-resolve │            └─────────────────┘                         │
│  └─────────────────┘                                                        │
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

## 8. Phase 2 Components

### 8.1 `/threads` Command

**File**: `.claude/commands/threads.md`

```yaml
---
name: "threads"
version: "1.0.0"
description: |
  Melange Threads Dashboard - visualize all active threads across the org.
  Shows blocked, awaiting, in-progress, and resolved threads.

arguments:
  - name: "mine"
    type: "flag"
    required: false
    description: "Show only threads I'm involved in (sent or received)"
  - name: "blocked"
    type: "flag"
    required: false
    description: "Show only blocked threads"
  - name: "resolved"
    type: "flag"
    required: false
    description: "Show recently resolved threads (last 7 days)"
  - name: "sync"
    type: "flag"
    required: false
    description: "Force full refresh from GitHub"

agent: "melange-threads"
agent_path: "skills/melange-threads/"

pre_flight:
  - check: "config_exists"
    path: ".loa.config.yaml"
    key: "construct.name"
    error: "Construct identity not configured. Add construct block to .loa.config.yaml"

  - check: "command_exists"
    command: "gh"
    error: "GitHub CLI not found. Install: https://cli.github.com/"

outputs:
  - path: "Terminal dashboard"
    type: "terminal"
    description: "ASCII dashboard of Melange threads"

mode:
  default: "foreground"
  allow_background: false
---
```

### 8.2 Melange Threads Skill

**File**: `.claude/skills/melange-threads/index.yaml`

```yaml
name: "melange-threads"
version: "1.0.0"
model: "sonnet"
color: "cyan"

description: |
  Visualize all Melange threads across the org. Shows blocked, awaiting,
  in-progress, and resolved threads with interactive navigation.

triggers:
  - "/threads"
  - "show melange threads"
  - "melange dashboard"
  - "what's blocked"

examples:
  - context: "User wants to see all active Melange threads"
    user_says: "/threads"
    agent_action: "Launch melange-threads to display dashboard"
  - context: "User wants to see blocked threads only"
    user_says: "/threads --blocked"
    agent_action: "Launch melange-threads with blocked filter"

inputs:
  - name: "mine"
    type: "boolean"
    required: false
    default: false
  - name: "blocked"
    type: "boolean"
    required: false
    default: false
  - name: "resolved"
    type: "boolean"
    required: false
    default: false
  - name: "sync"
    type: "boolean"
    required: false
    default: false

outputs:
  - path: "Dashboard display"
    description: "Unicode box-character dashboard"
```

**File**: `.claude/skills/melange-threads/SKILL.md`

```markdown
# Melange Threads Skill

## Purpose

Display a dashboard of all Melange threads across the org, organized by status.
Enables quick visibility into what's blocked, what needs attention, and what's been resolved.

## Workflow

### Phase 1: Load or Sync Cache

1. Check cache freshness:
   ```bash
   CACHE_FILE="grimoires/loa/melange/threads.json"
   CACHE_AGE=$(stat -f %m "$CACHE_FILE" 2>/dev/null || echo 0)
   NOW=$(date +%s)
   if [ $((NOW - CACHE_AGE)) -gt 300 ] || [ "$SYNC" = "true" ]; then
     # Sync required
   fi
   ```

2. If sync needed, query GitHub:
   ```bash
   gh api graphql -f query='
     query($org: String!) {
       search(query: "org:$org label:melange is:issue", type: ISSUE, first: 100) {
         nodes {
           ... on Issue {
             number
             title
             state
             createdAt
             repository { name }
             labels(first: 10) { nodes { name } }
             comments { totalCount }
           }
         }
       }
     }
   ' -f org="$ORG"
   ```

3. Parse and update cache

### Phase 2: Categorize Threads

Sort threads into categories:

| Category | Criteria |
|----------|----------|
| BLOCKED | Has `status:blocked` label AND sent by this construct |
| AWAITING RESPONSE | Sent by this construct, `status:open`, no response |
| NEEDS TRIAGE | Addressed to this construct, `status:open` |
| IN PROGRESS | Has `status:accepted` label |
| RESOLVED | Has `status:resolved` OR closed in last 7 days |

### Phase 3: Render Dashboard

Use Unicode box characters for terminal-native rendering:

```
╔══════════════════════════════════════════════════════════════════╗
║                    MELANGE THREADS DASHBOARD                      ║
║                         {construct_name}                          ║
╠══════════════════════════════════════════════════════════════════╣
║ Active: {n}    Blocked: {n}    Resolved (7d): {n}                ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ⏳ BLOCKED ({n})                                                 ║
║  └─ {emoji} #{n} {from} → {to}: "{title}"                        ║
║         Waiting {duration} • {impact}                             ║
║                                                                   ║
║  📬 SENT - AWAITING RESPONSE ({n})                                ║
║  ├─ {emoji} #{n} {from} → {to}: "{title}"                        ║
║  │      Sent {duration} ago • {impact} • {status}                 ║
║  └─ ...                                                           ║
║                                                                   ║
║  📥 RECEIVED - NEEDS TRIAGE ({n})                                 ║
║  └─ {emoji} #{n} {from} → {to}: "{title}"                        ║
║         Received {duration} ago • {impact}                        ║
║                                                                   ║
║  ✅ IN PROGRESS ({n})                                             ║
║  └─ {emoji} #{n} {from} → {to}: "{title}"                        ║
║         Accepted {duration} ago • PR #{n} linked                  ║
║                                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║  [T]riage received • [B]locked detail • [R]esolved • [Q]uit      ║
╚══════════════════════════════════════════════════════════════════╝
```

**Rendering Rules:**
- Box characters: `╔ ╗ ╚ ╝ ║ ═ ╠ ╣ ╬`
- Tree characters: `├─ └─ │`
- Impact emojis: 🔴 (game-changing), 🟡 (important), 🟢 (nice-to-have)
- Status icons: ⏳ (blocked), 📬 (sent), 📥 (received), ✅ (in progress)
- Width: 68 characters (fits 80-column terminal with margins)

### Phase 4: Interactive Mode

Handle user input:

| Key | Action |
|-----|--------|
| T | Jump to `/inbox` for triage |
| B | Show blocked thread details |
| R | Show resolved threads |
| 1-9 | Select thread by number |
| O | Open selected in browser |
| Q | Quit dashboard |

### Phase 5: Apply Filters

If flags provided, filter before rendering:

- `--mine`: Keep threads where `from` OR `to` matches construct
- `--blocked`: Keep only BLOCKED category
- `--resolved`: Keep only RESOLVED category (expand to 30 days)

## Duration Formatting

| Range | Format |
|-------|--------|
| < 1 hour | "Nm" (minutes) |
| < 24 hours | "Nh" (hours) |
| < 7 days | "Nd" (days) |
| >= 7 days | "Nw" (weeks) |

## Error Handling

| Error | Resolution |
|-------|------------|
| No threads found | Show "No active Melange threads" |
| Cache file missing | Create empty cache, sync from GitHub |
| GitHub API fails | Show cached data with "⚠ Cached data" warning |
| Rate limited | Show cached data, note "Sync unavailable" |
```

### 8.3 `/send --block` Flag Enhancement

**Modification to**: `.claude/skills/melange-send/SKILL.md`

Add to Phase 1 (Parse & Validate):

```markdown
### Phase 1: Parse & Validate

1. Read construct identity from `.loa.config.yaml`
2. Validate target is in `known_constructs` (or is `human`)
3. Extract brief message from arguments
4. **NEW**: Check for `--block` flag
```

Add new Phase 5.5 (after Create Issue):

```markdown
### Phase 5.5: Handle Blocking (if --block)

If `--block` flag was provided:

1. Add `status:blocked` label to created Issue:
   ```bash
   gh issue edit {number} --repo {repo} --add-label "status:blocked"
   ```

2. Update local cache:
   ```javascript
   // grimoires/loa/melange/threads.json
   cache.blocked.push({
     id: "{repo}#{number}",
     blocked_at: new Date().toISOString(),
     waiting_on: target
   });
   ```

3. Include in Discord notification:
   ```
   ⏳ Sender is blocked waiting for response
   ```
```

### 8.4 `/inbox --from` Filter Enhancement

**Modification to**: `.claude/skills/melange-inbox/SKILL.md`

Add to Phase 1 (Query GitHub):

```markdown
### Phase 1: Query GitHub

Build search query:
```
org:{org} is:issue is:open label:melange label:to:{construct}
```

**NEW**: If `--from` specified, add post-filter:
- Parse Issue body for `From` field
- Filter to only Issues where `from` contains the specified construct(s)
- Support comma-separated: `--from sigil,loa`
```

Update summary display:

```markdown
### Phase 2: Sort & Present Summary

```
📥 Inbox for {construct} (from: {filter}) ({count} issues)
```
```

### 8.5 Local Thread Tracking Schema

**File**: `grimoires/loa/melange/threads.json`

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
      "created_at": "2026-01-22T10:00:00Z",
      "updated_at": "2026-01-22T11:00:00Z",
      "accepted_at": "2026-01-22T11:00:00Z",
      "resolution_pr": null,
      "blocked": false,
      "direction": "received",
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

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier: `{owner}/{repo}#{number}` |
| `repo` | string | Full repository path |
| `number` | number | Issue number |
| `title` | string | Issue title (without [Melange] prefix) |
| `from` | string | Sender in format `{operator}@{construct}` |
| `to` | string | Target construct name |
| `impact` | enum | `game-changing`, `important`, `nice-to-have` |
| `intent` | enum | `request`, `ask`, `report` |
| `status` | enum | `open`, `accepted`, `declined`, `resolved`, `blocked` |
| `direction` | enum | `sent`, `received` |
| `resolution_pr` | string? | PR reference if linked |
| `comments` | number | Comment count |

### 8.6 PR Auto-Linking Workflow

**File**: `.github/workflows/melange-resolve.yml`

```yaml
name: Melange PR Resolution

on:
  issue_comment:
    types: [created]
  pull_request:
    types: [closed]

jobs:
  detect-resolution:
    runs-on: ubuntu-latest
    if: contains(github.event.issue.labels.*.name, 'melange') || github.event.pull_request.merged

    steps:
      - name: Process Resolution
        uses: actions/github-script@v7
        with:
          script: |
            const event = context.eventName;

            if (event === 'issue_comment') {
              // Detect resolution patterns in comments
              const body = context.payload.comment.body;
              const patterns = [
                /resolved?\s+(?:via|in|by)\s+#(\d+)/i,
                /fixed?\s+(?:via|in|by)\s+(?:PR\s*)?#(\d+)/i,
                /closes?\s+#(\d+)/i,
                /resolved?\s+(?:via|in|by)\s+([\w-]+\/[\w-]+)#(\d+)/i
              ];

              for (const pattern of patterns) {
                const match = body.match(pattern);
                if (match) {
                  const prNumber = match[1] || match[2];
                  const prRepo = match[1] ? context.repo.repo : match[1];

                  // Add resolution label
                  await github.rest.issues.addLabels({
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    issue_number: context.payload.issue.number,
                    labels: [`resolution:PR#${prNumber}`]
                  });

                  console.log(`Linked PR #${prNumber} to Issue #${context.payload.issue.number}`);
                  break;
                }
              }
            }

            if (event === 'pull_request' && context.payload.pull_request.merged) {
              // Check if PR closes any Melange Issues
              const body = context.payload.pull_request.body || '';
              const closesPattern = /closes?\s+#(\d+)/gi;
              let match;

              while ((match = closesPattern.exec(body)) !== null) {
                const issueNumber = match[1];

                // Check if it's a Melange Issue
                const issue = await github.rest.issues.get({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: parseInt(issueNumber)
                });

                if (issue.data.labels.some(l => l.name === 'melange')) {
                  // Update status to resolved
                  await github.rest.issues.update({
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    issue_number: parseInt(issueNumber),
                    labels: issue.data.labels
                      .map(l => l.name)
                      .filter(l => !l.startsWith('status:'))
                      .concat(['status:resolved'])
                  });

                  console.log(`Marked Issue #${issueNumber} as resolved`);
                }
              }
            }
```

### 8.7 Human Construct Support

**Configuration Addition**:

```yaml
# .loa.config.yaml
construct:
  name: sigil
  operator: soju
  repo: 0xHoneyJar/sigil
  org: 0xHoneyJar
  known_constructs:
    - sigil
    - loa
    - registry
    - loa-constructs
    - human  # NEW: Enable /send human
  human_discord_id: "259646475666063360"  # NEW: Operator's Discord ID
```

**Behavior Changes**:

1. **Validation**: `human` is always valid target if `human_discord_id` configured
2. **Issue Creation**: Uses `to:human` label
3. **Discord Notification**: Pings `human_discord_id` directly
4. **Dashboard**: Shows in separate "AWAITING HUMAN" section

### 8.8 Updated Data Flow

#### Send with --block Flow

```
User: /send loa "Need auth guidance" --block
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Normal send flow (Phase 1-5)     │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 2. Add status:blocked label         │
│    gh issue edit --add-label        │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 3. Update threads.json              │
│    - Add to threads array           │
│    - Add to blocked array           │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 4. Discord notification             │
│    ⏳ Sender is blocked             │
└─────────────────────────────────────┘
         │
         ▼
✓ Created: github.com/.../issues/42
✓ Marked as BLOCKED - waiting on loa
```

#### Threads Dashboard Flow

```
User: /threads
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Check cache freshness            │
│    threads.json > 5 min old?        │
└─────────────────────────────────────┘
         │
    ┌────┴────┐
    │ stale   │ fresh
    ▼         ▼
┌──────────┐  │
│ 2. Sync  │  │
│ from GH  │  │
└──────────┘  │
    │         │
    └────┬────┘
         ▼
┌─────────────────────────────────────┐
│ 3. Categorize threads               │
│    - BLOCKED                        │
│    - AWAITING RESPONSE              │
│    - NEEDS TRIAGE                   │
│    - IN PROGRESS                    │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 4. Render dashboard                 │
│    Unicode box chars                │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 5. Interactive loop                 │
│    Wait for keypress                │
│    Handle T/B/R/O/Q                 │
└─────────────────────────────────────┘
```

---

## 9. Testing Strategy

### 9.1 Manual Testing (Phase 1)

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

### 9.2 Error Cases (Phase 1)

1. **Missing construct config**: Verify helpful error message
2. **gh not authenticated**: Verify error points to `gh auth login`
3. **Invalid target**: Verify list of valid constructs shown
4. **gh command fails**: Verify error displayed, no state corruption

### 9.3 Manual Testing (Phase 2)

1. **Send with --block**:
   - `/send loa "Test blocking" --block`
   - Verify `status:blocked` label added
   - Verify Discord shows "⏳ Sender is blocked"
   - Verify thread appears in `/threads` under BLOCKED

2. **Inbox with --from**:
   - Create Issues from multiple senders
   - `/inbox --from sigil`
   - Verify only sigil Issues shown
   - `/inbox --from sigil,loa`
   - Verify both senders shown

3. **Threads Dashboard**:
   - Create mixed state Issues (open, accepted, blocked)
   - `/threads`
   - Verify categories display correctly
   - Verify interactive navigation (T/B/R/Q)
   - `/threads --blocked` - verify filter
   - `/threads --mine` - verify filter

4. **Cache Sync**:
   - Delete `threads.json`
   - `/threads` - verify creates new cache
   - Wait 6 minutes, `/threads` - verify auto-sync
   - `/threads --sync` - verify forced refresh

5. **PR Auto-Linking**:
   - Comment "Resolved via PR #123" on Melange Issue
   - Verify `resolution:PR#123` label added
   - Create PR with "Closes #N" for Melange Issue
   - Merge PR
   - Verify `status:resolved` label applied

6. **Human Construct**:
   - Configure `human_discord_id` in config
   - `/send human "Need decision on feature"`
   - Verify Issue created with `to:human`
   - Verify Discord pings configured ID

### 9.4 Error Cases (Phase 2)

1. **Cache corruption**: Delete `threads.json`, run `/threads`
2. **GitHub API rate limit**: Verify cached data shown with warning
3. **Invalid --from filter**: Show "No Issues from {construct}"
4. **--block without network**: Verify graceful failure
5. **Human construct without Discord ID**: Show config error

---

## 10. Future Considerations

### Completed in Phase 1

| Feature | Status |
|---------|--------|
| `/send <target> "<message>"` | ✅ Complete |
| `/inbox` interactive triage | ✅ Complete |
| Construct identity config | ✅ Complete |
| Accept/Decline/Comment actions | ✅ Complete |
| Targeted Discord mentions | ✅ Complete |

### Completed in Phase 2

| Feature | Status |
|---------|--------|
| `/send --block` flag | 🔲 Planned |
| `/inbox --from` filter | 🔲 Planned |
| `/threads` dashboard | 🔲 Planned |
| Local thread tracking | 🔲 Planned |
| PR auto-linking | 🔲 Planned |
| Human construct | 🔲 Planned |
| Cross-repo visibility | 🔲 Planned |

### Out of Scope (Future)

| Feature | Notes |
|---------|-------|
| Slack integration | Discord only for now |
| Multi-org support | Single org (0xHoneyJar) |
| Thread archival automation | Manual cleanup |
| Mobile/web dashboard | CLI only |
| Thread subscriptions | No notification preferences |
| Scheduled triage reminders | No cron jobs |

---

## 11. File Structure Summary (Phase 2)

```
.claude/
├── commands/
│   ├── send.md              # /send command (updated for --block)
│   ├── inbox.md             # /inbox command (updated for --from)
│   └── threads.md           # /threads command (NEW)
├── skills/
│   ├── melange-send/
│   │   ├── index.yaml
│   │   └── SKILL.md         # Updated for --block
│   ├── melange-inbox/
│   │   ├── index.yaml
│   │   └── SKILL.md         # Updated for --from
│   └── melange-threads/     # NEW
│       ├── index.yaml
│       └── SKILL.md
└── scripts/
    └── check-gh-auth.sh

.github/workflows/
├── melange-notify.yml       # Existing (targeted mentions)
└── melange-resolve.yml      # NEW (PR auto-linking)

grimoires/loa/melange/       # NEW directory
└── threads.json             # Local thread cache

.loa.config.yaml             # + human_discord_id field
```

---

## 12. Implementation Priority

Recommended sprint breakdown for Phase 2:

| Sprint | Features | Complexity |
|--------|----------|------------|
| Sprint 5 | `/threads` command + skill, threads.json schema | High |
| Sprint 6 | `/send --block`, `/inbox --from`, cache sync | Medium |
| Sprint 7 | PR auto-linking, human construct, cross-repo | Medium |

---

**Document Status**: Draft (Phase 2 Architecture)
**Next Step**: `/sprint-plan` to create detailed sprint breakdown
