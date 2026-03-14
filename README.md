# Constructs Network

Skills for AI coding agents.

```bash
# Install a construct
constructs-install.sh observer

# Create your own
gh repo create my-org/construct-my-expertise \
  --template 0xHoneyJar/construct-base --private --clone
```

Browse constructs at **[constructs.network](https://constructs.network)**

---

## What's a Construct

A construct is a named unit of expertise — identity, skills, and boundaries — that you install into your AI coding agent. Your agent doesn't just get new capabilities. It gets a new way of seeing problems.

```
construct.yaml        # Name, version, metadata
identity/
  persona.yaml        # How it thinks
  expertise.yaml      # What it knows — and what it refuses
skills/               # What it does
commands/             # Slash commands
CLAUDE.md             # Instructions injected on install
```

```mermaid
graph LR
    You([You]) --> Agent([Your Agent])
    Agent --> |without constructs| Generic["'Help me with design'<br/><i>Generic output</i>"]
    Agent --> |with constructs| Craftsman["Craftsman — depth-5 Design Systems<br/><i>Decomposes into feel, motion, material</i>"]
    Agent --> |with constructs| Researcher["Researcher — depth-5 User Research<br/><i>Synthesizes evidence into hypotheses</i>"]
    Agent --> |with constructs| Strategist["Strategist — depth-5 Positioning<br/><i>Maps capabilities to market</i>"]

    style Generic fill:#1c1c1c,stroke:#555,color:#888
    style Craftsman fill:#1a1a2e,stroke:#8B5CF6,color:#e8e8ea
    style Researcher fill:#1a1a2e,stroke:#8B5CF6,color:#e8e8ea
    style Strategist fill:#1a1a2e,stroke:#8B5CF6,color:#e8e8ea
```

Same agent. Different expertise installed. Different way of seeing the problem.

---

## Create

Three files. Push. Done.

1. **`construct.yaml`** — name, slug, author
2. **`skills/example-simple/SKILL.md`** — your skill's instructions
3. **`CLAUDE.md`** — your construct's identity

CI validates on push. Placeholder text is blocked — you can't ship "your-name" or TODO markers.

Start here: **[construct-base](https://github.com/0xHoneyJar/construct-base)**

---

## The Network

| | |
|---|---|
| **Discovery** | Find constructs by domain, capability, or creator |
| **Distribution** | Install with a single command, stay current with upstream |
| **Composition** | Combine constructs from different experts into unified workflows |
| **Identity** | Every construct carries its creator's name, methodology, and version |
| **Licensing** | Create once, distribute to anyone who installs |

---

## Development

```bash
bun install
bun --filter api dev            # API on localhost:3000
bun --filter explorer dev       # Explorer on localhost:3001
```

## Links

- [constructs.network](https://constructs.network) — Browse & install
- [Loa](https://github.com/0xHoneyJar/loa) — Framework
- [construct-base](https://github.com/0xHoneyJar/construct-base) — Start here
- [CHANGELOG.md](CHANGELOG.md)

---

[AGPL-3.0](LICENSE.md)
