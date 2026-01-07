# Website Copy: Error Pages

**Routes**: `/404`, `/500`, `/403`, etc.
**Target Audience**: Users who hit errors
**Tone**: Helpful, not apologetic, actionable
**Generated**: 2026-01-03

---

# 404 Not Found

**Route**: `/404` or any unmatched route

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  404                                                        │
│                                                             │
│  Page not found                                             │
│                                                             │
│  The page you're looking for doesn't exist                  │
│  or has been moved.                                         │
│                                                             │
│  [Go Home]  [Browse Packs]                                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Looking for something specific?                            │
│  • Browse packs: /packs                                     │
│  • View docs: /docs                                         │
│  • Dashboard: /dashboard                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Copy Variants

### Standard
```
404
Page not found

The page you're looking for doesn't exist or has been moved.
```

### Developer-Friendly
```
404
Not found

No route matches "{path}"
```

### Playful (Optional)
```
404
Lost in the void

This page wandered off into the dark.
Let's get you back on track.
```

---

## CTAs

```
[Go Home]  [Browse Packs]  [Search]
```

---

# 500 Internal Server Error

**Route**: `/500` or server error catch

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  500                                                        │
│                                                             │
│  Something went wrong                                       │
│                                                             │
│  We're looking into it. Try again in a few minutes.         │
│                                                             │
│  [Try Again]  [Go Home]                                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Still broken?                                              │
│  • Check status: status.constructs.network                  │
│  • Report issue: hello@thehoneyjar.xyz                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Copy Variants

### Standard
```
500
Something went wrong

We're looking into it. Try again in a few minutes.
```

### Technical
```
500
Internal server error

The server encountered an error. Our team has been notified.
```

### Honest
```
500
We broke something

Not your fault. We're on it.
```

---

## CTAs

```
[Try Again]  [Go Home]  [Check Status]
```

---

# 403 Forbidden

**Route**: Unauthorized access attempt

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  403                                                        │
│                                                             │
│  Access denied                                              │
│                                                             │
│  You don't have permission to view this page.               │
│                                                             │
│  [Go to Dashboard]  [Log In]                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Copy Variants

### Not Logged In
```
403
Access denied

Log in to view this page.

[Log In]  [Create Account]
```

### Wrong Permissions
```
403
Access denied

You don't have permission to view this page.
Contact your team admin if you think this is a mistake.

[Go to Dashboard]
```

### Subscription Required
```
403
Pro required

This feature requires a Pro subscription.

[Upgrade to Pro]  [View Pricing]
```

---

# 401 Unauthorized

**Route**: Session expired or not authenticated

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Session expired                                            │
│                                                             │
│  Please log in again to continue.                           │
│                                                             │
│  [Log In]                                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# 429 Too Many Requests

**Route**: Rate limited

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  429                                                        │
│                                                             │
│  Slow down                                                  │
│                                                             │
│  Too many requests. Try again in {seconds} seconds.         │
│                                                             │
│  [Wait]                                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Copy Variants

### API Rate Limit
```
429
Rate limited

You've exceeded the API rate limit.
Wait {seconds} seconds before trying again.

Limits:
• Free: 100 requests/hour
• Pro: 1,000 requests/hour
```

### Login Attempts
```
429
Too many attempts

Too many login attempts.
Try again in {minutes} minutes.
```

---

# 503 Service Unavailable

**Route**: Maintenance or overload

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  503                                                        │
│                                                             │
│  Temporarily unavailable                                    │
│                                                             │
│  We're doing some maintenance. Back shortly.                │
│                                                             │
│  Check status: status.constructs.network                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Copy Variants

### Planned Maintenance
```
503
Scheduled maintenance

We're upgrading our systems.
Expected back: {time}

Check status.constructs.network for updates.
```

### Unexpected Downtime
```
503
Temporarily unavailable

We're experiencing issues and working to resolve them.
Check status.constructs.network for updates.
```

---

# Offline Page (PWA)

**Context**: No internet connection

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  You're offline                                             │
│                                                             │
│  Check your internet connection and try again.              │
│                                                             │
│  [Retry]                                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# JavaScript Disabled

**Context**: JS required but disabled

---

## Layout (noscript)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  JavaScript required                                        │
│                                                             │
│  Loa Registry requires JavaScript to work.                  │
│  Please enable it in your browser settings.                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# Generic Error Component

For inline errors in the UI:

```
┌─────────────────────────────────────────────────────────────┐
│  ✗ Something went wrong                                     │
│                                                             │
│  {error_message}                                            │
│                                                             │
│  [Try Again]                                                │
└─────────────────────────────────────────────────────────────┘
```

---

# Error Toast Messages

Quick, dismissible error notifications:

```
✗ Couldn't save changes. Try again.
✗ Network error. Check your connection.
✗ Session expired. Please log in.
✗ Something went wrong.
```

---

# CLI Error Messages

For consistency with web:

```
Error: Not found (404)
The resource at {url} doesn't exist.

Error: Unauthorized (401)
Your session has expired. Run: loa auth login

Error: Forbidden (403)
You don't have access to this resource.

Error: Rate limited (429)
Too many requests. Wait {seconds}s and try again.

Error: Server error (500)
Something went wrong on our end. Try again later.
Check status: https://status.constructs.network
```

---

# Design Guidelines

```
• Use the error code prominently (404, 500, etc.)
• Keep messages short and actionable
• Always provide a way out (CTA)
• Don't over-apologize ("Oops! We're so sorry!")
• Include helpful links when relevant
• Match the TUI aesthetic
```

---

# SEO Metadata

### 404
```
Title: Page Not Found | Loa Registry
Description: The page you're looking for doesn't exist.
(noindex, nofollow)
```

### 500
```
Title: Server Error | Loa Registry
Description: Something went wrong. We're working on it.
(noindex, nofollow)
```

---

*Generated via /translate for indie-developers*
