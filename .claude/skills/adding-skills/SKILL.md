# /skill-add — Add a Skill to a Construct

## Purpose

Two-phase scaffolding: `construct create` makes the shell, `/skill-add <name>` grows capabilities. Creates a dispatch-ready skill with context-aware content by reading existing skills.

## Invocation

```bash
/skill-add <name>
/skill-add research
/skill-add deep-analysis
```

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `name` | Skill name (lowercase, hyphens allowed) | Yes |

## Workflow

### Phase 1: Detect Construct Root

1. Find `construct.yaml` in current directory or parent directories
2. If not found, error: "Not in a construct directory. Run this from a directory containing construct.yaml."
3. Read `construct.yaml` for construct name, type, description

### Phase 2: Read Existing Skills for Context

1. List `skills/*/index.yaml` to understand existing skill patterns
2. Read 1-2 existing `SKILL.md` files to match style and voice
3. Note trigger patterns, naming conventions, output paths

### Phase 3: Create Skill Files

Create three files:

#### `skills/<name>/index.yaml`

```yaml
name: <name>
version: "0.1.0"
description: "<context-aware description based on construct domain>"

triggers:
  - pattern: "/<name>"
    description: "<what this skill does>"

entry: skills/<name>/SKILL.md
```

**Populate description and trigger description** based on:
- The construct's domain (from construct.yaml or existing skills)
- The skill name's semantic meaning
- Existing skill patterns in this construct

#### `skills/<name>/SKILL.md`

Write a workflow stub that matches the style of existing skills in this construct. Include:
- Purpose section
- Invocation section with the trigger pattern
- Workflow section with numbered steps (TODO placeholders)
- Outputs table pointing to `grimoires/<construct-slug>/`

#### `commands/<name>.md`

```markdown
---
agent: skill
agent_path: skills/<name>/SKILL.md
context_files:
  - construct.yaml
---

# /<name>

Run the <name> skill.
```

### Phase 4: Report

Print:
- Files created
- Next steps: "Edit `skills/<name>/SKILL.md` to define your workflow"

## Guard Rails

- **Error if not in construct directory**: Check for `construct.yaml`
- **Error if skill exists**: Check `skills/<name>/` directory
- **Validate name**: Lowercase, alphanumeric + hyphens, no reserved words
- **Never overwrite**: If any target file exists, error with message

## Error Messages

| Error | Message |
|-------|---------|
| No construct.yaml | "Not in a construct directory. Run /skill-add from a directory containing construct.yaml." |
| Skill exists | "Skill '<name>' already exists at skills/<name>/. Use a different name." |
| Invalid name | "Skill name must be lowercase alphanumeric with hyphens (e.g., 'deep-research')." |

## Outputs

| Path | Description |
|------|-------------|
| `skills/<name>/index.yaml` | Skill manifest with triggers and entry |
| `skills/<name>/SKILL.md` | Workflow stub |
| `commands/<name>.md` | Routing frontmatter for dispatch |
