const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.CONSTRUCTS_API_URL ||
  'https://api.constructs.network/v1';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  isOrgMember: boolean;
  isAdmin: boolean;
  walletAddress: string | null;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export async function fetchMe(accessToken: string): Promise<User> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`fetchMe failed: ${response.statusText}`);
  }

  const data = await response.json();
  const u = data.user;
  return {
    id: u.id as string,
    email: u.email as string,
    name: (u.name as string) ?? null,
    role: (u.tier as string) ?? 'free',
    emailVerified: (u.email_verified as boolean) ?? false,
    isOrgMember: (u.is_org_member as boolean) ?? false,
    isAdmin: (u.is_admin as boolean) ?? false,
    walletAddress: (u.wallet_address as string) ?? null,
    createdAt: (u.created_at as string) ?? new Date().toISOString(),
  };
}
