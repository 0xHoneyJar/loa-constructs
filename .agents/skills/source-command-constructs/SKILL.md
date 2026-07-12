---
name: "source-command-constructs"
description: "Browse, select, and install packs from the Loa Constructs Registry.
Multi-select UI for composable pack installation."
---

# source-command-constructs

Use this skill when the user asks to run the migrated source command `constructs`.

## Command Template

# Constructs

## Purpose

Browse and install packs from the Loa Constructs Registry with a multi-select UI. Enables composable skill installation per-repo.

## Invocation

```
/constructs                    # Smart default: manage installed OR browse to install
/constructs browse             # Browse available packs
/constructs install <pack>     # Install a single pack
/constructs list               # List installed packs (--orient shows streams + personas)
/constructs search <query>     # Search packs by name/description
/constructs update             # Check for updates across all packs
/constructs upgrade <pack>     # Upgrade a single pack (git pull / re-fetch)
/constructs uninstall <pack>   # Remove a pack
/constructs auth               # View auth status / setup API key
```

## Prerequisites

- `LOA_CONSTRUCTS_API_KEY` environment variable (for premium packs)
- Or `~/.loa/credentials.json` with API key
- Network access to registry (or cached pack data)

## Workflow

### Action: default (no args)

Smart routing based on installed state. Check installed packs first:
- **If packs installed**: Offer "Use installed" / "Browse & install more" / "Manage installed"
- **If no packs**: Continue to browse flow

See `SKILL.md` Phase 0 for full details.

### Action: browse

Interactive pack selection with table-based UI.

#### Phase 1: Fetch Available Packs

```bash
# Fetch packs from registry
packs=$(.Codex/scripts/constructs-browse.sh list --json)
```

Returns JSON array:
```json
[
  {
    "slug": "observer",
    "name": "Observer",
    "description": "User truth capture",
    "skills_count": 6,
    "tier": "free",
    "icon": "🔮"
  },
  {
    "slug": "crucible", 
    "name": "Crucible",
    "description": "Validation & testing",
    "skills_count": 5,
    "tier": "free",
    "icon": "⚗️"
  }
]
```

#### Phase 2: Display Pack Table

Display ALL packs in a numbered markdown table with full details:

```markdown
## Available Packs

| # | Pack | Description | Skills | Version | Status |
|---|------|-------------|--------|---------|--------|
| 1 | 🎨 Artisan | Brand and UI craftsmanship skills for design systems and motion | 10 | 1.0.2 | Free |
| 2 | 👁️ Observer | User truth capture skills for hypothesis-first research | 6 | 1.0.2 | Free |
| 3 | 🔔 Sigil of the Beacon | Signal readiness to the agent network with AI-retrievable content | 6 | 1.0.2 | Free |
| 4 | 🧪 Crucible | Validation and testing skills for journey verification | 5 | 1.0.2 | ✓ Installed |
| 5 | 🚀 GTM Collective | Go-To-Market skills for product launches and developer relations | 8 | 1.0.0 | Free |
```

Then use AskUserQuestion (NOT multiSelect) for selection method:

```json
{
  "questions": [{
    "question": "How would you like to install packs?",
    "header": "Install",
    "multiSelect": false,
    "options": [
      {"label": "Enter pack numbers", "description": "Type numbers like: 1,3,5"},
      {"label": "Install all", "description": "Install all available packs"},
      {"label": "Cancel", "description": "Exit without installing"}
    ]
  }]
}
```

If user selects "Enter pack numbers":
1. **Output text directly** (do NOT use AskUserQuestion): `"Enter pack numbers (comma-separated, e.g., 1,3,5):"`
2. Wait for user's text response
3. Parse and validate the input
4. Confirm selection before installing

#### Phase 3: Install Selected Packs

For each selected pack:

```bash
.Codex/scripts/constructs-install.sh pack <slug>
```

#### Phase 4: Report Results

Display installation summary:
- ✅ Installed packs
- Skills loaded count
- Commands available
- Any errors encountered

### Action: install <pack>

Direct installation without UI:

```bash
.Codex/scripts/constructs-install.sh pack <pack>
```

### Action: list

Show installed packs:

```bash
.Codex/scripts/constructs-loader.sh list
```

### Action: update

Check for newer versions:

```bash
.Codex/scripts/constructs-loader.sh check-updates
```

### Action: uninstall <pack>

Remove installed pack:

```bash
.Codex/scripts/constructs-install.sh uninstall pack <pack>
```

### Action: auth

Check or set up authentication for premium packs.

```bash
# Check authentication status
.Codex/scripts/constructs-auth.sh status

# Set up API key
.Codex/scripts/constructs-auth.sh setup <api_key>

# Validate current key
.Codex/scripts/constructs-auth.sh validate

# Remove credentials
.Codex/scripts/constructs-auth.sh clear
```

**Getting an API key:**
1. Visit https://www.constructs.network/account
2. Sign in or create an account
3. Generate an API key
4. Run `/constructs auth setup` and paste the key

**Alternative methods:**
- Environment variable: `export LOA_CONSTRUCTS_API_KEY=sk_...`
- Credentials file: `~/.loa/credentials.json`

## Pack Selection Guidelines

When presenting packs, include:

1. **Icon + Name** - Visual identifier
2. **Skill count** - e.g., "(6 skills)"
3. **Description** - One-line summary
4. **Tier indicator** - Free vs Pro badge

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| "No API key" | Missing credentials | Set `LOA_CONSTRUCTS_API_KEY` or create `~/.loa/credentials.json` |
| "Pack not found" | Invalid slug | Check available packs with `/constructs browse` |
| "Network error" | API unreachable | Check connection; cached packs still work |
| "License expired" | Subscription lapsed | Renew at constructs registry |

## Per-Repo Configuration

Installed packs are stored in `.Codex/constructs/packs/` (gitignored).

Each repo can have different packs:
- Project A: Observer + Crucible
- Project B: Artisan only
- Project C: All packs

## Related

- `constructs-install.sh` - Installation script
- `constructs-loader.sh` - Skill loading
- `constructs-lib.sh` - Shared utilities
