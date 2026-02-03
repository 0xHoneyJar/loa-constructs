# Managing Constructs Skill

> Orchestrate Forge pack management through interactive agent workflow.

## Purpose

This skill provides an agent-driven interface for managing Forge packs in the Loa Constructs Registry. It wraps the `constructs-cli.sh` CLI tool with interactive selection and batch operations.

## Prerequisites

- `.env` file with `LOA_CONSTRUCTS_API_KEY` set
- `scripts/constructs-cli.sh` available and executable
- `jq` installed for JSON processing

## Workflow Phases

### Phase 0: Environment Validation

**Goal:** Ensure the environment is properly configured.

1. Check if `.env` file exists in Forge root
2. Verify `LOA_CONSTRUCTS_API_KEY` is set
3. If missing, provide setup instructions and exit:

```
❌ Environment not configured

To use this skill, create a .env file:

1. Copy .env.example to .env
2. Add your API key: LOA_CONSTRUCTS_API_KEY=sk_your_key

Get an API key at: https://constructs.network/dashboard/api-keys
```

### Phase 1: Discovery

**Goal:** Discover local packs and their registry status.

1. Run `./scripts/constructs-cli.sh list` to get current status
2. Parse output to identify:
   - Available local packs
   - Current registry status of each
   - Which packs need upload/submit/approval

3. Present status summary to user:

```
Found 4 local packs:

| Pack      | Local  | Registry | Status           |
|-----------|--------|----------|------------------|
| llm-ready | v1.0.0 | v1.0.0   | ✅ published     |
| observer  | v1.0.0 | v1.0.0   | ⏳ pending_review|
| artisan   | v1.0.0 | -        | 📝 draft         |
| crucible  | v1.0.0 | -        | ⬜ not uploaded  |
```

### Phase 2: Action Selection

**Goal:** Determine what operation the user wants to perform.

If action was provided as argument, skip to Phase 3.

Otherwise, present options via AskUserQuestion:

```yaml
questions:
  - question: "What would you like to do?"
    header: "Action"
    options:
      - label: "List"
        description: "View current pack status"
      - label: "Upload"
        description: "Upload new/updated pack versions"
      - label: "Submit"
        description: "Submit packs for review"
      - label: "Publish"
        description: "Full pipeline: upload → submit → approve"
    multiSelect: false
```

**Note:** `Approve` is only shown if `LOA_CONSTRUCTS_ADMIN_KEY` is set.

### Phase 3: Pack Selection

**Goal:** Select which packs to operate on.

If packs were provided as argument, validate and use those.

Otherwise, present pack selection via AskUserQuestion with multiSelect:

```yaml
questions:
  - question: "Select packs to {action}:"
    header: "Packs"
    options:
      - label: "llm-ready"
        description: "v1.0.0 - ✅ published"
      - label: "observer"
        description: "v1.0.0 - ⏳ pending_review"
      - label: "artisan"
        description: "v1.0.0 - 📝 draft"
      - label: "crucible"
        description: "v1.0.0 - ⬜ not uploaded"
    multiSelect: true
```

**Filtering by action validity:**

| Action  | Available Packs |
|---------|-----------------|
| Upload  | All local packs |
| Submit  | Uploaded but not submitted (draft status) |
| Approve | Pending review only |
| Publish | All local packs |

### Phase 4: Execution

**Goal:** Execute the selected action on selected packs.

For each selected pack:

1. Run the appropriate CLI command:
   ```bash
   ./scripts/constructs-cli.sh {action} {pack}
   ```

2. Capture output and exit code

3. Continue to next pack on non-critical errors

4. Track results for summary

### Phase 5: Results Report

**Goal:** Display operation results and suggest next steps.

Present a summary table:

```
## Results

| Pack      | Action  | Result |
|-----------|---------|--------|
| llm-ready | publish | ✅ Success |
| observer  | publish | ✅ Success |
| artisan   | publish | ❌ Error: Version already exists |

### Summary
- 2 succeeded
- 1 failed

### Next Steps
- For artisan: Bump version in manifest.json and retry
- Run `/manage-constructs list` to see updated status
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| "API key not set" | Missing .env | Provide setup instructions |
| "Pack not found" | Invalid pack slug | Show available packs |
| "Network error" | API unreachable | Retry or check connection |
| "Auth failed" | Invalid API key | Verify key in .env |
| "Already exists" | Version conflict | Bump version |

## Examples

### List all packs
```
/manage-constructs list
```

### Upload a specific pack
```
/manage-constructs upload llm-ready
```

### Publish multiple packs
```
/manage-constructs publish observer,artisan
```

### Interactive mode (recommended)
```
/manage-constructs
```

## CLI Reference

This skill uses `scripts/constructs-cli.sh` under the hood:

| Command | Description |
|---------|-------------|
| `list` | List local packs with registry status |
| `upload <pack>` | Create pack and upload version |
| `submit <pack>` | Submit pack for review |
| `status <pack>` | Check review status |
| `approve <pack>` | Admin approve pack |
| `publish <pack>` | Full pipeline: upload → submit → approve |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LOA_CONSTRUCTS_API_KEY` | Yes | API key for authentication |
| `LOA_CONSTRUCTS_ADMIN_KEY` | No | Admin key for approve command |
| `LOA_CONSTRUCTS_API_URL` | No | API base URL (default: production) |
