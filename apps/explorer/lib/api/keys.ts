import Cookies from 'js-cookie';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.CONSTRUCTS_API_URL ||
  'https://api.constructs.network/v1';

function getHeaders(): HeadersInit {
  const token = Cookies.get('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreatedApiKey extends ApiKey {
  key: string; // Full key — shown once
}

export async function createKey(
  name: string,
  scopes: string[],
): Promise<CreatedApiKey> {
  const response = await fetch(`${API_BASE}/keys`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, scopes }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to create key' }));
    throw new Error(err.error || 'Failed to create key');
  }

  return response.json();
}

export async function listKeys(): Promise<ApiKey[]> {
  const response = await fetch(`${API_BASE}/keys`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to list keys');
  }

  const data = await response.json();
  return data.keys;
}

export async function revokeKey(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/keys/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to revoke key' }));
    throw new Error(err.error || 'Failed to revoke key');
  }
}
