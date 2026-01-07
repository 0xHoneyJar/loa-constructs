# Website Copy: Documentation / Getting Started

**Route**: `/docs` or `/docs/getting-started`
**Target Audience**: New users, developers evaluating the product
**Tone**: Technical, step-by-step, copy-pasteable
**Generated**: 2026-01-03

---

## Docs Navigation Structure

```
Getting Started
├── Installation
├── Authentication
├── Your First Pack
└── CLI Reference

Packs
├── What are Packs?
├── Installing Packs
├── Managing Packs
└── Creating Packs

Skills
├── What are Skills?
├── Using Skills
└── Skill Structure

Account
├── API Keys
├── Billing
└── Teams

Troubleshooting
├── Common Issues
├── CLI Errors
└── Contact Support
```

---

# Getting Started

## Page Header

### Headline
```
Getting Started
```

### Intro
```
Get up and running with Loa Registry in under 5 minutes.
```

---

## Step 1: Installation

### Headline
```
1. Install the CLI
```

### Content
```
Install the Loa Registry CLI globally:

```bash
npm install -g loa-registry
```

Or use npx without installing:

```bash
npx loa-registry <command>
```

Verify installation:

```bash
loa --version
```
```

### Requirements Callout
```
Requirements:
• Node.js 18 or higher
• npm 9 or higher
• Claude Code (for using skills)
```

---

## Step 2: Authentication

### Headline
```
2. Authenticate
```

### Content
```
Log in to your Loa Registry account:

```bash
loa auth login
```

This opens your browser to authenticate.
Once complete, you're ready to install packs.

Don't have an account? Create one at:
https://constructs.network/register
```

### Auth Status
```
Check your auth status:

```bash
loa auth status
```

Output:
```
Logged in as: you@example.com
Tier: pro
```
```

---

## Step 3: Install Your First Pack

### Headline
```
3. Install a Pack
```

### Content
```
Browse available packs:

```bash
loa pack list
```

Install a pack:

```bash
loa pack-install <pack-name>
```

Example - install the GTM Collective:

```bash
loa pack-install gtm-collective
```

Output:
```
Installing GTM Collective v1.0.0...

✓ Downloaded 52 files (195 KB)
✓ Installed 8 skills
✓ Installed 14 commands

Available commands:
  /gtm-setup
  /analyze-market
  /position
  /price
  ... and 10 more

GTM Collective installed successfully!
```
```

---

## Step 4: Use It

### Headline
```
4. Use Your New Skills
```

### Content
```
Skills are now available in Claude Code.

Open your project and run a command:

```
/gtm-setup
```

Or use the skill directly:

```
Use the analyzing-market skill to research competitors
```

That's it. You're set up.
```

---

## What's Next

### Headline
```
What's Next
```

### Content
```
• Browse all packs: /packs
• Learn about skills: /docs/skills
• Create your own pack: /docs/creating-packs
• Join the community: Discord
```

---

# CLI Reference

## Page Header

### Headline
```
CLI Reference
```

### Intro
```
Complete reference for the loa-registry CLI.
```

---

## Commands Table

```
| Command                      | Description                    |
|------------------------------|--------------------------------|
| `loa auth login`             | Authenticate with the registry |
| `loa auth logout`            | Log out                        |
| `loa auth status`            | Check authentication status    |
| `loa pack list`              | List available packs           |
| `loa pack-install <name>`    | Install a pack                 |
| `loa pack-remove <name>`     | Remove a pack                  |
| `loa pack info <name>`       | Show pack details              |
| `loa pack update`            | Update all installed packs     |
| `loa --version`              | Show CLI version               |
| `loa --help`                 | Show help                      |
```

---

## Command Details

### loa auth login

```
loa auth login

Authenticate with Loa Registry.
Opens browser for OAuth flow.

Options:
  --token <token>   Use API token instead of browser auth

Examples:
  loa auth login
  loa auth login --token sk_live_xxxxx
```

### loa pack-install

```
loa pack-install <pack-name> [options]

Install a pack from the registry.

Arguments:
  pack-name         Name or slug of the pack to install

Options:
  --version <ver>   Install specific version (default: latest)
  --force           Overwrite existing files

Examples:
  loa pack-install gtm-collective
  loa pack-install gtm-collective --version 1.0.0
  loa pack-install gtm-collective --force
```

### loa pack list

