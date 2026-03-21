import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Errors only — no performance tracing
  tracesSampleRate: 0,

  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production",
});
