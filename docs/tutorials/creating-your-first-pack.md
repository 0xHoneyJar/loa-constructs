# Tutorial: Creating Your First Skill Pack

This tutorial walks you through creating a complete skill pack from scratch. By the end, you'll have a working pack ready for submission.

**Time**: ~30 minutes
**Difficulty**: Beginner
**Prerequisites**: Claude Code installed, Loa Constructs account

---

## What We're Building

We'll create a **Code Documentation Pack** that helps developers generate documentation for their code. It will include:

- A skill that analyzes code and generates docs
- A `/document` command to invoke it
- Proper structure for submission

---

## Step 1: Set Up the Directory Structure

Create your pack directory:

```bash
mkdir code-docs-pack && cd code-docs-pack
```

Create the required structure:

```bash
# Create directories
mkdir -p skills/code-documenter/resources/templates
mkdir -p commands

# Create required files
touch manifest.json
touch README.md
touch skills/code-documenter/index.yaml
touch skills/code-documenter/SKILL.md
touch commands/document.md
```

Your structure should look like:

```
code-docs-pack/
├── manifest.json
├── README.md
├── skills/
│   └── code-documenter/
│       ├── index.yaml
│       ├── SKILL.md
│       └── resources/
│           └── templates/
└── commands/
    └── document.md
```

---

## Step 2: Create the Manifest

Edit `manifest.json`:

```json
{
  "$schema": "https://constructs.network/schemas/pack-manifest.json",
  "name": "code-docs-pack",
  "version": "1.0.0",
  "description": "Generate comprehensive documentation for your codebase",
  "longDescription": "A skill pack that analyzes your code and generates professional documentation including API references, usage guides, and inline comments.",
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "license": "MIT",
  "keywords": ["documentation", "code", "api", "readme"],
  "skills": [
    {
      "name": "code-documenter",
      "path": "skills/code-documenter",
      "description": "Analyzes code and generates documentation"
    }
  ],
  "commands": [
    {
      "name": "/document",
      "path": "commands/document.md",
      "description": "Generate documentation for your code"
    }
  ],
  "minLoaVersion": "1.0.0",
  "tier": "free"
}
```

---

## Step 3: Define the Skill Metadata

Edit `skills/code-documenter/index.yaml`:

```yaml
name: "code-documenter"
version: "1.0.0"
model: "sonnet"
description: |
  Analyzes source code and generates comprehensive documentation.
  Supports multiple output formats including markdown, JSDoc, and README.

triggers:
  - "/document"
  - "document this code"
  - "generate documentation"
  - "create docs"

inputs:
  - name: source_files
    type: glob
    pattern: "src/**/*.{ts,js,py}"
    required: true
    description: "Source files to document"

  - name: existing_docs
    type: file
    path: "README.md"
    required: false
    description: "Existing documentation to augment"

outputs:
  - path: "docs/API.md"
    description: "Generated API documentation"

  - path: "docs/USAGE.md"
    description: "Usage guide with examples"

dependencies: []

parallel_execution:
  enabled: true
  threshold: 3000
  strategy: by_file
```

---

## Step 4: Write the Skill Instructions

This is the core of your skill. Edit `skills/code-documenter/SKILL.md`:

```markdown
# Code Documenter Skill

You are an expert technical writer specializing in software documentation. Your role is to analyze source code and generate clear, comprehensive documentation that helps developers understand and use the code effectively.

## Your Expertise

- API documentation (functions, classes, methods)
- Usage guides with practical examples
- Code comments and inline documentation
- README generation
- Architecture overviews

## Workflow

### Phase 1: Code Analysis

1. **Scan the codebase** to understand:
   - Project structure and organization
   - Main entry points and exports
   - Dependencies and imports
   - Design patterns used

2. **Identify documentation targets**:
   - Public APIs (exported functions, classes)
   - Configuration options
   - Key abstractions
   - Integration points

3. **Understand context**:
   - Read existing README if available
   - Check for existing inline comments
   - Look for usage examples in tests

### Phase 2: Documentation Generation

Generate documentation following this structure:

#### API Documentation (`docs/API.md`)

For each public function/class:

```markdown
## `functionName(params)`

Brief description of what it does.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| param1 | string | Yes | What this param does |

### Returns

`ReturnType` - Description of return value