```
loa pack list [options]

List packs from the registry.

Options:
  --installed       Show only installed packs
  --category <cat>  Filter by category
  --tier <tier>     Filter by tier (free, pro)

Examples:
  loa pack list
  loa pack list --installed
  loa pack list --tier free
```

---

# What are Packs?

## Page Header

### Headline
```
What are Packs?
```

### Intro
```
Packs are collections of skills and commands
that extend Claude Code's capabilities.
```

---

## Content

```
A pack contains:

• **Skills** - AI agent workflows with specific expertise
• **Commands** - Slash commands that invoke skills
• **Resources** - Templates, references, and supporting files

When you install a pack, these files are added to your
project's `.claude/` directory.
```

### Example Structure
```
After installing gtm-collective:

.claude/
├── packs/
│   └── gtm-collective/
│       ├── manifest.json
│       └── .license.json
├── skills/
│   ├── analyzing-market/
│   ├── positioning-product/
│   └── ... (6 more)
└── commands/
    ├── gtm-setup.md
    ├── analyze-market.md
    └── ... (12 more)
```

---

## Pack Types

```
**Free Packs**
Available to all users. Community-contributed
or basic functionality.

**Pro Packs**
Require Pro subscription ($29/mo).
Premium workflows built by experts.
```

---

# What are Skills?

## Page Header

### Headline
```
What are Skills?
```

### Intro
```
Skills are specialized AI agent personas
that guide Claude Code through complex workflows.
```

---

## Content

```
A skill defines:

• **Persona** - The expert role (e.g., "Market Analyst")
• **Workflow** - Step-by-step process to follow
• **Outputs** - What the skill produces
• **Resources** - Templates and references

Skills turn Claude Code from a code assistant
into a domain expert.
```

### Example

```
The `analyzing-market` skill:

Persona: Market Research Analyst
Workflow:
  1. Gather market context
  2. Research competitors
  3. Define ideal customer profiles
  4. Estimate market size (TAM/SAM/SOM)
  5. Write market landscape report

Output: gtm-grimoire/research/market-landscape.md
```

---

## Using Skills

```
Skills are invoked via commands:

  /analyze-market

Or directly:

  Use the analyzing-market skill to research
  the developer tools market.

The skill guides Claude through its workflow,
producing structured outputs.
```

---

# Troubleshooting

## Page Header

### Headline
```
Troubleshooting
```

---

## Common Issues

### Authentication Failed

```
Error: Authentication failed

Causes:
• Session expired
• Network issue
• Account suspended

Fix:
  loa auth logout
  loa auth login
```

### Pack Not Found

```
Error: Pack "xyz" not found

Causes:
• Typo in pack name
• Pack removed from registry
• Pack is private

Fix:
  loa pack list              # See available packs
  loa pack info <name>       # Check if pack exists
```

### Permission Denied (402)

```
Error: This pack requires Pro subscription

Cause:
• Trying to install Pro pack with Free account

Fix:
• Upgrade to Pro: https://constructs.network/billing
• Or choose a free pack: loa pack list --tier free
```

### Skills Not Appearing in Claude Code

```
Issue: Installed pack but commands don't work

Causes:
• Claude Code not restarted
• Wrong project directory
• Files not in .claude/

Fix:
1. Check files exist: ls .claude/commands/
2. Restart Claude Code
3. Verify you're in the right project
```

### Network Errors

```
Error: Failed to fetch pack

Causes:
• No internet connection
• Registry down
• Firewall blocking

Fix:
1. Check internet: ping constructs.network
2. Check status: https://status.constructs.network
3. Try again later
```

---

## Getting Help

```
Still stuck?

• Discord: https://discord.gg/loa-registry
• Email: hello@thehoneyjar.xyz
• GitHub Issues: https://github.com/thehoneyjar/loa-registry/issues

When reporting issues, include:
• CLI version: loa --version
• Node version: node --version
• Error message (full output)
• What you were trying to do
```

---

## SEO Metadata

### Getting Started
```
Title: Getting Started | Loa Registry Docs
Description: Get up and running with Loa Registry in under 5 minutes.
Install the CLI, authenticate, and install your first pack.
```

### CLI Reference
```
Title: CLI Reference | Loa Registry Docs
Description: Complete reference for the loa-registry CLI.
All commands, options, and examples.
```

---

*Generated via /translate for indie-developers*
