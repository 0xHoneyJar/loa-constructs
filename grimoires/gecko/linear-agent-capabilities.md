# Linear Agent Integration — Capabilities Research

> **Date**: 2026-03-12
> **Source**: Deep research via K-Hole construct (131 web searches)
> **Purpose**: Integration architecture for centralized observability dashboard

---

## Key Finding: Linear Agent SDK (Developer Preview)

Linear has built a first-party Agent Interaction SDK that goes beyond read/write APIs. Agents are first-class citizens in the Linear workspace.

### Agent Identity Model

- Agents installed via OAuth2 with `actor=app` parameter
- Two new scopes: `app:assignable` (appears in assignee dropdown) and `app:mentionable` (can be @-mentioned)
- Agents are **clearly marked as agents, not people** in the UI
- Assignment sets agent as **delegate**, not assignee — humans retain ownership

### AgentSession Lifecycle

```
Trigger (assign/mention) → Webhook → Activity Stream → Completion
```

1. User assigns issue to agent or @-mentions agent in comment
2. Linear sends `created AgentSessionEvent` webhook
3. Agent must respond within **10 seconds** or marked unresponsive
4. Agent emits semantic activities: thoughts, tool calls, clarifications, responses, errors
5. Session states visible to users: waiting, working, completed, errored

### Proactive Sessions

Agents can create sessions without user trigger:
- `agentSessionCreateOnIssue` mutation
- `agentSessionCreateOnComment` mutation

This enables: feedback webhook → agent creates issue → agent creates session → auto-triage.

---

## Integration Paths

| Approach | Auth | Best For | Complexity |
|---|---|---|---|
| **Official Remote MCP** (`mcp.linear.app/mcp`) | OAuth 2.1 | Claude/Cursor direct integration | Low |
| **npm MCP package** (`@modelcontextprotocol/server-linear`) | API key | Self-hosted, custom MCP clients | Low |
| **Agent SDK** (Developer Preview) | OAuth2 + `actor=app` | First-class Linear agent with delegation | Medium |
| **Direct GraphQL API** (`api.linear.app/graphql`) | API key or OAuth2 | Custom integrations, bulk ops | Medium |

### Recommended for Constructs Network

**Agent SDK for inbound** (apps → agent → Linear) + **MCP for agent-side** (Claude reads/manages via MCP).

---

## API Details

### GraphQL Endpoint
- `https://api.linear.app/graphql`
- TypeScript SDK with typed models and mutations

### Key Mutations
- `issueCreate` — title, description, teamId, labelIds, priority, projectId, assigneeId
- `issueUpdate` — update any field by issue ID
- `commentCreate` — add comments to issues
- `projectCreate` / `projectUpdate` — project lifecycle

### Rate Limits

| Auth Method | Limit |
|---|---|
| API key | 1,500 req/hr per user |
| OAuth app | 500 req/hr per user/app |
| Complexity budget | 250,000 points/hr (API key) |

### API Key Scoping
Keys can be restricted to specific permissions AND scoped to specific teams — useful for per-app routing.

---

## Webhooks

### Supported Events
Issues, Comments, Attachments, Documents, Projects, Project Updates, Cycles, Labels, Users, Issue SLAs, **Agent Session Events**.

### Payload Format
```
Headers:
  Linear-Delivery: <uuid>
  Linear-Event: Issue | IssueComment | Project | ...
  Linear-Signature: <hmac-sha256-hash>
  Content-Type: application/json

Body:
  action: "create" | "update" | "remove"
  type: "Issue" | "IssueComment" | ...
  data: { ...full object... }
  updatedFrom: { ...previous values... }
```

### Delivery
- Must respond HTTP 200 within **5 seconds**
- Retries: 3 attempts (1 min, 1 hour, 6 hours)
- Persistent failures → webhook auto-disabled

### Security
- HMAC-SHA256 signature verification
- IP address validation available
- `LinearWebhookClient` in SDK handles verification

---

## Multi-Product Routing Architecture

### Team Structure (Recommended)

```
Workspace: 0xHoneyJar
├── Team: EXP (Explorer / Constructs Network)
├── Team: SAF (Set-and-Forgetti)
├── Team: CUB (CubQuests / Faucet)
├── Team: MIB (Mibera)
├── Team: MID (Midi)
├── Team: MCR (MCV / The Mint)
├── Team: RKT (Rektdrop)
├── Team: HUB (Hub)
└── Team: INF (Infrastructure — API, DNS, Railway, Vercel)
```

### Label Taxonomy (Workspace-level, shared across teams)

Aligned with Observer's gap taxonomy:
```
Type:     bug | feature-request | flow-issue | communication | strategy
Severity: critical | high | medium | low
Source:   user-feedback | error-tracking | uptime-monitor | agent-created | manual
Signal:   [adapted from Observer signal weight classification]
```

### Triage Flow
1. Agent/monitor creates issue in team with `Triage` status
2. Human reviews in Linear triage queue
3. Accepted → moves to backlog/sprint
4. Rejected → archived with reason

### Per-Team Webhooks
Each team can have its own webhook endpoint, enabling:
- Different notification routing per app
- Per-product automation rules
- Isolated blast radius for webhook failures

---

## Ecosystem Integrations Already Live

| Integration | What it does |
|---|---|
| **Cursor** | Delegates Linear issues to Cursor agent for implementation |
| **OpenAI Codex** | Delegates issues to Codex agent from Linear |
| **Intercom/Zendesk/Gong** | Parses customer conversations into filed issues |
| **Google ADK** | Linear natively supported in Google's Agent Development Kit |

---

## MCP Server Details

### Official Remote Server (May 2025)
- **Streamable HTTP**: `https://mcp.linear.app/mcp`
- **SSE/legacy**: `https://mcp.linear.app/sse`
- **Auth**: OAuth 2.1 with dynamic client registration
- Supersedes community `@anthropic/linear-mcp`

### Tools Available via MCP

| Tool | Purpose |
|---|---|
| `search_issues` | Search with filters (assignee, priority, status, labels, dates) |
| `create_issue` | Create with title, description, teamId, labels, priority |
| `linear_update_issue` | Update fields (known bug: `status` requires UUID stateId) |
| `linear_get_user_issues` | Issues assigned to current user |
| `linear_get_user_teams` | Teams the authenticated user belongs to |
| `linear_get_projects` | List projects (filterable by team) |
| `linear_create_label` / `linear_get_labels` | Label CRUD per team |

### Resources (URI-based)
- `linear-issue:///{issueId}` — individual issue details
- `linear-user:///{userId}/assigned` — user's assigned issues
- `linear-team:///{teamId}/issues` — team's issues

---

## References

- [Linear Developers — Agents](https://linear.app/developers/agents)
- [Linear Developers — Agent Interaction](https://linear.app/developers/agent-interaction)
- [Linear Developers — Agent Interaction Guidelines](https://linear.app/developers/aig)
- [Linear MCP Docs](https://linear.app/docs/mcp)
- [Linear Developers — Webhooks](https://linear.app/developers/webhooks)
- [Linear Developers — SDK Webhooks](https://linear.app/developers/sdk-webhooks)
- [Linear Developers — GraphQL](https://linear.app/developers/graphql)