### Example

\`\`\`typescript
const result = functionName('value');
\`\`\`

### Throws

- `ErrorType` - When this error occurs
```

#### Usage Guide (`docs/USAGE.md`)

Structure:

```markdown
# Usage Guide

## Quick Start

Minimal example to get started.

## Common Use Cases

### Use Case 1: [Name]
Step-by-step with code.

### Use Case 2: [Name]
Step-by-step with code.

## Configuration

Available options and defaults.

## Troubleshooting

Common issues and solutions.
```

### Phase 3: Quality Validation

Before finalizing, verify:

- [ ] All public APIs are documented
- [ ] Examples are runnable (no syntax errors)
- [ ] Parameter types are accurate
- [ ] Return types are specified
- [ ] Error conditions are documented
- [ ] Links are valid

## Output Standards

### Writing Style

- Use present tense ("Returns the value" not "Will return")
- Be concise but complete
- Lead with the most important information
- Use consistent terminology

### Code Examples

- Must be syntactically correct
- Show realistic use cases
- Include error handling where relevant
- Use descriptive variable names

### Formatting

- Use proper markdown headings (##, ###)
- Include code fences with language tags
- Use tables for parameters
- Add blank lines between sections

## What NOT to Do

- Don't document private/internal functions unless specifically requested
- Don't include implementation details that could change
- Don't write placeholder text ("TODO", "Description here")
- Don't assume knowledge not in the code

## Handling Edge Cases

### No Public Exports
If the code has no public exports, document:
- The main file's purpose
- How to integrate it
- Key internal functions that might be useful

### Existing Documentation
If documentation exists:
- Preserve accurate existing content
- Update outdated information
- Fill in missing sections
- Maintain consistent style

### Complex Codebases
For large codebases:
- Focus on the most important modules first
- Create an index/table of contents
- Link between related documentation
- Consider splitting into multiple files
```

---

## Step 5: Create the Command

Edit `commands/document.md`:

```yaml
---
agent: "code-documenter"
agent_path: "skills/code-documenter"
description: "Generate documentation for your codebase"

context_files:
  - path: "README.md"
    optional: true
    description: "Existing project README"
    priority: 1

  - path: "package.json"
    optional: true
    description: "Project metadata"
    priority: 2

pre_flight:
  - check: "glob_exists"
    pattern: "src/**/*.{ts,js,py}"
    message: "No source files found. Ensure you have code in src/"

outputs:
  - path: "docs/API.md"
    description: "API documentation"

  - path: "docs/USAGE.md"
    description: "Usage guide"

mode:
  default: foreground
  background: true
---

# /document

Generate comprehensive documentation for your codebase.

## Usage

```
/document [options]
```

## What It Does

1. Scans your source files (`src/**/*.{ts,js,py}`)
2. Analyzes public APIs, classes, and functions
3. Generates `docs/API.md` with API reference
4. Creates `docs/USAGE.md` with usage examples

## Options

- `--format <type>`: Output format (markdown, jsdoc, rst)
- `--include <glob>`: Additional files to include
- `--output <dir>`: Output directory (default: docs/)

## Examples

### Basic Usage

```
/document
```

Generates documentation in `docs/` folder.

### Custom Output

```
/document --output documentation/
```

### Include Additional Files

```
/document --include "lib/**/*.ts"
```

## Output Structure

```
docs/
├── API.md      # Function/class reference
└── USAGE.md    # How-to guide with examples
```

## Tips

- Run after major code changes
- Review and edit generated docs
- Commit docs with your code
```

---

## Step 6: Create a Documentation Template

Create `skills/code-documenter/resources/templates/api-template.md`:

```markdown
# API Reference

> Auto-generated documentation for {{project_name}}

## Table of Contents

{{toc}}

---

{{#each modules}}
## {{name}}

{{description}}

{{#each exports}}
### `{{signature}}`

{{description}}

{{#if params}}
#### Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
{{#each params}}
| `{{name}}` | `{{type}}` | {{required}} | {{default}} | {{description}} |
{{/each}}
{{/if}}

{{#if returns}}
#### Returns

`{{returns.type}}` - {{returns.description}}
{{/if}}

{{#if example}}
#### Example

```{{language}}
{{example}}
```
{{/if}}

{{#if throws}}
#### Throws

{{#each throws}}
- `{{type}}` - {{description}}
{{/each}}
{{/if}}

---
{{/each}}
{{/each}}

## License

{{license}}
```

---

## Step 7: Write the README

Edit `README.md`:

```markdown
# Code Docs Pack

Generate comprehensive documentation for your codebase with a single command.

## Installation

```bash
claude skills add code-docs-pack
```

## Quick Start

Navigate to your project and run:

```bash
/document
```

This will generate:
- `docs/API.md` - Complete API reference
- `docs/USAGE.md` - Usage guide with examples

## Features

- **Automatic API Discovery**: Finds all public functions and classes
- **Smart Examples**: Generates realistic code examples
- **Multiple Formats**: Supports Markdown, JSDoc comments, RST
- **Incremental Updates**: Preserves manual edits when regenerating

## Supported Languages

- TypeScript / JavaScript
- Python
- More coming soon!

## Commands

| Command | Description |
|---------|-------------|
| `/document` | Generate documentation for your codebase |

## Configuration

Add to your `.loa.config.yaml`:

```yaml
code-docs-pack:
  output_dir: "documentation/"
  format: "markdown"
  include_private: false
  generate_toc: true
```

## Example Output

### API.md

```markdown
## `createUser(name, email)`

Creates a new user account.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | User's display name |
| email | string | Yes | User's email address |

### Returns

`User` - The created user object

### Example

const user = createUser('Alice', 'alice@example.com');
```

## Contributing

Issues and PRs welcome at [GitHub](https://github.com/you/code-docs-pack).

## License

MIT
```

---

## Step 8: Test Locally

Install your pack locally:

```bash
# From the code-docs-pack directory
claude skills add ./
```

Test in a project with source files:

```bash
cd /path/to/test-project
/document
```

Verify:
- [ ] Command is recognized
- [ ] Skill executes without errors
- [ ] Output files are created
- [ ] Documentation is accurate

---

## Step 9: Prepare for Submission

### Checklist

- [ ] `manifest.json` has all required fields
- [ ] Version follows semver (1.0.0)
- [ ] README is complete and helpful
- [ ] All file paths in manifest are correct
- [ ] Skill has index.yaml and SKILL.md
- [ ] Command routes to correct skill
- [ ] No hardcoded paths
- [ ] Works with fresh install

### Create a ZIP (optional)

```bash
cd ..
zip -r code-docs-pack.zip code-docs-pack/
```

---

## Step 10: Submit to Registry

1. **Go to Creator Dashboard**: [constructs.network/creator](https://constructs.network/creator)

2. **Create New Pack**:
   - Click "New Pack"
   - Enter slug: `code-docs-pack`
   - Fill in description
   - Select category: "Documentation"
   - Choose tier: "Free"

3. **Upload Version**:
   - Click "New Version"
   - Upload your files or ZIP
   - Set version: `1.0.0`
   - Add changelog: "Initial release"

4. **Submit for Review**:
   - Click "Submit for Review"
   - Add notes: "Documentation generator for TypeScript/JavaScript/Python projects"

5. **Wait for Approval**:
   - Check email for updates
   - View status in dashboard
   - Address feedback if needed

---

## What's Next?

After approval:

1. **Promote Your Pack**
   ```
   claude skills add code-docs-pack
   ```

2. **Gather Feedback**
   - Monitor downloads
   - Respond to issues
   - Iterate based on usage

3. **Release Updates**
   - Fix bugs
   - Add features
   - Improve documentation

4. **Consider Premium**
   - Add advanced features
   - Upgrade tier for revenue

---

## Common Issues

### "Skill not found"
- Check `agent_path` in command matches skill directory
- Verify skill has both `index.yaml` and `SKILL.md`

### "No source files found"
- Ensure your test project has files matching the glob pattern
- Adjust the pattern in `index.yaml` if needed

### "Output not generated"
- Check skill instructions include output generation
- Verify output paths are writable

---

## Resources

- [Full Contribution Guide](../CONTRIBUTING-PACKS.md)
- [Pack Manifest Schema](https://constructs.network/schemas/pack-manifest.json)
- [Community Discord](https://discord.gg/loa-constructs)
- [Example Packs](https://github.com/0xHoneyJar/example-packs)

---

Congratulations! You've created your first skill pack.
