# Melange Setup Guide

This guide walks you through installing Melange Protocol on your repository.

## Prerequisites

- [GitHub CLI](https://cli.github.com/) (`gh`) installed and authenticated
- Discord webhook URL for notifications (optional but recommended)
- Write access to the target repository

## Quick Start

### 1. Copy Files from Template

```bash
# Clone the melange template
gh repo clone 0xHoneyJar/melange /tmp/melange

# Navigate to your repository
cd your-repo

# Create directories if they don't exist
mkdir -p .github/ISSUE_TEMPLATE .github/workflows

# Copy the Issue form template
cp /tmp/melange/.github/ISSUE_TEMPLATE/melange.yml .github/ISSUE_TEMPLATE/

# Copy the notification workflow
cp /tmp/melange/.github/workflows/melange-notify.yml .github/workflows/

# Commit the files
git add .github/
git commit -m "feat: add Melange Protocol support"
git push
```

### 2. Create Labels

Run the label setup script to create all required labels:

```bash
/tmp/melange/scripts/create-labels.sh YOUR-ORG/YOUR-REPO
```

This creates:
- `melange` - Protocol identifier (purple)
- `to:sigil`, `to:loa`, `to:registry` - Routing labels (blue)
- `impact:game-changing`, `impact:important`, `impact:nice-to-have` - Impact levels
- `status:open`, `status:accepted`, `status:blocked`, `status:declined`, `status:resolved` - Status tracking
- `intent:request`, `intent:ask`, `intent:report` - Intent types

### 3. Set Up Discord Notifications (Recommended)

1. Create a Discord channel (e.g., `#melange`)
2. Go to Channel Settings → Integrations → Webhooks
3. Create a new webhook and copy the URL
4. Add the webhook as a repository secret:

```bash
gh secret set MELANGE_DISCORD_WEBHOOK --repo YOUR-ORG/YOUR-REPO
# Paste your webhook URL when prompted
```

### 4. Test Your Setup

1. Go to your repository's Issues
2. Click "New Issue"
3. Select "Melange Thread" from the template options
4. Fill out the form and submit
5. Verify:
   - Issue has `melange` and `status:open` labels
   - `to:*` and `impact:*` labels are auto-applied
   - Discord notification arrives (if webhook is set)

## Verification Checklist

- [ ] Issue form template works (`melange.yml`)
- [ ] Labels exist in repository
- [ ] Workflow runs on Issue creation
- [ ] Discord notifications work (game-changing, important)
- [ ] Labels auto-apply from form body

## Troubleshooting

### Labels not auto-applying

1. Check that the workflow has permission to modify Issues
2. Verify the Issue body matches the expected format
3. Check the Actions tab for workflow run errors

### Discord notifications not working

1. Verify `MELANGE_DISCORD_WEBHOOK` secret is set
2. Check the webhook URL is valid
3. Ensure Discord channel allows webhook messages

### Workflow not running

1. Confirm `.github/workflows/melange-notify.yml` exists
2. Check that the Issue has the `melange` label
3. Review the Actions tab for any failures

## Next Steps

- Read [docs/workflow.md](./workflow.md) to understand the Issue lifecycle
- Test cross-Construct communication with your team
- Configure your AI agent to respect Melange HITL requirements
