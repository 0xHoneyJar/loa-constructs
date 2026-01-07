# Website Copy: Creator Pages

**Routes**: `/creator`, `/creator/new`, `/creator/skills/[id]`
**Target Audience**: Developers publishing skills/packs
**Tone**: Instructional, encouraging, clear requirements
**Generated**: 2026-01-03

---

# Creator Dashboard

**Route**: `/creator`

---

## Page Header

### Headline
```
Creator Dashboard
```

### Subheadline
```
Manage your published skills and packs.
```

---

## Stats Section

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Published   │ │ Total       │ │ This Month  │ │ Active      │
│ Packs       │ │ Downloads   │ │ Downloads   │ │ Installs    │
│             │ │             │ │             │ │             │
│ {count}     │ │ {count}     │ │ {count}     │ │ {count}     │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

---

## Published Packs Section

### Headline
```
Your Packs
```

### Pack Card

```
┌─────────────────────────────────────────────────────────────┐
│ my-awesome-pack                              v1.0.0 [LIVE]  │
│ Description of what this pack does                          │
│                                                             │
│ 3 skills • 5 commands • 234 downloads                       │
│ Published: 2026-01-01                                       │
│                                                             │
│ [View Analytics]  [Edit]  [New Version]                     │
└─────────────────────────────────────────────────────────────┘
```

### Status Badges

```
[LIVE]      - Published and available
[DRAFT]     - Not yet published
[REVIEW]    - Under review
[REJECTED]  - Review failed (see feedback)
```

### Empty State

```
No packs published yet.

Create your first pack and share your workflows
with the community.

[Create Pack]
```

---

## Quick Actions

```
[Create New Pack]    [View Documentation]    [Join Creator Discord]
```

---

# Create New Pack

**Route**: `/creator/new`

---

## Page Header

### Headline
```
Create a Pack
```

### Subheadline
```
Package your skills and share them with the community.
```

---

## Form Sections

### Basic Info

```
Pack Name *
[                                        ]
The display name (e.g., "GTM Collective")

Slug *
[                                        ]
URL-safe identifier (e.g., "gtm-collective")
Auto-generated from name, editable

Short Description *
[                                        ]
One line, max 100 characters
```

### Long Description

```
Full Description
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│ Markdown supported                                          │
│                                                             │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
Describe what your pack does, who it's for, and what's included.
```

### Category & Tags

```
Category *
[Select category        ▼]
  - GTM & Marketing
  - Development
  - Security
  - DevOps
  - Documentation
  - Other

Tags
[                                        ]
Comma-separated (e.g., gtm, marketing, launch)
```

### Pricing

```
Pricing Model *
○ Free - Available to all users
● Pro - Requires Pro subscription

Revenue Share: 70% to you, 30% platform fee
```

### Skills & Commands

```
Skills *

Add the skills included in this pack.
Each skill needs an index.yaml and SKILL.md file.

┌─────────────────────────────────────────────────────────────┐
│ analyzing-market                                      [×]   │
│ positioning-product                                   [×]   │
│                                                             │
│ [+ Add Skill]                                               │
└─────────────────────────────────────────────────────────────┘

Commands

Add the slash commands included in this pack.

┌─────────────────────────────────────────────────────────────┐
│ /analyze-market                                       [×]   │
│ /position                                             [×]   │
│                                                             │
│ [+ Add Command]                                             │
└─────────────────────────────────────────────────────────────┘
```

### Upload Files

```
Pack Files *

Upload your pack as a .zip file containing:
  - skills/{skill-name}/index.yaml
  - skills/{skill-name}/SKILL.md
  - skills/{skill-name}/resources/ (optional)
  - commands/{command-name}.md

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│           Drag and drop .zip file here                      │
│                    or                                       │
│               [Choose File]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Max file size: 10MB
```

### Version

```
Version *
[1.0.0                                   ]
Semantic versioning (major.minor.patch)

Changelog
┌─────────────────────────────────────────────────────────────┐
│ Initial release                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
What's new in this version?
```

