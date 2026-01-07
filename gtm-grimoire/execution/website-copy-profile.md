# Website Copy: Profile Page

**Route**: `/profile`
**Target Audience**: Users managing their account
**Tone**: Functional, clear, settings-focused
**Generated**: 2026-01-03

---

## Page Header

### Headline
```
Profile
```

### Breadcrumb
```
Dashboard / Profile
```

---

## Account Information Section

### Headline
```
Account
```

### Display Format (Read Mode)

```
┌─────────────────────────────────────────────────────────────┐
│  Account                                           [Edit]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Email         you@example.com                              │
│  Username      yourname                                     │
│  Member since  January 2026                                 │
│  Tier          Pro                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Edit Mode

```
┌─────────────────────────────────────────────────────────────┐
│  Account                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Email                                                      │
│  [you@example.com                    ]                      │
│  Changing email requires verification                       │
│                                                             │
│  Username                                                   │
│  [yourname                           ]                      │
│  Used for public profile and CLI                            │
│                                                             │
│  [Save Changes]  [Cancel]                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Password Section

### Headline
```
Password
```

### Content

```
┌─────────────────────────────────────────────────────────────┐
│  Password                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Last changed: {date} (or "Never")                          │
│                                                             │
│  [Change Password]                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Change Password Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Change Password                                      [×]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Current password                                           │
│  [••••••••••••                       ]                      │
│                                                             │
│  New password                                               │
│  [                                   ]                      │
│  Minimum 8 characters                                       │
│                                                             │
│  Confirm new password                                       │
│  [                                   ]                      │
│                                                             │
│  [Update Password]  [Cancel]                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Password Validation

```
✓ At least 8 characters
✗ Passwords match
```

### Success Message

```
Password updated successfully.
```

---

## Connected Accounts Section

### Headline
```
Connected Accounts
```

### Content

```
┌─────────────────────────────────────────────────────────────┐
│  Connected Accounts                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GitHub        Connected as @username      [Disconnect]     │
│  Google        Not connected               [Connect]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Disconnect Confirmation

```
Disconnect GitHub?

You can reconnect anytime.
If this is your only login method, you'll need
to set a password first.

[Keep Connected]  [Disconnect]
```

---

## Subscription Section

### Headline
```
Subscription
```

### For Free Users

```
┌─────────────────────────────────────────────────────────────┐
│  Subscription                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Current plan    Free                                       │
│  Status          Active                                     │
│                                                             │
│  [Upgrade to Pro - $29/mo]                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### For Pro Users

```
┌─────────────────────────────────────────────────────────────┐
│  Subscription                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Current plan    Pro                                        │
│  Status          Active                                     │
│  Next billing    {date}                                     │
│  Amount          $29.00/month                               │
│                                                             │
│  [Manage Billing]                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Notifications Section

### Headline
```
Notifications
```

### Content

```
┌─────────────────────────────────────────────────────────────┐
│  Notifications                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Email notifications                                        │
│                                                             │
│  [✓] Product updates                                        │
│      New packs, features, and improvements                  │
│                                                             │
│  [✓] Security alerts                                        │
│      Login from new device, password changes                │
│                                                             │
│  [ ] Marketing                                              │
│      Tips, tutorials, and community highlights              │
│                                                             │
│  [Save Preferences]                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Danger Zone Section

### Headline
```
Danger Zone
```

### Content

```
┌─────────────────────────────────────────────────────────────┐
│  Danger Zone                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Export Data                                                │
│  Download all your data in JSON format.                     │
│  [Export Data]                                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Delete Account                                             │
│  Permanently delete your account and all data.              │
│  This cannot be undone.                                     │
│  [Delete Account]                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Delete Account Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Delete Account                                       [×]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  This will permanently delete:                              │
│  • Your account and profile                                 │
│  • All API keys                                             │
│  • Your billing history                                     │
│  • Your subscription (no refund for current period)         │
│                                                             │
│  Installed packs on your machine will keep working,         │
│  but you won't be able to download updates.                 │
│                                                             │
│  Type "delete my account" to confirm:                       │
│  [                                   ]                      │
│                                                             │
│  [Cancel]  [Delete Account]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Form Validation Messages

### Email
```
Error: Enter a valid email address
Error: This email is already in use
Success: Verification email sent to {new_email}
```

### Username
```
Error: Username must be 3-20 characters
Error: Username can only contain letters, numbers, and underscores
Error: This username is taken
```

### Password
```
Error: Current password is incorrect
Error: Password must be at least 8 characters
Error: Passwords don't match
```

---

## Success Messages

```
Profile updated successfully.
Password changed successfully.
Email preferences saved.
Data export started. Check your email.
```

---

## Error States

### Save Failed
```
Couldn't save changes. Please try again.
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
Profile | Loa Registry
```

### Description
```
Manage your Loa Registry account settings.
Update profile, password, and notification preferences.
```

---

*Generated via /translate for indie-developers*
