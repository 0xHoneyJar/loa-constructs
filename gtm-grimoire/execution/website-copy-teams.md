# Website Copy: Teams Pages

**Routes**: `/teams`, `/teams/[slug]`, `/teams/[slug]/billing`
**Target Audience**: Team admins and members
**Tone**: Clear, organizational, role-aware
**Generated**: 2026-01-03

---

# Teams List Page

**Route**: `/teams`

---

## Page Header

### Headline
```
Teams
```

### Subheadline
```
Manage your team accounts and memberships.
```

---

## Teams List

### Team Card

```
┌─────────────────────────────────────────────────────────────┐
│  Acme Corp                                          [TEAM]  │
│  acme-corp                                                  │
│                                                             │
│  5 members • Team plan                                      │
│  Your role: Admin                                           │
│                                                             │
│  [Manage Team]                                              │
└─────────────────────────────────────────────────────────────┘
```

### Multiple Teams

```
Your Teams
──────────

┌─────────────────────────────────────────┐
│  Acme Corp                      [ADMIN] │
│  5 members • Team plan                  │
│  [Manage]                               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Side Project Inc              [MEMBER] │
│  3 members • Team plan                  │
│  [View]                                 │
└─────────────────────────────────────────┘
```

---

## Empty State

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  No teams yet                                               │
│                                                             │
│  Create a team to share packs and collaborate               │
│  with your organization.                                    │
│                                                             │
│  [Create Team]                                              │
│                                                             │
│  Or join an existing team with an invite link.              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Create Team Button

```
[+ Create Team]
```

---

## Create Team Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Create Team                                          [×]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Team Name *                                                │
│  [                                   ]                      │
│  Your organization or project name                          │
│                                                             │
│  Team Slug *                                                │
│  [                                   ]                      │
│  URL-safe identifier (auto-generated from name)             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Team Plan: $99/month                                       │
│  • Up to 10 seats                                           │
│  • Shared skill library                                     │
│  • Team usage dashboard                                     │
│  • SSO support                                              │
│                                                             │
│  [Create Team - $99/mo]  [Cancel]                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# Team Settings Page

**Route**: `/teams/[slug]`

---

## Page Header

```
← Back to Teams

Acme Corp
Team settings
```

---

## Team Info Section

```
┌─────────────────────────────────────────────────────────────┐
│  Team Info                                         [Edit]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Name          Acme Corp                                    │
│  Slug          acme-corp                                    │
│  Created       January 2026                                 │
│  Plan          Team ($99/mo)                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Members Section

### Headline
```
Members (5 of 10)
```

### Members Table

```
┌─────────────────────────────────────────────────────────────┐
│  Members                                    [Invite Member] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Name              Email                 Role      Actions  │
│  ────────────────────────────────────────────────────────── │
│  You               you@acme.com          Admin     —        │
│  Jane Smith        jane@acme.com         Admin     [···]    │
│  Bob Wilson        bob@acme.com          Member    [···]    │
│  Alice Chen        alice@acme.com        Member    [···]    │
│  (Pending)         new@acme.com          Member    [···]    │
│                                                             │
│  5 of 10 seats used                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Role Badges

```
[ADMIN]   - Can manage team, billing, and members
[MEMBER]  - Can use team packs and API keys
[PENDING] - Invitation sent, not yet accepted
```

---

## Invite Member Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Invite Member                                        [×]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Email *                                                    │
│  [                                   ]                      │
│                                                             │
│  Role                                                       │
│  ○ Admin - Full access to team settings and billing         │
│  ● Member - Can use team packs (default)                    │
│                                                             │
│  [Send Invite]  [Cancel]                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Invite Success

```
Invitation sent to new@acme.com
They'll receive an email with a link to join.
```

---

## Member Actions Menu

```
[···] menu options:

• Change role
• Remove from team
```

### Change Role Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Change Role                                          [×]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Change role for Bob Wilson?                                │
│                                                             │
│  ○ Admin - Full access to team settings and billing         │
│  ● Member - Can use team packs                              │
│                                                             │
│  [Save]  [Cancel]                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Remove Member Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Remove Member                                        [×]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Remove Bob Wilson from Acme Corp?                          │
│                                                             │
│  They'll lose access to team packs immediately.             │
│  They can be re-invited later.                              │
│                                                             │
│  [Cancel]  [Remove]                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Team API Keys Section

```
┌─────────────────────────────────────────────────────────────┐
│  Team API Keys                              [Create Key]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  team-ci                                                    │
│  sk_team_••••••••xxxx                                       │
│  Created by you • Last used 2 days ago                      │
│                                           [Copy] [Delete]   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Team API keys give access to all team packs.               │
│  Only admins can create and manage team keys.               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Danger Zone

```
┌─────────────────────────────────────────────────────────────┐
│  Danger Zone                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Transfer Ownership                                         │
│  Transfer this team to another admin.                       │
│  [Transfer]                                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Delete Team                                                │
│  Permanently delete this team and remove all members.       │
│  [Delete Team]                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# Team Billing Page

**Route**: `/teams/[slug]/billing`

---

## Page Header

```
← Back to Team

Acme Corp
Billing
```

---

## Current Plan

```
┌─────────────────────────────────────────────────────────────┐
│  Current Plan                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TEAM                                          [ACTIVE]     │
│  $99/month                                                  │
│                                                             │
│  ✓ Up to 10 seats (5 used)                                  │
│  ✓ All premium packs                                        │
│  ✓ Team usage dashboard                                     │
│  ✓ SSO support                                              │
│  ✓ Priority support                                         │
│                                                             │
│  Next billing: February 1, 2026                             │
│                                                             │
│  [Update Payment]  [Cancel Plan]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Seats Section

```
┌─────────────────────────────────────────────────────────────┐
│  Seats                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  5 of 10 seats used                                         │
│  █████░░░░░                                                 │
│                                                             │
│  Need more seats?                                           │
│  Contact us for Enterprise pricing.                         │
│  [Contact Sales]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Billing History

```
┌─────────────────────────────────────────────────────────────┐
│  Billing History                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Date       Description       Amount   Status   Receipt     │
│  ─────────────────────────────────────────────────────────  │
│  Jan 1      Team - Monthly    $99.00   Paid     [PDF]       │
│  Dec 1      Team - Monthly    $99.00   Paid     [PDF]       │
│  Nov 1      Team - Monthly    $99.00   Paid     [PDF]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# Invite Email

**Subject**: You're invited to join {team_name} on Loa Registry

```
You're invited to {team_name}

{inviter_name} invited you to join {team_name} on Loa Registry.

As a team member, you'll get:
• Access to all team packs
• Premium features included
• Shared skill library

[Accept Invitation]

This invitation expires in 7 days.

If you don't have a Loa account, you'll create one when you accept.

─────────────────────────────────────────
Loa Registry | https://constructs.network
```

---

# Role Descriptions

```
Admin
─────
• Manage team settings
• Invite and remove members
• Manage team billing
• Create team API keys
• Access all team packs

Member
──────
• Access team packs
• Use team API keys
• View team members
• Cannot change settings or billing
```

---

## SEO Metadata

### Teams List
```
Title: Teams | Loa Registry
Description: Manage your team accounts on Loa Registry.
```

### Team Settings
```
Title: {team_name} Settings | Loa Registry
Description: Manage members and settings for {team_name}.
```

### Team Billing
```
Title: {team_name} Billing | Loa Registry
Description: Manage billing for {team_name}.
```

---

*Generated via /translate for indie-developers*
