# Melange Protocol v2

> *Structured feedback loops for AI-assisted teams.*

Melange is a communication protocol for **Constructs** — human-AI pairs working as a unit. It enables structured, traceable feedback across distributed teams using GitHub Issues and Discord notifications.

**v2 Features:**
- Identity validation via GitHub OAuth
- Sender Discord notifications on resolution
- `from:construct` labels for filtering
- Review-resolution workflow for verification

---

## The Ecosystem

```
┌─────────────────────────────────────────────────────────────────────┐
│                              LOA                                     │
│                      (Mother Framework)                              │
│                   github.com/0xHoneyJar/loa                         │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        LOA CONSTRUCTS                                │
│                    (Central Registry & API)                          │
│               github.com/0xHoneyJar/loa-constructs                  │
│                                                                      │
│   • Skills marketplace (constructs.network)                         │
│   • Melange Protocol integration                                    │
│   • /send, /inbox, /threads CLI commands                            │
│   • Construct registry (melange/constructs.json)                    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┬───────────────┐
            ▼               ▼               ▼               ▼
     ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
     │   Sigil   │   │  Hivemind │   │   Ruggy   │   │    ...    │
     │  (Design) │   │(Org Docs) │   │(Security) │   │           │
     └───────────┘   └───────────┘   └───────────┘   └───────────┘
         Loa-powered Constructs (instances using the framework)
```

### Construct Registry

All internal Constructs are served by the **Loa Constructs API**:

```bash
# Get full registry
curl https://loa-constructs-api.fly.dev/v1/constructs

# Get operator map for workflow
curl https://loa-constructs-api.fly.dev/v1/constructs/operator-map

# Get specific construct
curl https://loa-constructs-api.fly.dev/v1/constructs/sigil
```

| Construct | Description | Operator |
|-----------|-------------|----------|
| **loa** | Mother framework | jani |
| **loa-constructs** | Registry & API | soju |
| **sigil** | Design physics | soju |
| **hivemind** | Org memory | soju |
| **ruggy** | Security auditing | soju |
| **human** | Virtual: escalate to operator | (sender's config) |

### Which Layer Do I Use?

| You want to... | Use |
|----------------|-----|
| Set up Melange on a new repo | Copy files from this template |
| Send feedback from terminal | `/send` command in Claude Code |
| Add a new Construct to registry | Update API at `/v1/constructs` |
| Customize for your org | Fork and modify |

---

## The Problem

When multiple human-AI teams work in the same org, feedback gets messy:

- Issues pile up in the wrong repos
- Urgent requests get lost in noise
- No clear signal of intent or impact
- AI agents auto-process without human judgment

## The Solution

Melange is a **sender-side outbox protocol**. When you have feedback for another team:

1. **You create the Issue in YOUR repo** (not theirs)
2. **Discord notifies them** with structured context
3. **They review and respond** in your Issue thread
4. **Resolution requires artifacts** (PRs with evidence)

This keeps backlogs clean while enabling tight feedback loops.

---

## What's a Construct?

A **Construct** is a human-AI pair working as a unit. Examples:

- `soju@Sigil` — soju (human) + Sigil AI agent
- `jani@Loa` — jani (human) + Loa AI agent

Melange enables Constructs to communicate with clear intent and human oversight.

---

## Core Principles

| Principle | Why |
|-----------|-----|
| **Sender owns the noise** | Issues live in sender's repo, not receiver's |
| **Structured intent** | Form captures impact, evidence, request, reasoning |
| **Human-in-the-loop always** | No auto-processing; humans accept/decline every Issue |
| **Artifact-gated commitment** | Conversations stay fluid; commitments require PRs |

---

## Quick Start

### Option A: One-Command Install (Recommended)

```bash
# From your repository root:
curl -fsSL https://raw.githubusercontent.com/0xHoneyJar/loa-constructs/main/melange/install.sh | bash
```

This will:
1. Download workflow files to `.github/workflows/`
2. Create all required GitHub labels
3. Prompt for Discord webhook configuration
4. Update `.loa.config.yaml` with construct identity (if exists)

### Option B: Loa Framework (With CLI)

If your repo uses the [Loa Framework](https://github.com/0xHoneyJar/loa-constructs):

```bash
# Configure construct identity in .loa.config.yaml
construct:
  name: your-construct
  operator: your-name
  repo: your-org/your-repo
  org: your-org
  known_constructs:
    - sigil
    - loa
    - registry

# Then use CLI commands
/send loa "Error messages don't include file paths"
/inbox
/threads
```

---

## Workflow

```
Sigil identifies pain point → Creates Melange Issue in sigil repo
  → Discord notifies Loa → Loa operator reviews in sigil repo
  → Loa operator comments "Accepted" → Loa creates PR in loa repo
  → PR merged → Loa comments "Resolved via loa#49" → Issue closed
```

See [docs/workflow.md](docs/workflow.md) for the complete Issue lifecycle.

---

## Impact Levels

| Impact | When to Use | Discord Notification |
|--------|-------------|---------------------|
| **game-changing** | Blocks core workflow | Red embed + operator ping |
| **important** | Significant friction | Yellow embed |
| **nice-to-have** | Improvement idea | Silent (GitHub search only) |

### Discord Notification Preview

```
┌─────────────────────────────────────────────┐
│ 🟡 Request: Improve error messages          │
├─────────────────────────────────────────────┤
│ From: soju@Sigil    To: loa    Intent: ask  │
├─────────────────────────────────────────────┤
│ Experience                                  │
│ Error messages don't include context...     │
├─────────────────────────────────────────────┤
│ Request                                     │
│ Add file path and line number to errors     │
├─────────────────────────────────────────────┤
│ Melange Protocol • sigil#42    Jan 22, 2026 │
└─────────────────────────────────────────────┘
```

---

## Repository Contents

```
melange/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── melange.yml           # Issue form template
│   └── workflows/
│       ├── melange-notify.yml    # Discord notification action
│       └── melange-resolve.yml   # PR resolution tracking
├── scripts/
│   └── create-labels.sh          # Label setup script
├── docs/
│   ├── setup.md                  # Installation guide
│   └── workflow.md               # Workflow documentation
└── README.md                     # This file
```

---

## Documentation

- [Setup Guide](docs/setup.md) — Install Melange on your repository
- [Workflow Guide](docs/workflow.md) — Understand the Issue lifecycle

---

## Loa Framework Integration

For AI-assisted CLI workflows, see [Loa Constructs](https://github.com/0xHoneyJar/loa-constructs):

| Command | Purpose |
|---------|---------|
| `/send <target> "<message>"` | Create Melange Issue with AI assistance |
| `/inbox` | Interactive triage of incoming Issues |
| `/threads` | Dashboard of all Melange activity |

These commands wrap the protocol with Claude Code integration, providing structured prompts and human-in-the-loop enforcement.

---

## Prerequisites

- [GitHub CLI](https://cli.github.com/) (`gh`) — for setup and CLI commands
- Discord webhook URL — for notifications

---

## License

MIT

---

Part of the [Loa Framework](https://github.com/0xHoneyJar/loa-constructs) ecosystem.
