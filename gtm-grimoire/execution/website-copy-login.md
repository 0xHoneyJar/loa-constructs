# Website Copy: Login Page

**Route**: `/login`
**Target Audience**: Returning users
**Tone**: Minimal, fast, get out of the way
**Generated**: 2026-01-03

---

## Page Layout

Centered box, TUI styling, minimal distractions.

---

## Header

### Headline
```
Log in
```

### Subheadline (Optional)
```
Welcome back.
```

---

## Form Fields

### Email
```
Label: Email
Placeholder: you@example.com
Error: Enter a valid email address
```

### Password
```
Label: Password
Placeholder: ••••••••••••
Error: Incorrect password
Link: [Forgot password?]
```

---

## Submit Button

```
[Log In]
```

Loading state:
```
[Logging in...]
```

---

## Alternative Auth

```
─────────── or ───────────

[Continue with GitHub]
[Continue with Google]
```

---

## Error States

### Invalid Credentials
```
Invalid email or password.
[Forgot password?]
```

### Account Not Found
```
No account found with this email.
[Create an account]
```

### Account Not Verified
```
Please verify your email first.
Check your inbox for the verification link.
[Resend verification email]
```

### Too Many Attempts
```
Too many login attempts.
Try again in {minutes} minutes.
```

### Account Suspended
```
This account has been suspended.
Contact support: hello@thehoneyjar.xyz
```

### Generic Error
```
Something went wrong. Please try again.
```

---

## Success State

Redirect to `/dashboard` on success.

Optional toast:
```
Logged in successfully.
```

---

## Footer Links

```
Don't have an account? [Create one]
```

---

## Remember Me (Optional)

```
[ ] Remember me for 30 days
```

---

## Forgot Password Link

```
[Forgot password?]
```

Links to `/forgot-password`

---

## Social Proof (Subtle, Optional)

```
Join 500+ developers shipping with Loa
```

---

## CLI Login Reminder

For users who came from CLI:

```
Logging in from the CLI?

After logging in here, return to your terminal.
The CLI will automatically authenticate.
```

---

## OAuth Callback States

### GitHub Success
```
GitHub connected. Redirecting...
```

### GitHub Error
```
GitHub authentication failed.
Please try again.
[Try Again]
```

### Google Success
```
Google connected. Redirecting...
```

### Google Error
```
Google authentication failed.
Please try again.
[Try Again]
```

---

## Mobile Optimizations

- Full-width form on mobile
- Large tap targets for buttons
- Keyboard optimization (email type, password visibility toggle)

---

## Accessibility

```
- All form fields labeled
- Error messages linked to fields
- Focus management on errors
- Screen reader announcements for state changes
```

---

## A/B Test Variants

### Headline Variants
1. "Log in"
2. "Welcome back"
3. "Sign in"
4. "Log in to Loa"

### CTA Variants
1. "Log In"
2. "Sign In"
3. "Continue"

---

## SEO Metadata

### Title
```
Log In | Loa Registry
```

### Description
```
Log in to your Loa Registry account.
Access your installed packs, API keys, and settings.
```

---

## Security Notes

```
• Use rate limiting on login attempts
• Log failed attempts for security monitoring
• Implement CSRF protection
• Use secure, httpOnly cookies
• Consider 2FA for Pro/Team accounts
```

---

*Generated via /translate for indie-developers*
