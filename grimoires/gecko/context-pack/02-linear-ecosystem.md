# Linear Ecosystem — Agent SDK, CLI, MCP, API Surface

> the comfortable platform. the one that actually has taxonomy.

## Linear Agent SDK

Linear shipped a first-class **Agent SDK** — not just webhooks-that-call-back, but a real identity model for software agents operating inside Linear workspaces.

### Core Concepts

| Concept | What It Means |
|---------|--------------|
| **Agent Identity** | Agents get their own Linear identity (not impersonating a user). Shows up in activity feeds as "Agent: Gecko" |
| **AgentSession** | Lifecycle object — agent "starts" a session on an issue, does work, "completes" it. Linear tracks session state |
| **Delegation Model** | Humans assign issues TO the agent. Agent picks them up, works on them, reports back. Not polling — event-driven |
| **10-Second Rule** | Agent must acknowledge within 10 seconds of receiving a delegation. Can take longer to complete, but must ACK fast |
| **Progress Updates** | Agent posts structured progress (not just comments) — Linear renders these natively in the issue timeline |

### Agent Registration

```
POST /agent/register
{
  "name": "Gecko",
  "description": "Ecosystem intelligence agent for constructs network",
  "capabilities": ["triage", "classify", "investigate", "escalate"],
  "webhook_url": "https://api.constructs.network/v1/agent/webhook"
}
```

Agents register capabilities. Linear uses these to suggest which issues can be delegated to which agents.

### Session Lifecycle

```
DELEGATED → ACKNOWLEDGED (10s) → IN_PROGRESS → COMPLETED/FAILED
```

The agent doesn't just comment on issues — it has a structured lifecycle visible in the UI.

### What This Means for Gecko

Gecko shouldn't be a webhook reactor that creates Linear issues. Gecko should BE a Linear agent that:
1. Gets issues delegated to it
2. Acknowledges within 10s
3. Investigates (reads signals, checks repos, queries dashboards)
4. Reports structured findings
5. Closes or escalates

This is a fundamentally different architecture than "bot watches webhooks and posts comments."

## Linear CLI Landscape

### Official Linear CLI
- Minimal — mostly for auth and basic issue creation
- Not designed for agent use cases
- No batch operations, no pipeline scripting

### Community CLIs

| Tool | Author | Approach | Token Efficiency |
|------|--------|----------|-----------------|
| `schpet/linear-cli` | schpet | Full CRUD, Go binary, structured output | Excellent — JSON mode, pipe-friendly |
| `dorkitude/linctl` | dorkitude | kubectl-inspired, resource-based verbs | Good — familiar UX for infra people |
| `linear-mcp` (official) | Linear | MCP server for AI agents | Poor — high token overhead for simple ops |

### Why CLI > MCP for Linear

The official Linear MCP server supports:
- List/create/update issues
- List/search projects
- Add comments

That's it. No labels, no cycles, no views, no custom fields, no bulk ops.

A CLI wrapping the GraphQL API gets you:
- Full API surface (everything MCP doesn't expose)
- Scriptable pipelines (`gecko triage --since 1h | gecko classify | gecko route`)
- Token efficiency (structured output, no MCP protocol overhead)
- Composability (pipe to jq, grep, other CLIs)
- Batch operations (bulk label, bulk assign, bulk close)

### Hybrid Architecture (Recommended)

```
CLI (gecko-cli)
├── Actions: create, triage, classify, route, escalate, close
├── Queries: list, search, stats, dashboard
├── Pipelines: triage-all, digest, patrol
└── MCP bridge: expose CLI commands as MCP tools for agents that need it

MCP (gecko-mcp)
├── Context injection: read Linear state into agent context
├── Thin wrapper over CLI
└── For agents running in MCP-native environments (Cursor, Claude Desktop)

Agent SDK (gecko-agent)
├── Register as Linear agent
├── Accept delegations
├── Post progress updates
├── Session lifecycle management
└── Calls CLI internally for actual work
```

The CLI does the work. The MCP provides context. The Agent SDK manages identity and lifecycle.

## Linear GraphQL API — Key Surfaces

### What Gecko Needs

| Surface | API | Why |
|---------|-----|-----|
| Issues CRUD | `issue`, `issueCreate`, `issueUpdate` | Core triage loop |
| Labels | `issueLabels`, `issueLabelCreate` | Classification taxonomy |
| Projects | `projects`, `projectUpdate` | Signal routing to the right project |
| Comments | `commentCreate` | Agent progress updates |
| Webhooks | Webhook subscriptions | Real-time event stream |
| Custom Fields | `customViewFields` | Structured metadata (severity, signal type) |
| Cycles | `cycles`, `cycleCreate` | Sprint alignment |
| Teams | `teams` | Multi-team routing (infra vs product) |
| Users | `users` | Delegation targets |

### Rate Limits

- 1,500 requests per hour (per workspace)
- 50 requests per second burst
- Complexity-based: nested queries count more
- Pagination: cursor-based, 50 items default, 250 max

### Authentication

- Personal API keys (what we have: `lin_api_b63Z...`)
- OAuth2 apps (for multi-workspace)
- Agent tokens (via Agent SDK registration)

For Gecko: start with personal API key, migrate to Agent SDK token once registered.

## Linear Webhooks — Event Stream

### Events We Care About

| Event | Action |
|-------|--------|
| `Issue.create` | Check if it came from signals pipeline, skip if yes |
| `Issue.update` (state change) | Track resolution of escalated signals |
| `Issue.update` (assignment) | Detect delegation to Gecko agent |
| `Comment.create` | Human feedback on agent triage |
| `Label.update` | Taxonomy changes that affect routing |

### Existing Webhook Integration

Already wired in `apps/explorer/convex/linear.ts`:
- Receives webhook events at `/api/webhooks/linear`
- Currently handles: status sync (issue closed → signal resolved)
- Team ID: `466d92ac-5b8d-447d-9d2b-cc320ee23b31` (same team from ruggy-v2)

The infrastructure layer is already connected. The webhook handler just needs expansion.

## The 466d Pattern

The same Linear team ID appears in:
1. `ruggy-v2` — original community agent
2. `apps/explorer/convex/linear.ts` — new signals pipeline
3. Future: Gecko agent registration

This isn't coincidence — it's lineage. Ruggie's team workspace is becoming Gecko's operating theater. The issues, the labels, the taxonomy that Ruggie built up over time? That's Gecko's training data.

## Gaps to Fill

| Gap | Impact | Fix |
|-----|--------|-----|
| No agent registration | Can't use delegation model | Register Gecko via Agent SDK |
| No structured progress | Updates are just comments | Use AgentSession progress API |
| Label taxonomy incomplete | Classification is ad-hoc | Design taxonomy from signal categories |
| No bulk operations | Can't batch-triage | CLI with pipeline support |
| Single team routing | Everything goes to one team | Multi-team routing (infra/product/design) |
| No cycle alignment | Signals disconnected from sprints | Map incidents to active cycles |

## Token Efficiency Analysis

| Approach | Tokens per triage op | Composable | Real-time |
|----------|---------------------|------------|-----------|
| MCP (official) | ~2,000 | No | No |
| Raw GraphQL | ~500 | Manual | Via webhooks |
| CLI (structured) | ~300 | Yes (pipes) | Via watch mode |
| Agent SDK | ~800 | Via CLI | Yes (delegation) |

CLI wins on efficiency. Agent SDK wins on identity. Use both.
