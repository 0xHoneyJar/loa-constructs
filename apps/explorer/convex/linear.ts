import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

// Priority mapping: signal severity → Linear priority (1=urgent, 4=low)
const PRIORITY_MAP: Record<string, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

async function linearQuery(apiKey: string, query: string, variables?: Record<string, unknown>) {
  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Linear API error: ${response.status}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`Linear GraphQL error: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

export const createLinearIssue = internalAction({
  args: { signalId: v.id('signals') },
  handler: async (ctx, { signalId }) => {
    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) return;

    const signal = await ctx.runQuery(internal.signals.getById, { signalId });
    if (!signal) return;

    // Idempotent: skip if already has Linear issue
    if (signal.linearIssueId) return;

    // Team routing: error_report → Infrastructure team, feedback → Product team
    const teamKey =
      signal.data.type === 'error_report' ? 'LINEAR_TEAM_INFRASTRUCTURE' : 'LINEAR_TEAM_PRODUCT';
    const teamId = process.env[teamKey];
    if (!teamId) return;

    const priority = PRIORITY_MAP[signal.severity] ?? 3;

    const description = buildIssueDescription(signal);

    try {
      const data = await linearQuery(apiKey, CREATE_ISSUE_MUTATION, {
        input: {
          teamId,
          title: `[${signal.appSlug}] ${signal.title}`,
          description,
          priority,
        },
      });

      const issue = data?.issueCreate?.issue;
      if (!issue) {
        throw new Error('No issue returned from Linear');
      }

      await ctx.runMutation(internal.signals.patchLinearIssue, {
        signalId,
        linearIssueId: issue.id,
        linearIssueUrl: issue.url,
      });
    } catch {
      // Increment retry counter
      const attempts = (signal.linearCreationAttempts ?? 0) + 1;
      await ctx.runMutation(internal.signals.patchLinearCreationAttempt, {
        signalId,
        attempts,
      });
    }
  },
});

export const fetchIssueStatus = internalAction({
  args: { linearIssueId: v.string() },
  handler: async (_, { linearIssueId }) => {
    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) return null;

    try {
      const data = await linearQuery(apiKey, FETCH_ISSUE_STATUS_QUERY, {
        id: linearIssueId,
      });
      return data?.issue?.state?.name ?? null;
    } catch {
      return null;
    }
  },
});

function buildIssueDescription(signal: {
  appSlug: string;
  source: string;
  severity: string;
  data: { type: string; [key: string]: unknown };
  classification?: {
    level1Symptom: string;
    level2Want: string;
    level3Hypothesis: string;
  } | null;
  incidentGroupId: string;
  occurrenceCount: number;
}): string {
  const parts: string[] = [
    `**App**: ${signal.appSlug}`,
    `**Source**: ${signal.source}`,
    `**Severity**: ${signal.severity}`,
    `**Occurrences**: ${signal.occurrenceCount}`,
    `**Group**: \`${signal.incidentGroupId}\``,
    '',
  ];

  if (signal.data.type === 'feedback') {
    const fb = signal.data as { category?: string; description?: string; whatUserWanted?: string };
    parts.push(`### Feedback`);
    if (fb.category) parts.push(`**Category**: ${fb.category}`);
    if (fb.description) parts.push(`**Description**: ${fb.description}`);
    if (fb.whatUserWanted) parts.push(`**What user wanted**: ${fb.whatUserWanted}`);
  } else {
    const err = signal.data as { errorClass?: string; message?: string };
    parts.push(`### Error Report`);
    if (err.errorClass) parts.push(`**Error**: ${err.errorClass}`);
    if (err.message) parts.push(`**Message**: ${err.message}`);
  }

  if (signal.classification) {
    parts.push('', '### AI Classification');
    parts.push(`**Symptom**: ${signal.classification.level1Symptom}`);
    parts.push(`**Want**: ${signal.classification.level2Want}`);
    parts.push(`**Hypothesis**: ${signal.classification.level3Hypothesis}`);
  }

  parts.push('', '---', '*Created from Signals Dashboard*');

  return parts.join('\n');
}

const CREATE_ISSUE_MUTATION = `
  mutation CreateIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        url
        identifier
      }
    }
  }
`;

const FETCH_ISSUE_STATUS_QUERY = `
  query FetchIssueStatus($id: String!) {
    issue(id: $id) {
      state {
        name
      }
    }
  }
`;
