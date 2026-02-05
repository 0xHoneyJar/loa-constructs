# Agentation Integration Guide

Agentation enables precise visual feedback by capturing element selectors when you click on UI problems. Version 2 introduces **MCP (Model Context Protocol)** integration, allowing agents to fetch annotations directly from a local server without manual copy-paste.

## What is Agentation v2?

[Agentation](https://github.com/benjitaylor/agentation) is a React component and MCP server that bridges the gap between visual feedback and code changes.

### Key Capabilities

| Feature | Description |
|---------|-------------|
| **MCP Server** | Annotations stored in local session database, accessible via Claude Code MCP tools |
| **Session Management** | Multiple annotation sessions with pending/acknowledged/resolved states |
| **Smart Filtering** | Agents query only pending annotations, automatically acknowledge after reading |
| **Structured Schema** | Each annotation includes `id`, `comment`, `element`, `elementPath`, `reactComponents`, `intent`, `severity` |
| **Zero Copy-Paste** | Agents fetch annotations directly from MCP server using `agentation_get_pending` |

### Architecture

```
User annotates UI → Agentation Component → MCP Server (stdio) → Claude Code MCP Tools → Agent reads pending annotations
```

**v1 (Legacy)**: User annotates → copies markdown → pastes to agent
**v2 (MCP)**: User annotates → agent automatically fetches via MCP tools

## Quick Start: MCP (Recommended)

### 1. Install Package

```bash
npm install agentation-mcp
```

### 2. Add React Component

Add `<Agentation />` to your app's root:

```tsx
import { Agentation } from 'agentation';

function App() {
  return (
    <>
      <YourApp />
      <Agentation />
    </>
  );
}
```

### 3. Configure Claude Code MCP

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "agentation": {
      "command": "npx",
      "args": ["agentation-mcp", "server"]
    }
  }
}
```

### 4. Start MCP Server

```bash
npx agentation-mcp server
```

The server launches with stdio transport and connects to Claude Code automatically.

### 5. Verify Installation

Run the doctor command to check MCP connectivity:

```bash
npx agentation-mcp doctor
```

Expected output:
- MCP server reachable
- Sessions database initialized
- Claude Code MCP connection active

## Quick Start: Legacy v1 (Copy-Paste)

If you prefer the original workflow without MCP:

### 1. Install Component

```bash
npm install agentation -D
```

### 2. Add to App

```tsx
import { Agentation } from 'agentation';

function App() {
  return (
    <>
      <YourApp />
      <Agentation />
    </>
  );
}
```

### 3. Manual Workflow

1. Click Agentation icon (bottom-right)
2. Select UI element
3. Add comment
4. Click "Copy" to get markdown
5. Paste markdown into Claude Code conversation

**Format**:
```markdown
## Annotation

