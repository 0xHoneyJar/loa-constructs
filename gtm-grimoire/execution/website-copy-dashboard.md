# Website Copy: Dashboard Home

**Route**: `/dashboard`
**Target Audience**: Authenticated users
**Tone**: Informational, quick actions, status-focused
**Generated**: 2026-01-03

---

## Page Header

### Headline
```
Dashboard
```

### Greeting (Optional)
```
Welcome back, {username}
```

---

## Stats Section

### Layout
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Packs       │ │ Skills      │ │ API Keys    │ │ Tier        │
│ Installed   │ │ Available   │ │ Active      │ │             │
│             │ │             │ │             │ │             │
│ {count}     │ │ {count}     │ │ {count}     │ │ {tier}      │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### Stat Cards

**Packs Installed**
```
Label: Packs Installed
Value: {count}
Link: View all →
```

**Skills Available**
```
Label: Skills Available
Value: {count}
Subtext: {new_count} new this week
```

**API Keys**
```
Label: API Keys
Value: {count}/{max}
Link: Manage →
```

**Tier**
```
Label: Current Tier
Value: Free | Pro | Team
Link: Upgrade → (if Free)
```

---

## Quick Actions Section

### Headline
```
Quick Actions
```

### Actions Grid

```
┌─────────────────────────┐ ┌─────────────────────────┐
│ Install a Pack          │ │ Browse Skills           │
│                         │ │                         │
│ loa pack-install <name> │ │ Discover new skills     │
│                         │ │                         │
│ [Browse Packs]          │ │ [View Skills]           │
└─────────────────────────┘ └─────────────────────────┘

┌─────────────────────────┐ ┌─────────────────────────┐
│ Create API Key          │ │ Read the Docs           │
│                         │ │                         │
│ For CI/CD integration   │ │ Getting started guide   │
│                         │ │                         │
│ [Create Key]            │ │ [View Docs]             │
└─────────────────────────┘ └─────────────────────────┘
```

---

## Recent Activity Section

### Headline
```
Recent Activity
```

### Activity Feed

```
{timestamp}  Installed gtm-collective v1.0.0
{timestamp}  Created API key "ci-deploy"
{timestamp}  Upgraded to Pro
{timestamp}  Account created
```

### Empty State
```
No activity yet.
Install your first pack to get started.

[Browse Packs]
```

---

## Installed Packs Section

### Headline
```
Installed Packs
```

### Pack List

```
┌─────────────────────────────────────────────────────────────┐
│ gtm-collective                                        v1.0.0│
│ Go-to-market skills for product launches                    │
│ 8 skills • 14 commands • Installed {date}                   │
│                                           [Update] [Remove] │
└─────────────────────────────────────────────────────────────┘
```

### Empty State
```
No packs installed yet.

Get started with GTM Collective:
  loa pack-install gtm-collective

[Browse Packs]
```

### Update Available Badge
```
[UPDATE AVAILABLE]
v1.0.0 → v1.1.0
```

---

## Upgrade Banner (Free Users Only)

```
┌─────────────────────────────────────────────────────────────┐
│ ⚡ Upgrade to Pro                                           │
│                                                             │
│ Unlock premium packs like GTM Collective.                   │
│ $29/month. Cancel anytime.                                  │
│                                                             │
│ [Upgrade Now]                                    [Dismiss]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Pro User Welcome (First Visit After Upgrade)

```
┌─────────────────────────────────────────────────────────────┐
│ ✓ Welcome to Pro!                                           │
│                                                             │
│ You now have access to premium packs.                       │
│                                                             │
│ Get started:                                                │
│   loa pack-install gtm-collective                           │
│                                                             │
│ [Browse Premium Packs]                           [Dismiss]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Sidebar Navigation

```
≡ Menu

▸ Overview      [1]
  Skills        [2]
  Packs         [3]
  API Keys      [4]
  Profile       [5]
  Billing       [6]

─────────────────

{username}
{tier} tier
```

---

## Status Bar (Bottom)

```
↑↓ navigate   1-6 jump   Enter select   ? help   q quit
```

---

## Keyboard Shortcuts

```
| Key    | Action              |
|--------|---------------------|
| 1-6    | Jump to menu item   |
| j/↓    | Move down           |
| k/↑    | Move up             |
| Enter  | Select              |
| g      | Go to top           |
| G      | Go to bottom        |
| ?      | Show help           |
| q      | Close modal/go back |
```

---

## Empty Dashboard (New User)

```
Welcome to Loa Registry

You're set up. Here's what to do next:

1. Install the CLI
   npm install -g loa-registry

2. Authenticate
   loa auth login

3. Install your first pack
   loa pack-install <pack-name>

[Browse Packs]  [Read the Docs]
```

---

## Error States

### API Error
```
Couldn't load dashboard data.
[Try Again]
```

### Session Expired
```
Your session has expired.
[Log In Again]
```

---

## SEO Metadata

### Title
```
Dashboard | Loa Registry
```

### Description
```
Manage your Loa Registry account.
View installed packs, API keys, and activity.
```

---

*Generated via /translate for indie-developers*
