import Cookies from 'js-cookie';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.CONSTRUCTS_API_URL ||
  'https://api.constructs.network/v1';

export async function fetchDashboard<T>(path: string): Promise<T> {
  const token = Cookies.get('access_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export interface AdminAnalytics {
  users: { total: number; new: number; verified: number };
  subscriptions: Record<string, number>;
  skills: { count: number; downloads: number };
  packs: { byStatus: Record<string, number>; downloads: number };
  usage: Record<string, number>;
  apiKeys: number;
  teams: number;
}
