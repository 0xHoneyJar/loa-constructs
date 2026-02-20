# Creating Constructs

## Purpose

Scaffold new construct projects from templates. Supports three construct
archetypes (skill-pack, tool-pack, codex) with type-specific starter files,
gitignore, and manifest generation.

## Invocation

```bash
/construct-create                       # Interactive — asks type and name
/construct-create new --name X --type Y # Direct scaffold
/construct-init --type Y                # Initialize existing directory
```

## Workflow

### Phase 1: Gather Info

Use AskUserQuestion to determine construct type and name:

```yaml
questions:
  - question: "What type of construct are you creating?"
    header: "Type"
    options:
      - label: "Skill Pack (Recommended)"
        description: "Collection of skills with SKILL.md + index.yaml"
      - label: "Tool Pack"
        description: "MCP server or CLI tool with runtime requirements"
      - label: "Codex"
        description: "Knowledge base with file-based access layer"
    multiSelect: false
```

Then ask for name:

```yaml
questions:
  - question: "What should this construct be called?"
    header: "Name"
    options:
      - label: "Enter name"
        description: "Provide a descriptive name (e.g., 'My Analytics Tools')"
    multiSelect: false
```

### Phase 2: Scaffold

```bash
.claude/scripts/constructs-create.sh new --name "<name>" --type "<type>"
```

### Phase 3: Report

Present the created files and next steps:
- Edit `construct.yaml` to customize
- Add skills/tools/content
- Run `/construct-publish --validate` before publishing

## Construct Types

| Type | Generates | Use Case |
|------|-----------|----------|
| skill-pack | skills/, construct.yaml | Agent capabilities and workflows |
| tool-pack | src/, construct.yaml | MCP servers, CLI tools |
| codex | index.md, .codex/ | Knowledge bases, documentation |

## Error Handling

| Exit Code | Meaning | Resolution |
|-----------|---------|------------|
| 0 | Success | — |
| 1 | General error | Check error message |
| 3 | Directory exists | Choose different name or delete existing |
| 5 | Validation error | Fix name/type arguments |

## Outputs

| Path | Description |
|------|-------------|
| `./<slug>/` | New construct directory with all files |
| `./<slug>/construct.yaml` | Construct manifest |
| `./<slug>/.git/` | Initialized git repository |

## Related Commands

- `/construct-publish` — Publish to registry
- `/construct-link` — Link for local development
- `/constructs install` — Install from registry
