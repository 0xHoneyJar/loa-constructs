# Feedback Widget Skill

Generate and install a themed feedback widget component for any Next.js app. The widget sends user feedback as signals to the centralized observability dashboard.

## What It Generates

1. **FeedbackWidget component** — floating button (bottom-right) that expands to a feedback form
2. **Server action** — `submitFeedback()` that POSTs to the signals ingestion endpoint
3. **Environment instructions** — what env vars to set

## Usage

```bash
/feedback-widget                    # Interactive: asks for app name and theme
/feedback-widget explorer           # Generate for specific app
```

## Arguments

| Arg | Description | Default |
|-----|-------------|---------|
| `appName` | Target app name (used for file paths) | prompts user |

## Generated Files

| File | Description |
|------|-------------|
| `components/feedback-widget.tsx` | The widget React component |
| `app/actions/submit-feedback.ts` | Server action for signal submission |

## Theme Integration

The widget accepts CSS custom properties for theming:

```tsx
<FeedbackWidget
  style={{
    '--widget-bg': 'var(--void-base, #0a0a0a)',
    '--widget-border': 'var(--void-border, #1a1a1a)',
    '--widget-text': 'var(--bone-base, #e5e5e5)',
    '--widget-accent': 'var(--cyan-base, #22d3ee)',
  }}
/>
```

## Environment Variables Required

```bash
# In the target app's .env
SIGNALS_API_KEY=sk_live_...        # API key with write:signals scope
SIGNALS_ENDPOINT=https://constructs.network/api/signals  # Or custom endpoint
```

## How It Works

1. User clicks floating button → form slides up
2. Form collects: category, description, what user wanted, frustration level
3. On submit → server action fires → POST /api/signals with API key
4. Signal appears in dashboard within seconds
5. Codex Haiku classifies it automatically

## Security

- API key is ONLY in server action (never in client bundle)
- Server action validates inputs before sending
- Stack traces are sanitized by the ingestion endpoint
