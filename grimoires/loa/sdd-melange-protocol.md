# SDD: Melange Protocol v2

## Executive Summary

Melange is an inter-Construct messaging protocol built on GitHub Issues and Discord webhooks. This document describes the architecture as implemented in PR #24.

**Status**: Implementation complete, pending merge to main.

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MELANGE PROTOCOL v2                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐             │
│  │   SENDER     │     │   REGISTRY   │     │   RECEIVER   │             │
│  │   REPO       │     │   API        │     │   REPO       │             │
│  │              │     │              │     │              │             │
│  │ /send ───────┼────►│ /constructs  │     │ /inbox ◄─────┼─ Query      │
│  │              │     │              │     │              │             │
│  │ Issue ───────┼─┐   │ operator.id  │     │ Accept/      │             │
│  │ Created      │ │   │              │     │ Decline      │             │
│  └──────────────┘ │   └──────────────┘     └──────────────┘             │
│                   │                                │                     │
│                   ▼                                ▼                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      GITHUB ACTIONS                               │   │
│  │                                                                   │   │
│  │  melange-notify.yml          melange-resolve.yml                  │   │
│  │  ├─ On: issues.opened        ├─ On: issues.closed                 │   │
│  │  ├─ Fetch operator.discord   ├─ On: issue_comment                 │   │
│  │  └─ POST to Discord webhook  ├─ On: pull_request.merged           │   │
│  │                              └─ Update labels + notify sender     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                   │                                │                     │
│                   ▼                                ▼                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                         DISCORD                                   │   │
│  │                                                                   │   │
│  │  #melange channel                                                 │   │
│  │  ├─ 🔴 game-changing: Red embed + @here                           │   │
│  │  ├─ 🟡 important: Yellow embed + @operator                        │   │
│  │  └─ ✅ resolved: Green embed + @sender                            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Design

### 2.1 CLI Skills (Claude Code)

| Skill | Purpose | Location |
|-------|---------|----------|
| `melange-send` | Create Melange Issues with structured form | `.claude/skills/melange-send/` |
| `melange-inbox` | Triage incoming Issues | `.claude/skills/melange-inbox/` |
| `melange-threads` | Org-wide thread dashboard | `.claude/skills/melange-threads/` |
| `melange-review` | Verify/reopen resolved threads | `.claude/skills/melange-review/` |

**Skill Architecture**:
```
.claude/skills/melange-{name}/
├── index.yaml      # Metadata, feature_flag, triggers
└── SKILL.md        # Detailed workflow instructions
```

**Feature Flag**:
```yaml
# index.yaml
feature_flag: "melange.enabled"
integrations:
  required:
    - name: "melange"
      check: ".claude/scripts/melange-setup.sh check"
```

### 2.2 GitHub Actions Workflows

#### melange-notify.yml

**Trigger**: `issues.opened` with label `melange`

**Flow**:
```javascript
1. Parse issue body for to/from/impact/intent
2. Fetch target operator from Registry API
3. Build Discord embed based on impact level
4. POST to MELANGE_DISCORD_WEBHOOK secret
5. @mention operator.discord_id
```

**Embed Colors**:
| Impact | Color | Action |
|--------|-------|--------|
| game-changing | 0xFF0000 (red) | @here ping |
| important | 0xFFAA00 (yellow) | @operator ping |
| nice-to-have | 0x00AA00 (green) | No notification |

#### melange-resolve.yml

**Triggers**:
- `issues.closed` with label `melange`
- `issue_comment.created` (detect PR links)
- `pull_request.merged` (detect Issue closures)

**Flow**:
```javascript
1. Check if closed via PR merge (skip if PR handler will process)
2. Extract melange-metadata from issue body
3. Update labels: status:open → status:resolved
4. Send Discord notification to sender_discord
5. Link resolution PR if detected
```

**Duplicate Prevention**:
```javascript
// Check timeline for PR-linked closure
const closedByPR = timeline.data.some(event => {
  if (event.event === 'closed' && event.commit_id) return true;
  if (event.event === 'cross-referenced' && event.source?.issue?.pull_request?.merged_at) return true;
  return false;
});
if (closedByPR) return; // PR handler will process
```

### 2.3 Registry API

**Endpoint**: `https://loa-constructs-api.fly.dev/v1/constructs`

**Schema (v2)**:
```typescript
interface Construct {
  name: string;           // "sigil"
  display_name: string;   // "Sigil"
  description: string;
  repo: string;           // "0xHoneyJar/sigil"
  operator: {
    display_name: string; // "soju"
    github_username: string; // "zkSoju"
    discord_id: string;   // "259646475666063360"
  };
  status: "active" | "inactive";
}
```

**Used By**:
- `melange-notify.yml` - Fetch operator.discord_id for @mentions
- `/send` skill - Validate target construct exists

### 2.4 Configuration

**Location**: `.loa.config.yaml`

```yaml
melange:
  enabled: true                    # Feature flag
  auto_install: true               # Install workflows on first use
  registry_url: "https://loa-constructs-api.fly.dev/v1"
  construct:
    name: sigil                    # This repo's identity
    repo: 0xHoneyJar/sigil
    org: 0xHoneyJar
  known_constructs: [...]          # Valid targets
  human_discord_id: "..."          # For /send human
  discord_secret_name: "MELANGE_DISCORD_WEBHOOK"
```

---

## 3. Data Model

### 3.1 GitHub Issue Structure

**Title**: `[Melange] {Intent}: {Summary}`

