# Contributing Skill Packs to Loa Constructs

This guide explains how third-party developers can create and contribute skill packs to the Loa Constructs registry.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Pack Structure](#pack-structure)
4. [Creating Your First Pack](#creating-your-first-pack)
5. [Skill Anatomy](#skill-anatomy)
6. [Command Routing](#command-routing)
7. [Testing Your Pack](#testing-your-pack)
8. [Submission Process](#submission-process)
9. [Review Criteria](#review-criteria)
10. [After Approval](#after-approval)

---

## Overview

Skill packs are collections of AI agent workflows that extend Claude Code's capabilities beyond coding. Each pack contains:

- **Skills**: Specialized agents with specific expertise (e.g., market analysis, security auditing)
- **Commands**: Slash commands that invoke skills (e.g., `/analyze-market`, `/audit`)
- **Resources**: Templates, scripts, and reference materials

### Why Contribute?

- **Reach**: Your pack reaches thousands of developers using Claude Code
- **Revenue**: Earn 70% revenue share on premium pack subscriptions
- **Community**: Help build the ecosystem for agent-driven development

---

## Prerequisites

Before creating a pack, ensure you have:

1. **A Loa Constructs account** with verified email
   - Register at [constructs.network/register](https://constructs.network/register)

2. **Familiarity with Claude Code**
   - Understand how Claude Code works
   - Know the basics of prompt engineering

3. **A working skill concept**
   - Clear use case and target audience
   - Differentiated from existing packs

---

## Pack Structure

Every pack follows this directory structure:

```
my-pack/
├── manifest.json           # Pack metadata (required)
├── README.md               # Documentation (required)
├── LICENSE                 # License file (recommended)
├── skills/
│   └── my-skill/
│       ├── index.yaml      # Skill metadata (required)
│       ├── SKILL.md        # Skill instructions (required)
│       └── resources/      # Optional resources
│           ├── templates/
│           ├── scripts/
│           └── references/
└── commands/
    └── my-command.md       # Command definition
```

### manifest.json

The manifest defines your pack's metadata:

```json
{
  "$schema": "https://constructs.network/schemas/pack-manifest.json",
  "name": "my-awesome-pack",
  "version": "1.0.0",
  "description": "Short description (max 200 chars)",
  "longDescription": "Detailed description with markdown support",
  "author": {
    "name": "Your Name",
    "email": "you@example.com",
    "url": "https://yoursite.com"
  },
  "repository": "https://github.com/you/my-awesome-pack",
  "homepage": "https://yoursite.com/my-awesome-pack",
  "license": "MIT",
  "keywords": ["gtm", "marketing", "automation"],
  "skills": [
    {
      "name": "my-skill",
      "path": "skills/my-skill",
      "description": "What this skill does"
    }
  ],
  "commands": [
    {
      "name": "/my-command",
      "path": "commands/my-command.md",
      "description": "What this command does"
    }
  ],
  "minLoaVersion": "1.0.0",
  "tier": "free"
}
```

#### Tier Options

| Tier | Description | Revenue |
|------|-------------|---------|
| `free` | Available to all users | None |
| `pro` | Requires Pro subscription ($29/mo) | 70% share |
| `team` | Requires Team subscription ($99/mo) | 70% share |
| `enterprise` | Enterprise customers only | Custom |

---

## Creating Your First Pack

### Step 1: Initialize the Pack

Create a new directory for your pack:

```bash
mkdir my-pack && cd my-pack
```

Create the basic structure:

```bash
mkdir -p skills/my-skill/resources/{templates,scripts,references}
mkdir -p commands
touch manifest.json README.md
touch skills/my-skill/index.yaml
touch skills/my-skill/SKILL.md
touch commands/my-command.md
```

### Step 2: Define the Manifest

Edit `manifest.json` with your pack's metadata (see example above).

### Step 3: Write Your Skill

Create the skill definition in `skills/my-skill/index.yaml`:

```yaml
name: "my-skill"
version: "1.0.0"
model: "sonnet"  # or "opus" for complex tasks
description: |
  Brief description of what this skill does
  and when it should be used.

triggers:
  - "/my-command"
  - "help me with X"

inputs:
  - name: context_dir
    type: directory
    path: "loa-grimoire/context/"
    required: false
    description: "Optional context files"

outputs:
  - path: "loa-grimoire/output.md"
    description: "The generated output"

dependencies: []

parallel_execution:
  enabled: false
```

### Step 4: Write Skill Instructions

The `SKILL.md` file contains the actual instructions for Claude. This is the "kernel" of your skill:

```markdown
# My Skill

You are an expert at [domain]. Your role is to help users with [specific task].

## Workflow

1. **Gather Context**: First, understand the user's needs by...
2. **Analyze**: Review the provided information and...
3. **Generate Output**: Create the deliverable by...
4. **Validate**: Ensure quality by checking...

## Output Format

Your output should be structured as:

```
## Section 1
[Content]

## Section 2
[Content]
```

## Quality Standards

- Always cite sources when making claims
- Validate assumptions before proceeding
- Ask clarifying questions if requirements are unclear

## Examples

### Good Output
[Example of high-quality output]

### Common Mistakes
- Don't do X because...
- Avoid Y when...
```

### Step 5: Create Command Routing

Define how users invoke your skill in `commands/my-command.md`:

```yaml
---
agent: "my-skill"
agent_path: "skills/my-skill"
description: "Run my skill to do X"

context_files:
  - path: "loa-grimoire/context/"
    optional: true
    description: "User-provided context"

pre_flight:
  - check: "file_exists"
    path: "package.json"
    message: "This command requires a project with package.json"

outputs:
  - path: "loa-grimoire/output.md"
    description: "Generated output"

mode:
  default: foreground
  background: true
---

# /my-command

Run this command to [brief description].

## Usage

```
/my-command [options]
```

## Options

- `--verbose`: Show detailed progress
- `--output <path>`: Custom output location

## Examples

```
/my-command
/my-command --verbose
```
```

### Step 6: Write Documentation

Create a comprehensive `README.md`:

```markdown
# My Awesome Pack

Brief description of what this pack does.

## Installation

```bash
claude skills add my-awesome-pack
```

## Skills Included

### my-skill
Description of the skill and when to use it.

## Commands

| Command | Description |
|---------|-------------|
| `/my-command` | Does X |

## Usage Examples

### Example 1: Basic Usage
```bash
/my-command
```

### Example 2: With Options
```bash
/my-command --verbose
```

## Configuration

Optional configuration in `.loa.config.yaml`:

```yaml
my-awesome-pack:
  option1: value1
  option2: value2
```

## Support

- Issues: [GitHub Issues](https://github.com/you/my-pack/issues)
- Docs: [Full Documentation](https://yoursite.com/docs)

## License

MIT License - see LICENSE file
```

---

## Skill Anatomy

### The 3-Level Architecture

Every skill uses a 3-level structure for progressive context loading:

| Level | File | Purpose | Token Budget |
|-------|------|---------|--------------|
| 1 | `index.yaml` | Metadata, triggers | ~100 tokens |
| 2 | `SKILL.md` | Core instructions | ~2,000 tokens |
| 3 | `resources/` | Templates, references | On-demand |

This architecture ensures:
- Fast skill discovery (Level 1)
- Efficient context loading (Level 2)
- Deep resources when needed (Level 3)

### Writing Effective SKILL.md

Your `SKILL.md` is the heart of your skill. Follow these principles:

1. **Clear Role Definition**: Start with who the agent is and what they do
2. **Structured Workflow**: Break down the process into clear steps
3. **Output Specifications**: Define exactly what the output should look like
4. **Quality Gates**: Include validation checkpoints
5. **Error Handling**: Guide the agent on handling edge cases

### Using Resources

The `resources/` directory holds supplementary materials:

```
resources/
├── templates/
│   └── output-template.md    # Output format templates
├── scripts/
│   └── validate.sh           # Validation scripts
└── references/
    └── best-practices.md     # Domain knowledge
```

Reference these in your SKILL.md:

```markdown
## Output Format

Use the template from `resources/templates/output-template.md`.
```

---

## Command Routing

Commands are the user-facing interface to your skills.

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `agent` | Yes | Skill name to invoke |
| `agent_path` | Yes | Path to skill directory |
| `description` | Yes | Brief description |
| `context_files` | No | Files to load before execution |
| `pre_flight` | No | Validation checks |
| `outputs` | No | Expected output files |
| `mode` | No | Execution mode settings |

### Pre-flight Checks

Validate prerequisites before execution:

```yaml
pre_flight:
  - check: "file_exists"
    path: "package.json"
    message: "Requires a Node.js project"

  - check: "command_exists"
    command: "git"
    message: "Git must be installed"

  - check: "env_var"
    name: "API_KEY"
    message: "API_KEY environment variable required"
```

### Context Files

Pre-load files for the skill:

```yaml
context_files:
  - path: "loa-grimoire/prd.md"
    optional: true
    description: "Product requirements"
    priority: 1

  - path: "README.md"
    optional: false
    description: "Project documentation"
    priority: 2
```

---

## Testing Your Pack

### Local Testing

1. **Install your pack locally**:
   ```bash
   # From your pack directory
   claude skills add ./
   ```

2. **Run your commands**:
   ```bash
   /my-command
   ```

3. **Verify outputs**:
   - Check output files are created correctly
   - Validate output format matches specification
   - Test edge cases and error handling

### Validation Checklist

Before submission, verify:

- [ ] All required files exist (manifest.json, README.md, skill files)
- [ ] manifest.json is valid JSON with all required fields
- [ ] Each skill has index.yaml and SKILL.md
- [ ] Commands route to valid skills
- [ ] README documents all features
- [ ] No hardcoded paths or credentials
- [ ] Works with clean install

### Common Issues

| Issue | Solution |
|-------|----------|
| Skill not found | Check `agent_path` matches directory |
| Missing context | Verify `context_files` paths |
| Output not created | Check output path permissions |
| Command not recognized | Ensure triggers match command name |

---

## Submission Process

### Step 1: Create Pack on Registry

1. Log in to [constructs.network](https://constructs.network)
2. Go to **Creator Dashboard** → **New Pack**
3. Fill in basic metadata:
   - Name and slug (unique identifier)
   - Description
   - Category and tags
   - Pricing tier
   - Repository URL (optional but recommended)

### Step 2: Upload Version

1. From your pack dashboard, click **New Version**
2. Upload your pack files (zip or individual files)
3. Set version number (semver: 1.0.0)
4. Add changelog notes

### Step 3: Submit for Review

1. Ensure your pack has at least one version
2. Click **Submit for Review**
3. Add submission notes for reviewers:
   - What your pack does
   - Target audience
   - Any special considerations

### Step 4: Wait for Review

- Reviews typically take 2-3 business days
- You'll receive email notifications for:
  - Submission confirmation
  - Approval or rejection with feedback
- Check status anytime in Creator Dashboard

### Step 5: Address Feedback (if rejected)

If your pack is rejected:

1. Review the feedback in your dashboard
2. Make requested changes
3. Upload new version
4. Resubmit for review

---

## Review Criteria

Your pack will be evaluated on:

### 1. Completeness
- Has manifest, skills, commands, README
- All referenced files exist
- No broken references

### 2. Functionality
- Skills execute without errors
- Commands invoke correct skills
- Outputs match specification

### 3. Documentation
- Clear description of purpose
- Usage instructions included
- Examples provided

### 4. Originality
- Not a duplicate of existing pack
- Provides unique value
- Differentiated approach

### 5. Safety
- No malicious code
- No data exfiltration
- No credential harvesting
- Respects user privacy

### 6. Quality
- Well-structured prompts
- Appropriate model selection
- Efficient token usage
- Good error handling

### Rejection Reasons

| Reason | Description |
|--------|-------------|
| `quality_standards` | Insufficient depth or quality |
| `incomplete_content` | Missing required files |
| `duplicate_functionality` | Too similar to existing pack |
| `policy_violation` | Violates Terms of Service |
| `security_concern` | Potential security issues |

---

## After Approval

Once your pack is approved:

### Promotion

1. **Share your pack**:
   ```
   Install my pack: claude skills add my-pack
   ```

2. **Add badge to README**:
   ```markdown
   [![Loa Constructs](https://constructs.network/badge/my-pack)](https://constructs.network/packs/my-pack)
   ```

### Maintenance

- Monitor download stats in Creator Dashboard
- Respond to user issues
- Release updates for bugs and improvements
- Keep documentation current

### Revenue (Premium Packs)

For packs requiring Pro/Team subscription:

1. **Set up Stripe Connect** in Creator Dashboard
2. **Track earnings** in real-time
3. **Receive payouts** monthly (minimum $50)
4. **Revenue split**: 70% creator / 30% platform

### Updating Your Pack

1. Make changes to your pack files
2. Increment version number (semver)
3. Upload new version with changelog
4. New versions are auto-approved if pack is already published

---

## Best Practices

### Skill Design

1. **Single Responsibility**: Each skill should do one thing well
2. **Clear Triggers**: Use obvious command names
3. **Progressive Disclosure**: Start simple, allow depth
4. **Graceful Degradation**: Handle missing context gracefully

### Prompt Engineering

1. **Be Specific**: Vague instructions produce vague results
2. **Use Examples**: Show the agent what good output looks like
3. **Set Boundaries**: Define what the agent should NOT do
4. **Include Validation**: Build in quality checks

### User Experience

1. **Quick Start**: Users should succeed in under 5 minutes
2. **Clear Errors**: Provide actionable error messages
3. **Documentation**: Write for beginners
4. **Examples**: Include real-world use cases

---

## Getting Help

- **Documentation**: [constructs.network/docs](https://constructs.network/docs)
- **Community**: [Discord](https://discord.gg/loa-constructs)
- **Issues**: [GitHub](https://github.com/0xHoneyJar/loa-constructs/issues)
- **Email**: creators@constructs.network

---

## License

This guide is licensed under CC BY 4.0. Feel free to share and adapt.