---

## Form Actions

```
[Save Draft]    [Preview]    [Submit for Review]
```

---

## Validation Messages

### Required Field
```
This field is required
```

### Slug Taken
```
This slug is already taken. Try: {suggestion}
```

### Invalid Version
```
Version must be in format x.y.z (e.g., 1.0.0)
```

### File Too Large
```
File exceeds 10MB limit
```

### Invalid Zip Structure
```
Missing required files. Expected:
  - skills/*/index.yaml
  - skills/*/SKILL.md

Found: {actual_structure}
```

---

## Success State

After submission:

```
Pack submitted for review!

We'll review your pack within 2-3 business days.
You'll receive an email when it's approved.

What happens next:
1. We review for quality and security
2. You'll get feedback if changes needed
3. Once approved, it goes live

[View Pack]  [Create Another]
```

---

# Pack Analytics

**Route**: `/creator/skills/[id]`

---

## Page Header

```
← Back to Dashboard

my-awesome-pack
v1.0.0 • Published 2026-01-01
```

---

## Stats Overview

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Total       │ │ This Month  │ │ This Week   │ │ Active      │
│ Downloads   │ │             │ │             │ │ Installs    │
│             │ │             │ │             │ │             │
│ 1,234       │ │ 156         │ │ 42          │ │ 892         │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

---

## Downloads Chart

```
Downloads Over Time

     │
 200 │    ╭─╮
     │   ╭╯ ╰╮  ╭─╮
 150 │  ╭╯   ╰──╯ ╰╮
     │ ╭╯          ╰─╮
 100 │╭╯             ╰╮
     │╯               ╰─────
  50 │
     │
   0 └────────────────────────
     Jan   Feb   Mar   Apr   May

[Last 7 days]  [Last 30 days]  [Last 90 days]  [All time]
```

---

## Per-Skill Breakdown

```
Skill Usage

| Skill                | Uses   | % of Total |
|----------------------|--------|------------|
| analyzing-market     | 456    | 37%        |
| positioning-product  | 321    | 26%        |
| pricing-strategist   | 234    | 19%        |
| other skills         | 223    | 18%        |
```

---

## Version History

```
Versions

v1.0.0 (current) - 2026-01-01
  Initial release

[Publish New Version]
```

---

## Actions

```
[Edit Pack]  [Publish New Version]  [Unpublish]
```

---

## Unpublish Confirmation

```
Unpublish my-awesome-pack?

This will:
• Remove from public listings
• Block new downloads
• Existing installs keep working

You can republish anytime.

[Keep Published]  [Unpublish]
```

---

# Creator Documentation Snippets

## How to Create a Pack

```
Creating a Pack

1. Structure your files:
   my-pack/
   ├── skills/
   │   └── my-skill/
   │       ├── index.yaml
   │       ├── SKILL.md
   │       └── resources/
   └── commands/
       └── my-command.md

2. Create index.yaml:
   name: My Skill
   slug: my-skill
   description: What it does
   version: 1.0.0

3. Write SKILL.md with:
   - Persona definition
   - Workflow steps
   - Output specifications
   - Resources/templates

4. Zip and upload

5. Submit for review

Full guide: /docs/creating-packs
```

## Revenue Share

```
Pricing

Free packs: No cost, no revenue
Pro packs: 70/30 split

You receive 70% of subscription revenue
attributed to your pack downloads.

Payouts: Monthly via Stripe Connect
Minimum: $50

[Connect Stripe Account]
```

---

## SEO Metadata

### Creator Dashboard
```
Title: Creator Dashboard | Loa Registry
Description: Manage your published skills and packs.
View analytics and publish new versions.
```

### Create Pack
```
Title: Create a Pack | Loa Registry
Description: Package your AI agent skills and share them
with the Loa Registry community.
```

---

*Generated via /translate for indie-developers*
