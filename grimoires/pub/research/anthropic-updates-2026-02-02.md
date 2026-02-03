# Anthropic Oracle Analysis: Workflow Tracking & PM Integration

**Date**: 2026-02-02
**Scope**: Loa Framework Enhancement
**Focus**: Claude Code built-in features for workflow tracking and PM integrations

---

## Executive Summary

- **MCP is the bridge**: Claude Code's Model Context Protocol already supports GitHub, Linear, Jira integrations - Loa can leverage these for natural language PM commands
- **Memory system is extensible**: CLAUDE.md hierarchy + rules system provides infrastructure for session-to-issue linking
- **Session management exists**: `--from-pr`, `/resume`, session naming enable PR-conversation pairing
- **Gap identified**: No native session-to-GitHub-Project linking - this is a Loa opportunity
- **Recommended action**: Build a `/pm` skill that wraps MCP integrations with Loa's skill system

---

## Key Findings

### 1. MCP Integration Capabilities

Claude Code already provides rich PM tool integrations via MCP:

| Integration | Status | Capabilities | Priority |
|-------------|--------|--------------|----------|
| **GitHub** | Available | PR creation, issue management, code reviews, Projects | **Primary** |
| **Slack** | Available | Team notifications | Secondary |
| **Linear** | Available | Issue tracking (limited for conversations) | Optional |
| **Jira** | Available | Ticket management, sprint tracking | Optional |
| **Asana** | Available | Task management | Optional |

**Installation is one command**:
```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
claude mcp add --transport sse linear https://mcp.linear.app/sse
```

**What Loa can do**: Create a `/pm` skill that:
1. Auto-detects configured MCP servers
2. Provides natural language commands like "create issue for current sprint"
3. Links conversations to issues/PRs automatically

### 2. Session-to-PR Linking (Already Built)

Claude Code has native session-PR linking:

```bash
# Resume session linked to PR
claude --from-pr 123

# Session auto-links when creating PR via gh pr create
```

**Loa opportunity**: Extend this pattern to:
- GitHub Projects
- Linear projects
- Sprint tracking

### 3. Memory System for Workflow State

Claude Code's memory hierarchy supports workflow tracking:

| Level | Use for Workflow Tracking |
|-------|---------------------------|
| `CLAUDE.md` | Team workflow conventions |
| `.claude/rules/*.md` | Path-specific PM triggers |
| `CLAUDE.local.md` | Personal project/issue preferences |
| `~/.claude/CLAUDE.md` | Cross-project PM settings |

**Example** - Auto-post PRs to Slack:
```markdown
# CLAUDE.md
## Workflow
- When creating PRs, post to #team-prs channel
- Link issues using format: Closes #123
```

### 4. Skills + MCP = Natural Language PM

Loa's skill system can wrap MCP tools:

```yaml
# .claude/skills/pm-workflow/SKILL.md
name: pm-workflow
description: Natural language project management

triggers:
  - "create issue"
  - "update sprint"
  - "link PR"

requires_mcp:
  - github
  - linear
```

This enables prompts like:
- "Create an issue for the auth bug we just fixed"
- "Link this conversation to PROJ-123"
- "What's left in the current sprint?"

---

## Gaps Analysis

| Anthropic Offers | Loa Currently Lacks | Opportunity |
|------------------|---------------------|-------------|
| MCP GitHub/Linear/Jira | No unified PM skill | Build `/pm` command |
| Session-PR linking | No session-Project linking | Extend grimoire tracking |
| Memory hierarchy | No workflow state persistence | Add `grimoires/loa/workflow.yaml` |
| Subagents | No PM-focused agent | Create `pm-coordinator` agent |

---

## Recommended Actions

### Priority 1: Build `/pm` Skill (Low Effort / High Value)

Create a skill that wraps MCP integrations:

```bash
/pm status        # Show linked issues, PRs, sprint status
/pm link #123     # Link current session to issue
/pm create-issue  # Create issue from conversation context
/pm sprint        # Show sprint progress from Linear/Jira
```

**Implementation path**:
1. Check for configured MCP servers (github, linear, jira)
2. Auto-detect project context from grimoire
3. Execute natural language → MCP tool translation

### Priority 2: Session Workflow Tracking (Medium Effort / High Value)

Add workflow state to grimoire:

```yaml
# grimoires/loa/workflow.yaml
current_session:
  id: abc123
  linked_issues:
    - github:0xHoneyJar/loa#154
    - linear:ENG-4521
  linked_prs:
    - github:0xHoneyJar/loa#153
  sprint: sprint-22
```

Benefits:
- Conversations persist across sessions
- `/resume` shows linked context
- Automatic "what was I working on?" recall

### Priority 3: PM Coordinator Agent (Higher Effort / Future)

Create a subagent for PM coordination:

```yaml
# .claude/agents/pm-coordinator.yaml
name: pm-coordinator
description: Coordinates project management across GitHub, Linear, Slack
tools:
  - mcp:github
  - mcp:linear
  - mcp:slack
system_prompt: |
  You help manage development workflows:
  - Track what issues are being worked on
  - Create PRs with proper linking
  - Post updates to appropriate channels
```

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Loa /pm Skill                            │
├─────────────────────────────────────────────────────────────┤
│  Natural Language Commands                                   │
│  "create issue" → MCP github create_issue                   │
│  "link to sprint" → MCP linear link_issue                   │
│  "post update" → MCP slack post_message                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Claude Code MCP Layer                        │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   GitHub     │    Linear    │    Jira      │    Slack       │
│   MCP        │    MCP       │    MCP       │    MCP         │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

---

## Configuration Example

```yaml
# .loa.config.yaml
pm:
  integrations:
    github:
      enabled: true
      auto_link_prs: true
      default_labels: ["loa-generated"]
    linear:
      enabled: true
      team: "ENG"
      default_project: "Loa Framework"
    slack:
      enabled: true
      pr_channel: "#team-prs"
      issue_channel: "#engineering"

  workflow:
    auto_create_issues: false  # Require confirmation
    link_conversations: true   # Track session→issue links
    sprint_tracking: true      # Show sprint context
```

---

## Next Steps

1. **Validate MCP availability** - Check which MCP servers are commonly installed
2. **Prototype `/pm` skill** - Start with GitHub-only, expand to Linear
3. **Add to sprint-23** - Include as enhancement task
4. **Gather feedback** - Use `/feedback` to track PM workflow friction

---

## References

- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp)
- [Claude Code Memory Management](https://code.claude.com/docs/en/memory)
- [Claude Code Common Workflows](https://code.claude.com/docs/en/common-workflows)
- [MCP Registry API](https://api.anthropic.com/mcp-registry/docs)
- Loa Feedback Issue: [#154](https://github.com/0xHoneyJar/loa/issues/154)
