# Constructs Network

Named expertise for AI coding agents.

```bash
# Install a construct
constructs-install.sh observer

# Create your own
gh repo create my-org/construct-my-expertise \
  --template 0xHoneyJar/construct-template --private --clone
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

Without a construct, you prompt: *"help me with design."*
With one, you invoke a Craftsman — depth-5 Design Systems, depth-5 Motion Design, refuses backend logic. Same problem, completely different expertise applied.

---

## Create

Three files. Push. Done.

1. **`construct.yaml`** — name, slug, author
2. **`skills/example-simple/SKILL.md`** — your skill's instructions
3. **`CLAUDE.md`** — your construct's identity

CI validates on push. Placeholder text is blocked — you can't ship "your-name" or TODO markers.

Template with graduated paths: **[construct-template](https://github.com/0xHoneyJar/construct-template)**

---

## The Network

| | |
|---|---|
| **Discovery** | Find constructs by domain, capability, or creator |
| **Distribution** | Install with a single command, stay current with upstream |
| **Composition** | Combine constructs from different experts into unified workflows |
| **Identity** | Every construct carries its creator's name, methodology, and version |
| **Licensing** | Create once, distribute infinitely, earn continuously |

---

## Development

```bash
pnpm install
pnpm --filter api dev           # API on localhost:3000
pnpm --filter explorer dev      # Marketplace on localhost:3001
```

## Links

- [constructs.network](https://constructs.network) — Marketplace
- [Loa](https://github.com/0xHoneyJar/loa) — Framework
- [construct-template](https://github.com/0xHoneyJar/construct-template) — Start here
- [CHANGELOG.md](CHANGELOG.md)

---

[AGPL-3.0](LICENSE.md)
