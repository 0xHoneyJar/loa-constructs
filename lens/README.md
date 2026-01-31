# 🔮 Sigil of Insight (Lens Pack)

> *"Form hypotheses, not conclusions. Every quote is evidence, not answer."*

User truth capture skills for **hypothesis-first research**. Capture user feedback, shape journeys, analyze gaps, and file issues—all grounded in real user quotes.

## Skills (6)

| Command | Skill | Phase | Output |
|---------|-------|-------|--------|
| `/observe` | `observing-users` | Capture | User Truth Canvas (UTC) |
| `/shape` | `shaping-journeys` | Synthesis | Journey Definition |
| - | `level-3-diagnostic` | Framework | Conversation Templates |
| `/analyze-gap` | `analyzing-gaps` | Analysis | Gap Report |
| `/file-gap` | `filing-gaps` | Action | GitHub/Linear Issue |
| `/import-research` | `importing-research` | Migration | Converted UTCs |

---

## Workflow

### Phase 1: Capture (`/observe`)

```
User Feedback → Level 3 Diagnostic → User Truth Canvas
```

- Capture **verbatim quotes** with sentiment markers
- Form **hypotheses** (not conclusions)
- Assign **confidence scores** (None/Low/Medium/High)
- Auto-detect **crypto/DeFi cultural context**

### Phase 2: Synthesis (`/shape`)

```
Multiple UTCs → JTBD Clustering → Journey Definition
```

- Cluster canvases by **Jobs-to-be-Done** similarity
- Infer **state transitions** from user expectations
- Generate **success conditions** from quotes
- Map **journey dependencies**

### Phase 3: Analysis (`/analyze-gap`)

```
Journey + Code Reality → Gap Report
```

- Compare **user expectations** vs **code behavior**
- Auto-classify **severity** based on JTBD impact
- Calculate **user impact scores**
- Suggest **resolution recommendations**

### Phase 4: Action (`/file-gap`)

```
Gap Report → Tracked Issue
```

- Infer **taxonomy labels** from gap content
- Calculate **priority** from severity + impact
- Select **issue template** (Bug/Feature/Experiment)
- Detect **Linear/GitHub** and format appropriately

---

## Installation

```bash
# From your project root
cp -r /path/to/forge/lens .claude/constructs/packs/lens
.claude/constructs/packs/lens/scripts/install.sh .
```

---

## Grimoire Structure

After installation:

```
grimoires/lens/
├── canvas/       # User Truth Canvases (UTCs)
│   └── {user-id}-{timestamp}.md
├── journeys/     # Journey Definitions
│   └── {jtbd-slug}.md
└── state.yaml    # Lens state tracking
```

---

## Context Composition

Lens includes a cultural context system for crypto/DeFi user research:

| Context | File | Purpose |
|---------|------|---------|
| **Base** | `crypto-base.md` | Universal crypto patterns (wallets, gas, signatures) |
| **Berachain** | `berachain-overlay.md` | Berachain-specific (BGT, validators, PoL) |
| **DeFi** | `defi-overlay.md` | Protocol terminology (LPs, yields, vaults) |

### Compose Contexts

```bash
# Generate composed context for your project
.claude/constructs/packs/lens/scripts/compose-context.sh .
```

Output: `contexts/composed/full-context.md`

---

## Templates

| Template | Purpose |
|----------|---------|
| `canvas-template.md` | UTC structure with hypothesis fields |
| `journey-template.md` | Journey definition with state transitions |

---

## Key Concepts

### User Truth Canvas (UTC)

The core artifact. Contains:

```yaml
user_id: "discord-alice-123"
session_date: "2026-01-30"
hypotheses:
  - statement: "User expects instant feedback on deposit"
    confidence: medium
    supporting_quotes: ["I clicked and nothing happened"]
unknowns:
  - "What timeout threshold triggers anxiety?"
```

### Level 3 Diagnostic

Based on "The Mom Test" methodology:

| Level | Focus | Example |
|-------|-------|---------|
| L1 | Surface behavior | "I clicked the button" |
| L2 | Expectation | "I expected it to work" |
| **L3** | User goal | "I need to stake before epoch ends" |

Always reach Level 3 before forming hypotheses.

### Confidence Scoring

| Score | Definition |
|-------|------------|
| `none` | Pure speculation |
| `low` | Single quote, ambiguous |
| `medium` | Multiple quotes, consistent pattern |
| `high` | Direct user statement of intent |

---

## Requirements

- Claude Code CLI
- Loa Framework with `constructs-loader.sh`
