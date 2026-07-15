'use server';

interface FeedbackData {
  category: string;
  description: string;
  whatUserWanted?: string;
  frustration?: number;
}

export async function submitFeedback(data: FeedbackData) {
  const apiKey = process.env.SIGNALS_API_KEY;
  const endpoint = process.env.SIGNALS_ENDPOINT || 'https://constructs.network/api/signals';

  if (!apiKey) {
    throw new Error('SIGNALS_API_KEY not configured');
  }

  const severity =
    data.frustration && data.frustration >= 4
      ? 'high'
      : data.category === 'bug'
        ? 'medium'
        : 'low';

  const title =
    data.category === 'bug'
      ? `Bug: ${data.description.slice(0, 80)}`
      : data.category === 'feature'
        ? `Feature: ${data.description.slice(0, 80)}`
        : data.category === 'praise'
          ? `Praise: ${data.description.slice(0, 80)}`
          : `Flow: ${data.description.slice(0, 80)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({
      source: 'widget',
      severity,
      title,
      data: {
        type: 'feedback' as const,
        category: data.category,
        description: data.description,
        whatUserWanted: data.whatUserWanted,
        frustration: data.frustration,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'unknown' }));
    throw new Error(`Signal submission failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}