**Element**: `.card-shadow`
**Position**: (234, 156)
**Note**: Shadow too heavy
**Selector**: `[class*="shadow-md"]`
```

## Per-Skill Integration

### `/iterate-visual` (Artisan)

**Purpose**: Screenshot-based design iteration with feedback loop

**MCP Workflow**:
1. Agent takes screenshot of current state
2. User clicks Agentation to annotate issues
3. Agent calls `agentation_get_pending` to fetch annotations
4. Agent maps selectors to code locations
5. Agent proposes fixes based on structured feedback
6. Agent calls `agentation_acknowledge` for processed annotations

**Intent Support**: `fix`, `change`, `approve`
**Severity Handling**: `blocking` items processed first

### `/decompose-feel` (Artisan)

**Purpose**: Decompose vague aesthetic feedback into actionable changes

**MCP Workflow**:
1. User provides vague feedback ("feels off")
2. Agent offers Agentation as precision tool
3. User annotates specific UI elements
4. Agent calls `agentation_get_pending` to fetch granular feedback
5. Agent decomposes each annotation into concrete design tokens
6. Agent calls `agentation_resolve` after implementing changes

**Intent Support**: `question` (clarify aesthetic intent), `change` (apply decomposed changes)

### `/iterate-feedback` (Crucible)

**Purpose**: Capture implementation gaps during feedback review

**MCP Workflow with `--annotate` flag**:
1. Agent presents implementation for review
2. User runs `/iterate-feedback --annotate`
3. User annotates gaps/issues visually
4. Agent calls `agentation_get_pending --intent=fix` to filter implementation issues
5. Agent creates tasks for each gap
6. Agent calls `agentation_acknowledge` after task creation

**Intent Filtering**: Only reads `intent: fix` and `intent: change` annotations
**Severity Priority**: `blocking` → `important` → `suggestion`

### `/observe-users` (Observer)

**Purpose**: Structured user research evidence collection

**MCP Workflow with `--annotate` flag**:
1. Agent conducts user research session
2. User runs `/observe-users --annotate`
3. User annotates behavioral evidence on UI
4. Agent calls `agentation_get_pending --intent=question` to fetch research observations
5. Agent synthesizes patterns across annotations
6. Agent calls `agentation_resolve` after documenting findings

**Intent Filtering**: Reads `intent: question` and `intent: approve` for research evidence
**Session Grouping**: Each observation session stored separately

## Annotation Schema Reference

Each annotation captured by Agentation follows this structure:

```typescript
{
  id: string;                    // Unique annotation identifier (e.g., "anno-1738779123456")
  comment: string;               // User's feedback text
  element: string;               // CSS selector (e.g., ".card-shadow", "[data-testid='btn']")
  elementPath: string;           // DOM path (e.g., "div > header > button.primary")
  reactComponents: string[];     // Inferred React components (e.g., ["Card", "CardHeader"])
  intent: string;                // fix | change | question | approve
  severity: string;              // blocking | important | suggestion
}
```

### Intent Values

| Intent | Meaning | Used By |
|--------|---------|---------|
| `fix` | Bug or broken behavior | `/iterate-feedback`, `/iterate-visual` |
| `change` | Desired modification | `/decompose-feel`, `/iterate-visual` |
| `question` | Clarification needed | `/observe-users`, `/decompose-feel` |
| `approve` | Positive feedback | `/observe-users`, `/iterate-visual` |

### Severity Values

| Severity | Meaning | Priority |
|----------|---------|----------|
| `blocking` | Must fix before proceeding | 1 (highest) |
| `important` | Should fix soon | 2 |
| `suggestion` | Nice to have | 3 (lowest) |

## MCP Tools Reference

Agentation provides 9 MCP tools accessible to agents via Claude Code:

| Tool | Description |
|------|-------------|
| `agentation_list_sessions` | List all annotation sessions with metadata (session_id, timestamp, annotation_count) |
| `agentation_get_session` | Retrieve all annotations for a specific session_id |
| `agentation_get_pending` | Fetch annotations with state=pending for current session (most common) |
| `agentation_get_all_pending` | Fetch pending annotations across all sessions (for cross-session analysis) |
| `agentation_acknowledge` | Mark annotation as acknowledged (state: pending → acknowledged) |
| `agentation_resolve` | Mark annotation as resolved (state: acknowledged → resolved) |
| `agentation_dismiss` | Dismiss annotation as not actionable (state: pending → dismissed) |
| `agentation_reply` | Add agent response to annotation thread (e.g., "Implemented fix in commit abc123") |
| `agentation_wait_for_action` | Block until user adds new annotation (polling for feedback) |

### Tool Usage Examples

**Fetch pending feedback**:
```json
{
  "name": "agentation_get_pending",
  "arguments": {
    "intent": "fix",
    "severity": "blocking"
  }
}
```

**Acknowledge after processing**:
```json
{
  "name": "agentation_acknowledge",
  "arguments": {
    "annotation_id": "anno-1738779123456"
  }
}
```

**Resolve after implementation**:
```json
{
  "name": "agentation_resolve",
  "arguments": {
    "annotation_id": "anno-1738779123456"
  }
}
```

**Add implementation note**:
```json
{
  "name": "agentation_reply",
  "arguments": {
    "annotation_id": "anno-1738779123456",
    "reply": "Fixed shadow weight in Card.tsx:45 by changing shadow-md to shadow-sm"
  }
}
```

## Troubleshooting

### MCP Server Not Connecting

**Symptoms**: Agent cannot call agentation tools, "MCP server unreachable" error

**Solutions**:
1. Verify MCP server is running: `ps aux | grep agentation-mcp`
2. Check Claude Code MCP config in `~/.claude/settings.json`
3. Restart MCP server: `npx agentation-mcp server`
4. Run doctor: `npx agentation-mcp doctor`

### Agentation Component Not Appearing

**Symptoms**: No annotation UI in bottom-right corner

**Solution**: Ensure `<Agentation />` is rendered after app content:
```tsx
<>
  <YourApp />
  <Agentation />  {/* Must be last */}
</>
```

### No Pending Annotations Found

**Symptoms**: Agent calls `agentation_get_pending` but returns empty array

**Solutions**:
1. Verify you added annotations via Agentation UI
2. Check session_id matches current session
3. Confirm annotations weren't already acknowledged
4. Use `agentation_list_sessions` to see all sessions

### Selector Not Found in Codebase

**Symptoms**: Agent receives annotation but cannot locate code with `element` selector

**Solutions**:
1. Check if element uses dynamic classes (CSS modules, Tailwind)
2. Use `reactComponents` field to infer file names (e.g., ["Card"] → Card.tsx)
3. Search for partial matches with `elementPath`
4. Look for `data-testid` attributes as stable selectors

### Clipboard Copy Not Working (Legacy v1)

**Symptoms**: "Copy" button in Agentation UI fails silently

**Solutions**:
1. Check browser clipboard permissions
2. Use MCP mode instead (no clipboard needed)
3. Try HTTPS if using HTTP (some browsers restrict clipboard on HTTP)

### State Transition Errors

**Symptoms**: Cannot resolve annotation, "must acknowledge first" error

**Solution**: Follow state machine order:
```
pending → acknowledged → resolved
        ↓
     dismissed
```

Call `agentation_acknowledge` before `agentation_resolve`.

## Pack Integration Status

MCP servers are a **network-level concern** defined in `.claude/mcp-registry.yaml`. No pack "owns" or "provides" an MCP server — all packs are equal consumers that declare what they need via `mcp_dependencies`.

| Pack | Integration |
|------|-------------|
| **Artisan** | Consumes Agentation via `mcp_dependencies` (9 scopes) |
| **Crucible** | Consumes Agentation via `mcp_dependencies` (2 scopes) |
| **Observer** | Consumes Agentation via `mcp_dependencies` (2 scopes) |
| **Beacon** | No Agentation integration |

**Server configuration**: See `.claude/mcp-registry.yaml` → `servers.agentation` for transport, command, and security settings.

## Related

- [Agentation GitHub](https://github.com/benjitaylor/agentation)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [iterating-visuals skill](/apps/sandbox/packs/artisan/skills/iterating-visuals/SKILL.md)
- [decomposing-feel skill](/apps/sandbox/packs/artisan/skills/decomposing-feel/SKILL.md)
- [iterating-feedback skill](/apps/sandbox/packs/crucible/skills/iterating-feedback/SKILL.md)
- [observing-users skill](/apps/sandbox/packs/observer/skills/observing-users/SKILL.md)