**Labels**:
| Label | Purpose | Values |
|-------|---------|--------|
| `melange` | Protocol identifier | - |
| `to:{construct}` | Routing | `to:loa`, `to:sigil` |
| `from:{construct}` | Sender filter | `from:sigil` |
| `impact:{level}` | Priority | `game-changing`, `important`, `nice-to-have` |
| `intent:{type}` | Message type | `request`, `ask`, `report` |
| `status:{state}` | Lifecycle | `open`, `accepted`, `declined`, `resolved`, `verified`, `reopened` |

**Body Template**:
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
source_repo: {repo}
sender_github: {username}
sender_construct: {construct}
sender_discord: {discord_id}
created_at: {timestamp}
-->
```

### 3.2 Thread Lifecycle

```
┌────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  OPEN  │────►│ ACCEPTED │────►│ RESOLVED │────►│ VERIFIED │
└────────┘     └──────────┘     └──────────┘     └──────────┘
    │               │                 │
    ▼               ▼                 ▼
┌──────────┐   (work in      ┌──────────┐
│ DECLINED │    progress)    │ REOPENED │
└──────────┘                 └──────────┘
```

| Transition | Trigger | Actor |
|------------|---------|-------|
| → open | /send creates issue | Sender |
| open → accepted | /inbox accept | Receiver |
| open → declined | /inbox decline | Receiver |
| accepted → resolved | Close issue | Receiver |
| resolved → verified | /review-resolution verify | Sender |
| resolved → reopened | /review-resolution reopen | Sender |

---

## 4. Security Architecture

### 4.1 Authentication

**GitHub OAuth**: Identity validated via `gh api user`
```bash
# Get authenticated username
gh api user --jq '.login'
# Returns: "zkSoju"
```

**No Ownership Check**: Anyone with repo access can send as that Construct (like GitHub permissions).

### 4.2 Secrets Management

| Secret | Scope | Purpose |
|--------|-------|---------|
| `MELANGE_DISCORD_WEBHOOK` | Per-repo | Discord notification endpoint |

**Access**: Only GitHub Actions can read secrets.

### 4.3 Data Privacy

- Issue content is public (standard GitHub visibility)
- Discord IDs are stored in registry (semi-public)
- No PII beyond GitHub usernames

---

## 5. Installation & Distribution

### 5.1 Distribution Package

```
melange/
├── install.sh                    # One-command install
├── README.md                     # Protocol documentation
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── melange.yml           # Issue form template
│   └── workflows/
│       ├── melange-notify.yml
│       └── melange-resolve.yml
└── scripts/
    └── create-labels.sh          # Label setup
```

### 5.2 Installation Methods

**Method A: curl install**
```bash
curl -fsSL https://raw.githubusercontent.com/0xHoneyJar/loa-constructs/main/melange/install.sh | bash
```

**Method B: Feature flag (Loa repos)**
```yaml
# .loa.config.yaml
melange:
  enabled: true
  auto_install: true  # Workflows installed on first /send
```

### 5.3 Auto-Install Flow

```
1. User runs /send
2. Skill checks: melange-setup.sh check
3. Workflows not found + auto_install: true
4. Downloads workflows from loa-constructs repo
5. Creates GitHub labels
6. Continues with /send
```

---

## 6. Integration Points

### 6.1 External Dependencies

| Dependency | Purpose | Fallback |
|------------|---------|----------|
| GitHub API | Issue CRUD, label management | None (required) |
| GitHub CLI | Authentication, issue creation | None (required) |
| Discord Webhook | Notifications | Silent (issues still work) |
| Registry API | Operator lookup | Hardcoded OPERATOR_MAP |

### 6.2 Registry API Fallback

If registry is unavailable, workflows use hardcoded operator map:
```javascript
const OPERATOR_MAP = {
  'loa': '970593060553646101',
  'sigil': '259646475666063360',
  // ...
};
```

---

## 7. File Inventory

### Skills
- `.claude/skills/melange-send/` - /send command
- `.claude/skills/melange-inbox/` - /inbox command
- `.claude/skills/melange-threads/` - /threads command
- `.claude/skills/melange-review/` - /review-resolution command

### Workflows
- `.github/workflows/melange-notify.yml` - Notify on issue create
- `.github/workflows/melange-resolve.yml` - Handle resolution

### Scripts
- `.claude/scripts/melange-setup.sh` - Check/install Melange

### Distribution
- `melange/install.sh` - One-command installer
- `melange/scripts/create-labels.sh` - Label setup
- `melange/.github/workflows/` - Workflow templates
- `melange/.github/ISSUE_TEMPLATE/` - Issue form

### Configuration
- `.loa.config.yaml` → `melange:` block

---

## 8. Deployment Checklist

### Per-Construct Setup

1. [ ] Install Melange (curl or auto_install)
2. [ ] Set `MELANGE_DISCORD_WEBHOOK` secret
3. [ ] Configure `melange:` block in `.loa.config.yaml`
4. [ ] Register Construct in Registry API (if not already)
5. [ ] Commit and push workflow files

### Org-Wide Setup

1. [ ] Merge PR #24 to activate workflows on loa-constructs
2. [ ] Create Discord `#melange` channel
3. [ ] Create webhook, distribute to all Construct repos
4. [ ] Install Melange on: sigil, hivemind, ruggy, loa

---

## 9. Future Considerations

### v2.1 Scope
- Per-Construct Discord channels (stored in registry)
- Thread analytics endpoint
- Bulk triage in /inbox

### v3.0 Scope
- Cross-org communication
- Thread templates
- SLA tracking

### Technical Debt
- Hardcoded OPERATOR_MAP in workflows (should always fetch from API)
- No retry logic on Discord webhook failures
- No thread caching (always queries GitHub)
