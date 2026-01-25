# Software Design Document: Melange Protocol v2 - Identity & Resolution

**Version**: 1.0.0
**Date**: 2026-01-22
**Author**: Software Architect Agent
**Status**: Draft
**Cycle**: cycle-003
**Builds On**: Melange CLI Integration (PR #24)

---

## 1. Executive Summary

This SDD extends Melange Protocol with two critical capabilities:

1. **Identity Validation**: Cryptographically verify sender identity using GitHub OAuth
2. **Resolution Notifications**: Discord-only notifications when Issues are resolved (no repo bloat)

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Identity Source** | GitHub OAuth via `gh` CLI | Already authenticated, no new credentials |
| **Registry Schema** | Nested `operator` object | Clean separation, backwards compatible with fallback |
| **Resolution Notification** | Discord ping only | Minimizes bloat, human pulls details via `/threads` |
| **Metadata Storage** | HTML comment in Issue body | Invisible to readers, parseable by webhooks |
| **Verification Flow** | `/review-resolution` command | Human-in-the-loop, explicit confirmation |
| **Thread State** | Local JSON cache + GitHub labels | Fast queries, source of truth in GitHub |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MELANGE PROTOCOL v2 - IDENTITY & RESOLUTION              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  IDENTITY CHAIN                          RESOLUTION FLOW                    │
│  ══════════════                          ════════════════                   │
│                                                                             │
│  ┌─────────────┐                         ┌─────────────┐                    │
│  │   gh CLI    │ OAuth Token             │  Receiver   │                    │
│  │  (local)    │────────┐                │   closes    │                    │
│  └─────────────┘        │                │   Issue     │                    │
│         │               ▼                └──────┬──────┘                    │
│         │        ┌─────────────┐                │                           │
│         │        │  GitHub API │                ▼                           │
│         │        │  /user      │         ┌─────────────┐                    │
│         │        └─────────────┘         │ melange-    │                    │
│         │               │                │ resolve.yml │                    │
│         ▼               ▼                └──────┬──────┘                    │
│  ┌─────────────────────────────┐               │                           │
│  │ GET /v1/constructs/:name    │               │ Parse metadata            │
│  │ ─────────────────────────── │               │ from Issue body           │
│  │ {                           │               ▼                           │
│  │   operator: {               │        ┌─────────────┐                    │
│  │     github_username: "X",   │        │  Discord    │                    │
│  │     discord_id: "Y"         │        │  Webhook    │                    │
│  │   }                         │        └──────┬──────┘                    │
│  │ }                           │               │                           │
│  └─────────────────────────────┘               ▼                           │
│         │                              🔔 "@sender: Your thread resolved"   │
│         ▼                                      │                           │
│  ┌─────────────────────────────┐               ▼                           │
│  │ VALIDATION                  │        ┌─────────────┐                    │
│  │ ─────────────────────────── │        │ /threads    │                    │
│  │ if (github_username !== me) │        │ shows       │                    │
│  │   ERROR: "Not authorized"   │        │ "pending    │                    │
│  │ else                        │        │  review"    │                    │
│  │   PROCEED with verified ID  │        └─────────────┘                    │
│  └─────────────────────────────┘                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. System Components

### 2.1 Component Overview

| Component | Location | Purpose |
|-----------|----------|---------|
| **Constructs API** | `apps/api/src/routes/constructs.ts` | Registry with operator GitHub usernames |
| **Identity Validator** | CLI pre-flight (in /send skill) | Validates sender against registry |
| **Metadata Embedder** | /send skill | Embeds tracking data in Issue body |
| **Resolution Webhook** | `melange-resolve.yml` | Triggers on Issue close |
| **Discord Notifier** | Webhook payload | Pings sender on resolution |
| **Thread Tracker** | `grimoires/loa/melange/threads.json` | Local cache with resolution status |
| **Review Command** | `/review-resolution` skill | Human verification workflow |

### 2.2 Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         FULL MESSAGE LIFECYCLE                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SEND PHASE                                                                 │
│  ══════════                                                                 │
│                                                                             │
│  /send sigil "bug"                                                          │
│       │                                                                     │
│       ├─[1]─► gh api user ─────────────────────► "zkSoju"                   │
│       │                                                                     │
│       ├─[2]─► GET /v1/constructs/loa-constructs ─► { operator: { ... } }   │
│       │                                                                     │
│       ├─[3]─► VALIDATE: github_username == "zkSoju" ✓                      │
│       │                                                                     │
│       └─[4]─► gh issue create                                               │
│               ├── Title: "[Melange] Request: bug"                          │
│               ├── Labels: melange, to:sigil, from:loa-constructs           │
│               ├── Body:                                                     │
│               │   ### From (Your Construct + Operator)                      │
│               │   zkSoju@loa-constructs                                     │
│               │   ...                                                       │
│               │   <!-- melange-metadata                                     │
│               │   source_repo: 0xHoneyJar/loa-constructs                   │
│               │   sender_github: zkSoju                                     │
│               │   sender_construct: loa-constructs                          │
│               │   sender_discord: 970593060553646101                        │
│               │   -->                                                       │
│               └── Issue #42 created                                         │
│                                                                             │
│  RECEIVE PHASE (existing melange-notify.yml)                                │
│  ═════════════                                                              │
│                                                                             │
│  Issue #42 opened ──► melange-notify.yml ──► Discord: "@soju: New thread"  │
│                                                                             │
│  TRIAGE PHASE (existing /inbox)                                             │
│  ════════════                                                               │
│                                                                             │
│  /inbox ──► Accept #42 ──► status:accepted label                           │
│                                                                             │
│  RESOLUTION PHASE (NEW)                                                     │
│  ════════════════                                                           │
│                                                                             │
│  Close Issue #42                                                            │
│       │                                                                     │
│       └─[5]─► melange-resolve.yml triggers                                  │
│               │                                                             │
│               ├── Parse <!-- melange-metadata --> from body                 │
│               │   ├── sender_github: zkSoju                                 │
│               │   ├── sender_construct: loa-constructs                      │
│               │   └── sender_discord: 970593060553646101                    │
│               │                                                             │
│               ├── Add label: status:resolved                                │
│               │                                                             │
│               └── Discord webhook:                                          │
│                   ├── Ping: <@970593060553646101>                           │
│                   └── Message: "✅ Your thread to sigil was resolved"       │
│                                                                             │
│  VERIFICATION PHASE (NEW)                                                   │
│  ══════════════════                                                         │
│                                                                             │
│  /threads ──► Shows "sigil#42: pending review"                             │
│       │                                                                     │
│       └─► /review-resolution                                                │
│           │                                                                 │
│           ├── Display: Original Issue + Resolution summary                  │
│           │                                                                 │
│           └── Human action:                                                 │
│               ├── Verify ✅ ──► Update threads.json: verified              │
│               ├── Reopen ❌ ──► Create follow-up Issue                     │
│               └── Comment 💬 ──► Add comment, keep pending                  │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. API Design

### 3.1 Registry Schema Update

**Current Schema** (v1):
```typescript
{
  name: 'sigil',
  operator: 'soju',           // String - display name only
  discord_id: '259646475666063360',
  status: 'active',
}
```

**Proposed Schema** (v2):
```typescript
{
  name: 'sigil',
  display_name: 'Sigil',
  description: 'Creative speed, grounded in truth.',
  repo: '0xHoneyJar/sigil',
  operator: {
    display_name: 'soju',
    github_username: 'zkSoju',      // NEW: validated identity
    discord_id: '259646475666063360',
  },
  status: 'active',
}
```

**Migration Strategy**:
- v2 API returns nested `operator` object
- Backwards compatibility: If client accesses `response.operator` as string, it fails gracefully
- CLI updated to access `response.operator.github_username`

### 3.2 Constructs Registry Update

Update `apps/api/src/routes/constructs.ts`:

```typescript
const CONSTRUCTS_REGISTRY = {
  version: '2.0.0',  // Bump version
  org: '0xHoneyJar',
  last_updated: '2026-01-22',

  framework: {
    name: 'loa',
    display_name: 'Loa',
    description: 'The mother Construct.',
    repo: '0xHoneyJar/loa',
    operator: {
      display_name: 'jani',
      github_username: 'jani',  // TODO: Get actual username
      discord_id: '970593060553646101',
    },
  },

  registry: {
    name: 'loa-constructs',
    display_name: 'Loa Constructs',
    description: 'Central registry and API.',
    repo: '0xHoneyJar/loa-constructs',
    api: 'https://loa-constructs-api.fly.dev/v1',
    operator: {
      display_name: 'soju',
      github_username: 'zkSoju',
      discord_id: '970593060553646101',
    },
  },

  constructs: [
    {
      name: 'sigil',
      display_name: 'Sigil',
      description: 'Design physics for products.',
      repo: '0xHoneyJar/sigil',
      operator: {
        display_name: 'soju',
        github_username: 'zkSoju',
        discord_id: '259646475666063360',
      },
      status: 'active',
    },
    // ... other constructs
  ],

  virtual: [
    {
      name: 'human',
      display_name: 'Human',
      description: 'Escalate to human operator.',
      note: "Uses human_discord_id from sender's config",
    },
  ],
};
```

### 3.3 OpenAPI Spec Update

Add to `apps/api/src/docs/openapi.ts`:

```typescript
// Update Construct schema
Construct: {
  type: 'object',
  properties: {
    name: { type: 'string' },
    display_name: { type: 'string' },
    description: { type: 'string' },
    repo: { type: 'string' },
    operator: { $ref: '#/components/schemas/Operator' },  // Changed from string
    status: { type: 'string', enum: ['active', 'inactive'] },
  },
},

// New Operator schema
Operator: {
  type: 'object',
  properties: {
    display_name: { type: 'string', example: 'soju' },
    github_username: { type: 'string', example: 'zkSoju' },
    discord_id: { type: 'string', example: '259646475666063360' },
  },
},
```

---

## 4. Issue Metadata Format

### 4.1 Metadata Structure

Embedded as HTML comment at the end of Issue body (invisible to readers):

```markdown
<!-- melange-metadata
source_repo: 0xHoneyJar/loa-constructs
sender_github: zkSoju
sender_construct: loa-constructs
sender_discord: 970593060553646101
created_at: 2026-01-22T10:30:00Z
-->
```

### 4.2 Parsing Logic

```javascript
function parseMelangeMetadata(body) {
  const match = body.match(/<!-- melange-metadata\n([\s\S]*?)\n-->/);
  if (!match) return null;

  const metadata = {};
  const lines = match[1].trim().split('\n');
  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      metadata[key.trim()] = valueParts.join(':').trim();
    }
  }
  return metadata;
}
```

### 4.3 /send Skill Updates

Update `/send` to embed metadata:

```typescript
// After validation, build Issue body
const metadata = `
<!-- melange-metadata
source_repo: ${config.construct.repo}
sender_github: ${githubUsername}
sender_construct: ${config.construct.name}
sender_discord: ${operatorDiscordId}
created_at: ${new Date().toISOString()}
-->`;

const issueBody = `
### From (Your Construct + Operator)

${githubUsername}@${config.construct.name}

### To (Receiving Construct)

${targetConstruct}

### Impact

${impact}

### Intent

${intent}

### What are you experiencing?

${experience}

### What would help?

${request}

${metadata}
`;
```

---

## 5. Resolution Webhook

### 5.1 melange-resolve.yml

New workflow file for all Construct repos:

```yaml
name: Melange Resolution Notification

on:
  issues:
    types: [closed]

jobs:
  notify-resolution:
    runs-on: ubuntu-latest
    if: contains(github.event.issue.labels.*.name, 'melange')

    steps:
      - name: Notify Sender of Resolution
        uses: actions/github-script@v7
        env:
          DISCORD_WEBHOOK: ${{ secrets.MELANGE_DISCORD_WEBHOOK }}
        with:
          script: |
            const issue = context.payload.issue;
            const body = issue.body || '';

            // Parse melange-metadata from Issue body
            const metadataMatch = body.match(/<!-- melange-metadata\n([\s\S]*?)\n-->/);
            if (!metadataMatch) {
              console.log('No melange-metadata found, skipping');
              return;
            }

            const metadata = {};
            const lines = metadataMatch[1].trim().split('\n');
            for (const line of lines) {
              const [key, ...valueParts] = line.split(':');
              if (key && valueParts.length) {
                metadata[key.trim()] = valueParts.join(':').trim();
              }
            }

            const {
              sender_github,
              sender_construct,
              sender_discord,
              source_repo
            } = metadata;

            if (!sender_discord) {
              console.log('No sender_discord in metadata, skipping');
              return;
            }

            // Add status:resolved label
            await github.rest.issues.addLabels({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: issue.number,
              labels: ['status:resolved']
            });

            // Remove status:accepted if present
            try {
              await github.rest.issues.removeLabel({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issue.number,
                name: 'status:accepted'
              });
            } catch (e) {
              // Label might not exist, ignore
            }

            // Send Discord notification to sender
            const webhook = process.env.DISCORD_WEBHOOK;
            if (!webhook) {
              console.log('No Discord webhook configured');
              return;
            }

            // Extract receiving construct from labels
            const labels = issue.labels.map(l => l.name);
            const toLabel = labels.find(l => l.startsWith('to:'));
            const toConstruct = toLabel ? toLabel.replace('to:', '') : context.repo.repo;

            const title = issue.title.replace('[Melange] ', '');

            const payload = {
              content: `<@${sender_discord}>`,
              embeds: [{
                title: `✅ Thread Resolved: ${title}`,
                url: issue.html_url,
                color: 5763719, // Green
                fields: [
                  { name: "From", value: `${sender_github}@${sender_construct}`, inline: true },
                  { name: "To", value: toConstruct, inline: true },
                  { name: "Status", value: "Resolved - pending your review", inline: true }
                ],
                footer: {
                  text: `Run /threads --pending-review to verify • ${context.repo.repo}#${issue.number}`
                },
                timestamp: new Date().toISOString()
              }]
            };

            const response = await fetch(webhook, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (!response.ok) {
              const text = await response.text();
              core.setFailed(`Discord webhook failed: ${response.status} ${text}`);
            } else {
              console.log(`Resolution notification sent to ${sender_github}`);
            }
```

### 5.2 Workflow Deployment

Deploy to all Construct repos in the org:
- `0xHoneyJar/loa`
- `0xHoneyJar/loa-constructs`
- `0xHoneyJar/sigil`
- `0xHoneyJar/hivemind-os`
- `0xHoneyJar/ruggy-security`

---

## 6. Thread Status Lifecycle

### 6.1 Status Transitions

```
┌─────────────────────────────────────────────────────────────────┐
│                     THREAD STATUS LIFECYCLE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐                                                   │
│   │  OPEN    │◄─────────────────────────────────────────────┐   │
│   │  (new)   │                                               │   │
│   └────┬─────┘                                               │   │
│        │                                                     │   │
│        │ /inbox: Accept                                      │   │
│        ▼                                                     │   │
│   ┌──────────┐                                               │   │
│   │ ACCEPTED │                                               │   │
│   │          │                                               │   │
│   └────┬─────┘                                               │   │
│        │                                                     │   │
│        │ Receiver closes Issue                               │   │
│        ▼                                                     │   │
│   ┌──────────────────┐                                       │   │
│   │ RESOLVED         │                                       │   │
│   │ (pending review) │───────────────────────────────────┐   │   │
│   └────┬─────────────┘                                   │   │   │
│        │                                                 │   │   │
│        │ /review-resolution                              │   │   │
│        │                                                 │   │   │
│   ┌────┼────────────────────────────────┐               │   │   │
│   │    │                                │               │   │   │
│   │    ▼                                ▼               │   │   │
│   │ ┌──────────┐                   ┌──────────┐         │   │   │
│   │ │ VERIFIED │                   │ REOPENED │─────────┼───┘   │
│   │ │ (done)   │                   │          │         │       │
│   │ └──────────┘                   └──────────┘         │       │
│   │                                                     │       │
│   │ Terminal state                  Creates new Issue   │       │
│   │                                 with context        │       │
│   │                                                     │       │
│   └─────────────────────────────────────────────────────┘       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Label Mapping

| Status | Label | Applied By |
|--------|-------|------------|
| Open | `status:open` | /send (default) |
| Accepted | `status:accepted` | /inbox Accept action |
| Declined | `status:declined` | /inbox Decline action |
| Resolved | `status:resolved` | melange-resolve.yml |
| Verified | `status:verified` | /review-resolution Verify action |
| Reopened | `status:reopened` | /review-resolution Reopen action |

### 6.3 threads.json Schema Update

```typescript
interface Thread {
  issue_number: number;
  repo: string;
  title: string;
  from: string;          // "zkSoju@loa-constructs"
  to: string;            // "sigil"
  impact: 'game-changing' | 'important' | 'nice-to-have';
  status: 'open' | 'accepted' | 'declined' | 'resolved' | 'verified' | 'reopened';
  created_at: string;
  updated_at: string;
  resolved_at?: string;  // NEW: When Issue was closed
  verified_at?: string;  // NEW: When sender verified
  url: string;
}
```

---

## 7. CLI Commands

### 7.1 Identity Validation in /send

Add pre-flight validation to `/send`:

```typescript
// Step 1: Get GitHub username from gh CLI
const { stdout: githubUsername } = await exec('gh api user --jq .login');

// Step 2: Read construct from config
const constructName = config.construct.name;

// Step 3: Fetch from registry API
const response = await fetch(
  `https://loa-constructs-api.fly.dev/v1/constructs/${constructName}`
);
const construct = await response.json();

