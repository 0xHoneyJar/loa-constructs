# Installing the Loa Constructs GitHub App

This guide covers installing the Loa Constructs GitHub App for your organization.

## Prerequisites

- Admin access to your GitHub organization
- A valid account on [constructs.network](https://constructs.network)

## Installation

1. Go to **Settings → Developer settings → GitHub Apps**
2. Search for "Loa Constructs" or use the direct install link from your dashboard
3. Click **Install App**
4. Select your organization
5. Choose **All repositories** or select specific repositories
6. Authorize the app

## Repository Webhook Setup

For individual pack repositories, follow the webhook configuration instructions at `/v1/webhooks/configure` in your API dashboard.

## /feedback onboarding

If you're new to the construct network or have feedback about the onboarding experience, use the existing `/feedback` v3.0.0 surface in your Claude Code session.

The `/feedback` command accepts structured feedback about:
- Install friction (install failures, unclear error messages)
- Discovery gaps (constructs you expected to find but couldn't)
- Workflow integration issues (how constructs fit into your existing workflow)

No new feedback channel is introduced — all feedback routes through the existing `/feedback` v3.0.0 surface. This keeps signal quality high and avoids fragmenting the feedback loop.

To install the GitHub App at the org level:

1. Go to **GitHub Settings → Developer settings → GitHub Apps → Install**
2. Select your organization from the dropdown
3. Grant the required permissions (read access to repositories, receive webhooks)
4. Complete the installation

For issues or questions, open an issue at [0xHoneyJar/loa-constructs](https://github.com/0xHoneyJar/loa-constructs).
