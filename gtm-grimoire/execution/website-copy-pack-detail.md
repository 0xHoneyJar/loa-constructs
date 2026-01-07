# Website Copy: Pack Detail Page (Template)

**Route**: `/packs/[slug]`
**Target Audience**: Developers evaluating a pack before install
**Tone**: Technical, show don't tell
**Generated**: 2026-01-03

---

## Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Packs                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  {Pack Name}                                    [PRO BADGE] │
│  {Short description}                                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ npx loa-registry pack-install {slug}                │   │
│  │                                        [Copy]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ## What's Included                                         │
│  {skills list}                                              │
│                                                             │
│  ## Commands                                                │
│  {commands table}                                           │
│                                                             │
│  ## Requirements                                            │
│  {prerequisites}                                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ## Version History                                         │
│  {changelog}                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Header Section

### Back Link
```
← Back to Packs
```

### Pack Name
```
{pack.name}
```

### Tier Badge (if premium)
```
PRO
```

### Short Description
```
{pack.description}
```

### Metadata Row
```
v{version} • {skill_count} skills • {command_count} commands • {install_count} installs
```

---

## Install Section

### Install Command Box
```
┌────────────────────────────────────────────────────────────┐
│ npx loa-registry pack-install {slug}              [Copy]   │
└────────────────────────────────────────────────────────────┘
```

### Copy Button States
```
Default: [Copy]
Clicked: [Copied!]
```

### Auth Gate (if not logged in)
```
Log in to install this pack
[Log In]  [Create Account]
```

### Tier Gate (if Pro pack + Free user)
```
This pack requires Pro subscription
[Upgrade to Pro - $29/mo]
```

---

## What's Included Section

### Headline
```
What's Included
```

### Skills List Format
```
{skill_count} Skills:

• {skill_name}
  {skill_description}

• {skill_name}
  {skill_description}

...
```

### Example (GTM Collective)
```
8 Skills:

• analyzing-market
  Research market size, competitors, and ideal customer profiles

• positioning-product
  Define positioning, messaging, and value propositions

• pricing-strategist
  Develop pricing strategy with tiers, packaging, and psychology

• crafting-narratives
  Create launch announcements and release communications

• educating-developers
  Plan DevRel strategy, content calendar, and community building

• building-partnerships
  Identify partnership opportunities and integration strategies

• translating-for-stakeholders
  Transform technical docs into executive-ready presentations

• reviewing-gtm
  Comprehensive GTM strategy review and quality check
```

---

## Commands Section

### Headline
```
Commands
```

### Commands Table
```
| Command              | Description                              |
|----------------------|------------------------------------------|
| /{command}           | {what it does}                           |
| /{command}           | {what it does}                           |
...
```

### Example (GTM Collective)
```
| Command              | Description                              |
|----------------------|------------------------------------------|
| /gtm-setup           | Initialize GTM project structure         |
| /gtm-adopt           | Import existing PRD/SDD into GTM         |
| /analyze-market      | Run market research analysis             |
| /position            | Define product positioning               |
| /price               | Develop pricing strategy                 |
| /plan-launch         | Create launch plan                       |
| /announce-release    | Write release announcements              |
| /plan-devrel         | Create DevRel strategy                   |
| /plan-partnerships   | Identify partnership opportunities       |
| /create-deck         | Generate pitch deck content              |
| /review-gtm          | Review GTM strategy                      |
| /sync-from-dev       | Sync updates from dev workflow           |
| /sync-from-gtm       | Sync GTM updates back to dev             |
| /gtm-feature-requests| Extract feature requests from GTM work   |
```

---

## Requirements Section

### Headline
```
Requirements
```

### Content
```
• Claude Code (latest version)
• Loa Framework v{min_version}+
• Node.js 18+
```

### Optional Dependencies
```
Optional:
• GitHub account (for /contribute)
• Stripe account (for pricing validation)
```

---

## Version History Section

### Headline
```
Version History
```

### Format
```
v{version} — {date}
{changelog entry}

v{version} — {date}
{changelog entry}
```

### Example
```
v1.0.0 — 2026-01-03
Initial release. 8 skills, 14 commands for complete GTM workflow.

v0.9.0 — 2025-12-28
Beta release. Added /review-gtm command.
```

---

## Sidebar (Optional)

### Pack Info
```
Author: {author_name}
License: {license}
Updated: {last_updated}
Size: {total_size}
```

### Links
```
[Documentation]
[GitHub]
[Report Issue]
```

---

## Empty State

If pack not found:
```
Pack not found

The pack "{slug}" doesn't exist or has been removed.

[Browse all packs]
```

---

## SEO Metadata

### Title
```
{pack.name} | Loa Registry
```

### Description
```
{pack.description}. {skill_count} skills, {command_count} commands.
Install with: npx loa-registry pack-install {slug}
```

---

## Specific Pack: GTM Collective

### Full Description (Long)
```
The GTM Collective is a complete go-to-market toolkit for developers
who'd rather ship than do "marketing."

8 AI-powered skills guide you from market research to launch day.
No MBA required. No marketing fluff. Just structured workflows
that turn Claude Code into your GTM co-pilot.

Built by founders who've launched 10+ products.
These are the exact workflows we use.
```

### Key Benefits
```
• Skip the blank page - structured templates for every GTM task
• Developer-friendly - CLI commands, not Notion templates
• Full lifecycle - from market research to launch announcements
• Grounded outputs - AI cites sources, flags assumptions
```

### Who It's For
```
• Solo founders launching their first product
• Indie developers who hate "marketing"
• Startup teams without a dedicated marketing person
• Anyone who wants GTM done without leaving the terminal
```

---

*Generated via /translate for indie-developers*