// Step 4: Validate
if (response.status === 404) {
  throw new Error(`Construct '${constructName}' not found in registry`);
}

if (!construct.operator?.github_username) {
  console.warn(`Warning: No github_username set for ${constructName}. Proceeding without validation.`);
} else if (construct.operator.github_username.toLowerCase() !== githubUsername.toLowerCase()) {
  throw new Error(
    `GitHub user '${githubUsername}' is not authorized to send as '${constructName}'.\n` +
    `Expected: ${construct.operator.github_username}\n` +
    `Register at: https://constructs.network/register`
  );
}

// Step 5: Proceed with verified identity
const fromField = `${githubUsername}@${constructName}`;
```

### 7.2 /review-resolution Command

New command file `.claude/commands/review-resolution.md`:

```yaml
---
name: "review-resolution"
version: "1.0.0"
description: |
  Review and verify resolved Melange threads.
  Human verifies that resolutions address the original concern.

arguments:
  - name: "all"
    type: "flag"
    required: false
    description: "Show all resolved threads (including already verified)"

agent: "melange-review"
agent_path: "skills/melange-review/"

pre_flight:
  - check: "config_exists"
    path: ".loa.config.yaml"
    key: "construct.name"
    error: "Construct identity not configured"

  - check: "command_exists"
    command: "gh"
    error: "GitHub CLI not found"
