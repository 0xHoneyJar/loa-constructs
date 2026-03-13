import { z } from 'zod';

// Edge validation (Zod). Convex storage validators are in convex/signals.ts (ingest action args).
// Both must agree on the signal shape — changes here require matching changes there.

export const feedbackDataSchema = z.object({
  type: z.literal('feedback'),
  category: z.string().max(100),
  description: z.string().max(2000).optional(),
  whatUserWanted: z.string().max(500).optional(),
  frustration: z.number().min(1).max(5).optional(),
});

export const errorReportDataSchema = z.object({
  type: z.literal('error_report'),
  errorClass: z.string().max(200).optional(),
  message: z.string().max(1000).optional(),
  stackTrace: z.string().max(10000).optional(),
  url: z.string().max(2000).optional(),
  userAgent: z.string().max(500).optional(),
});

export const signalRequestSchema = z.object({
  source: z.string().max(100),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  title: z.string().max(500),
  data: z.discriminatedUnion('type', [feedbackDataSchema, errorReportDataSchema]),
});

export type SignalRequest = z.infer<typeof signalRequestSchema>;

// Stack trace sanitization — strip env var patterns, file paths with secrets
const SENSITIVE_PATTERNS = [
  /(?:DATABASE_URL|API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)\s*[=:]\s*\S+/gi,
  /sk_(?:live|test)_[a-zA-Z0-9]+/g,
  /ghp_[a-zA-Z0-9]+/g,
  /gho_[a-zA-Z0-9]+/g,
  /AKIA[A-Z0-9]{16}/g,
  /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+/g,
];

export function sanitizeStackTrace(trace: string): string {
  let sanitized = trace;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

export function computeIncidentGroupId(
  appSlug: string,
  source: string,
  data: SignalRequest['data'],
): string {
  const classifier =
    data.type === 'feedback'
      ? data.category
      : (data.errorClass ?? 'unknown');
  const timeBucket = Math.floor(Date.now() / 300_000);
  return `${appSlug}:${source}:${classifier}:${timeBucket}`;
}
