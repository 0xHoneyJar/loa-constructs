import { getAuthClient } from '@/components/auth/auth-initializer';

// --- Types ---

export interface CreatorPack {
  slug: string;
  name: string;
  status: string;
  downloads: number;
  revenue: { total: number; pending: number; currency: string };
  latest_version: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreatorTotals {
  packs_count: number;
  total_downloads: number;
  total_revenue: number;
  pending_payout: number;
}

export interface CreatorDashboard {
  packs: CreatorPack[];
  totals: CreatorTotals;
}

export interface CreateConstructRequest {
  name: string;
  slug: string;
  description: string;
  longDescription: string;
  category: string;
  tags: string[];
  tierRequired: string;
  isPublic: boolean;
  repositoryUrl: string | null;
  documentationUrl: string | null;
}

export interface ConstructResponse {
  id: string;
  slug: string;
  name: string;
}

export interface SkillAnalytics {
  totalDownloads: number;
  activeInstalls: number;
  thisMonth: number;
  lastMonth: number;
  dailyTrend: Array<{ date: string; installs: number; loads: number }>;
  versionBreakdown: Array<{ version: string; percentage: number }>;
}

// --- API Functions ---

export async function fetchCreatorDashboard(): Promise<CreatorDashboard> {
  const client = getAuthClient();
  const data = await client.get<{ data: CreatorDashboard }>('/creator/packs');
  return data.data;
}

export async function createConstruct(req: CreateConstructRequest): Promise<ConstructResponse> {
  const client = getAuthClient();
  const data = await client.post<{ data: ConstructResponse }>('/creator/skills', req);
  return data.data;
}

export async function updateConstruct(id: string, req: Partial<CreateConstructRequest>): Promise<ConstructResponse> {
  const client = getAuthClient();
  const data = await client.put<{ data: ConstructResponse }>(`/creator/skills/${id}`, req);
  return data.data;
}

export async function fetchSkillAnalytics(id: string): Promise<SkillAnalytics> {
  const client = getAuthClient();
  const data = await client.get<{ data: SkillAnalytics }>(`/creator/skills/${id}/analytics`);
  return data.data;
}

export async function submitPack(slug: string): Promise<void> {
  const client = getAuthClient();
  await client.post(`/packs/${slug}/submit`, {});
}

export async function registerRepo(slug: string, gitUrl: string, gitRef: string): Promise<void> {
  const client = getAuthClient();
  await client.post(`/packs/${slug}/register-repo`, { git_url: gitUrl, git_ref: gitRef });
}

export async function syncPack(slug: string): Promise<{ version: string; files_synced: number }> {
  const client = getAuthClient();
  const data = await client.post<{ data: { version: string; files_synced: number } }>(`/packs/${slug}/sync`, {});
  return data.data;
}