---

# /review-resolution Command

## Purpose

Review resolved Melange threads and verify they address your concerns.

## Invocation

```bash
/review-resolution                # Pending review only
/review-resolution --all          # Include verified
```

## Workflow

1. Query for resolved threads from sender's construct
2. Display original Issue + resolution summary
3. Human action: Verify, Reopen, or Comment
4. Update thread status

## Actions

| Action | Effect |
|--------|--------|
| **Verify** | Mark as verified, archive from pending |
| **Reopen** | Create follow-up Issue with context |
| **Comment** | Add comment, keep in pending |
| **Skip** | Move to next thread |
```

### 7.3 /threads Updates

Update `/threads` to show resolution status:

```
MELANGE THREADS DASHBOARD
loa-constructs
────────────────────────────────────────

Active: 3    Blocked: 1    Pending Review: 2    Verified (7d): 1

⏳ BLOCKED (1)

| # | Thread | To | Impact | Age |
|---|--------|-----|--------|-----|
| 1 | #42 Auth architecture guidance | loa | 🔴 game-changing | 2h |

📬 SENT - AWAITING RESPONSE (1)

| # | Thread | To | Impact | Age |
|---|--------|-----|--------|-----|
| 2 | #26 Testing targeted mentions | sigil | 🟡 important | 2h |

🔔 RESOLVED - PENDING REVIEW (2)

| # | Thread | To | Resolved | Age |
|---|--------|-----|----------|-----|
| 3 | #38 API error codes | ruggy | 1h ago | 5d |
| 4 | #35 Auth flow docs | loa | 3h ago | 7d |

✅ Recently Verified (7d): 1
   └─ #30 Config validation
```

---

## 8. Security Considerations

### 8.1 Identity Validation

| Threat | Mitigation |
|--------|------------|
| Spoofed operator name | GitHub OAuth validates identity |
| Registry tampering | API is read-only, data in code |
| Metadata injection | HTML comment sanitized |
| Cross-construct impersonation | github_username must match |

### 8.2 Webhook Security

| Threat | Mitigation |
|--------|------------|
| Webhook URL exposure | Stored in GitHub Secrets |
| Replay attacks | Timestamp in metadata |
| Spam notifications | Only on Issue close |

---

## 9. Implementation Sprints

### Sprint 1: Registry & Identity (Estimated: 2-3 tasks)
- Update CONSTRUCTS_REGISTRY schema
- Add github_username to all constructs
- Update OpenAPI spec
- Deploy API

### Sprint 2: Send Integration (Estimated: 3-4 tasks)
- Add getGitHubUsername() helper
- Add registry validation pre-flight
- Update From field format
- Embed melange-metadata in Issue body
- Add from:{construct} label

### Sprint 3: Resolution Webhook (Estimated: 2-3 tasks)
- Create melange-resolve.yml
- Test on loa-constructs repo
- Deploy to all Construct repos

### Sprint 4: Review Command (Estimated: 3-4 tasks)
- Create /review-resolution command
- Implement verification workflow
- Update threads.json schema
- Update /threads dashboard

---

## 10. Testing Strategy

### 10.1 Identity Validation Tests

| Test | Input | Expected |
|------|-------|----------|
| Valid operator | zkSoju sending as loa-constructs | Success |
| Invalid operator | other-user sending as loa-constructs | Error |
| Unregistered construct | Sending as unknown-construct | Error |
| Missing github_username | Construct without github_username | Warning, proceed |

### 10.2 Resolution Flow Tests

| Test | Scenario | Expected |
|------|----------|----------|
| Close with metadata | Close Issue with melange-metadata | Discord ping sent |
| Close without metadata | Close old Issue without metadata | No notification |
| Verify resolution | Run /review-resolution, select Verify | Status updated |
| Reopen resolution | Run /review-resolution, select Reopen | New Issue created |

---

## 11. Rollout Plan

### Phase 1: Soft Launch (Week 1)
- Deploy registry schema update
- Update /send with validation (warn-only mode)
- Test internally

### Phase 2: Resolution Webhook (Week 2)
- Deploy melange-resolve.yml to loa-constructs
- Test end-to-end flow
- Deploy to remaining repos

### Phase 3: Full Enforcement (Week 3)
- Enable identity validation blocking
- Release /review-resolution command
- Update documentation

---

## 12. Appendix

### A. GitHub Username Mapping

| Construct | Operator | GitHub Username | Discord ID |
|-----------|----------|-----------------|------------|
| loa | jani | jani | 970593060553646101 |
| loa-constructs | soju | zkSoju | 970593060553646101 |
| sigil | soju | zkSoju | 259646475666063360 |
| hivemind | soju | zkSoju | 970593060553646101 |
| ruggy | soju | zkSoju | 970593060553646101 |

### B. Label Colors

| Label | Color | Hex |
|-------|-------|-----|
| melange | Purple | #7B61FF |
| to:* | Blue | #0052CC |
| from:* | Cyan | #00B8D9 |
| status:open | Yellow | #FFAB00 |
| status:accepted | Green | #36B37E |
| status:declined | Red | #FF5630 |
| status:resolved | Blue | #0065FF |
| status:verified | Green | #00875A |
| impact:game-changing | Red | #FF5630 |
| impact:important | Yellow | #FFAB00 |
| impact:nice-to-have | Gray | #97A0AF |
