'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProfile, updateProfile, type Profile, type UpdateProfileRequest } from './profile';
import {
  fetchCreatorDashboard,
  createConstruct,
  updateConstruct,
  fetchSkillAnalytics,
  type CreatorDashboard,
  type CreateConstructRequest,
  type ConstructResponse,
  type SkillAnalytics,
} from './creator';
import {
  fetchTeams as fetchTeamsApi,
  fetchTeam as fetchTeamApi,
  createTeam as createTeamApi,
  inviteTeamMember as inviteTeamMemberApi,
  type Team,
  type TeamDetail,
} from './teams';
import { getAuthClient } from '@/components/auth/auth-initializer';

// === Profile hooks ===

export function useProfile() {
  return useQuery<Profile>({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<Profile, Error, UpdateProfileRequest>({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
    },
  });
}

// === Dashboard stats ===

interface DashboardStats {
  constructsPublished: number;
  totalDownloads: number;
  totalViews: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const client = getAuthClient();
      const [packs] = await Promise.all([
        client.get<{ packs: Array<{ downloads: number; views: number }> }>('/creator/packs'),
        client.get<{ total: number }>('/creator/earnings'),
      ]);
      return {
        constructsPublished: packs.packs?.length ?? 0,
        totalDownloads: packs.packs?.reduce((sum, p) => sum + (p.downloads ?? 0), 0) ?? 0,
        totalViews: packs.packs?.reduce((sum, p) => sum + (p.views ?? 0), 0) ?? 0,
        recentActivity: [],
      };
    },
  });
}

// === API Keys ===

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface CreateApiKeyResponse {
  key: ApiKey;
  fullKey: string;
}

export function useApiKeys() {
  return useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const client = getAuthClient();
      const data = await client.get<{ keys: ApiKey[] }>('/api-keys');
      return data.keys ?? [];
    },
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation<CreateApiKeyResponse, Error, { name: string }>({
    mutationFn: async (data) => {
      const client = getAuthClient();
      return client.post<CreateApiKeyResponse>('/api-keys', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string, { prev?: ApiKey[] }>({
    mutationFn: async (keyId) => {
      const client = getAuthClient();
      await client.delete(`/api-keys/${keyId}`);
    },
    onMutate: async (keyId) => {
      await queryClient.cancelQueries({ queryKey: ['api-keys'] });
      const prev = queryClient.getQueryData<ApiKey[]>(['api-keys']);
      queryClient.setQueryData<ApiKey[]>(['api-keys'], (old) =>
        old?.filter((k) => k.id !== keyId) ?? [],
      );
      return { prev };
    },
    onError: (_err, _keyId, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['api-keys'], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

// === Creator hooks ===

export function useCreatorDashboard() {
  return useQuery<CreatorDashboard>({
    queryKey: ['creator-dashboard'],
    queryFn: fetchCreatorDashboard,
  });
}

export function useCreateConstruct() {
  const queryClient = useQueryClient();
  return useMutation<ConstructResponse, Error, CreateConstructRequest>({
    mutationFn: createConstruct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-dashboard'] });
    },
  });
}

export function useUpdateConstruct() {
  const queryClient = useQueryClient();
  return useMutation<ConstructResponse, Error, { id: string; data: Partial<CreateConstructRequest> }>({
    mutationFn: ({ id, data }) => updateConstruct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-dashboard'] });
    },
  });
}

export function useSkillAnalytics(id: string) {
  return useQuery<SkillAnalytics>({
    queryKey: ['skill-analytics', id],
    queryFn: () => fetchSkillAnalytics(id),
    enabled: !!id,
  });
}

// === Teams hooks ===

export function useTeams() {
  return useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: fetchTeamsApi,
  });
}

export function useTeam(teamId: string) {
  return useQuery<TeamDetail>({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeamApi(teamId),
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation<Team, Error, string>({
    mutationFn: createTeamApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { teamId: string; email: string; role: string }>({
    mutationFn: ({ teamId, email, role }) => inviteTeamMemberApi(teamId, email, role),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team', variables.teamId] });
    },
  });
}

// === Analytics hooks ===

interface AnalyticsData {
  totalInstalls: number;
  totalLoads: number;
  skillsUsed: number;
  trend: Array<{ date: string; installs: number; loads: number }>;
  skillBreakdown: Array<{ name: string; installs: number; loads: number; lastUsed: string | null }>;
}

export function useAnalytics(period: string) {
  return useQuery<AnalyticsData>({
    queryKey: ['analytics', period],
    queryFn: async () => {
      const client = getAuthClient();
      const data = await client.get<{ data: AnalyticsData }>(`/analytics/usage?period=${period}`);
      return data.data;
    },
  });
}

// === Constructs (public) ===

export interface ConstructListItem {
  id: string;
  type: string;
  name: string;
  slug: string;
  description: string | null;
  version: string | null;
  tier_required: string;
  category: string | null;
  downloads: number;
  rating: number | null;
  is_featured: boolean;
}

export function useConstructs(options?: {
  query?: string;
  category?: string;
  tier?: string;
  sort?: string;
  page?: number;
}) {
  return useQuery<{ data: ConstructListItem[]; pagination: { total: number; total_pages: number } }>({
    queryKey: ['constructs', options],
    queryFn: async () => {
      const client = getAuthClient();
      const params = new URLSearchParams();
      if (options?.query) params.set('q', options.query);
      if (options?.category) params.set('category', options.category);
      if (options?.tier) params.set('tier', options.tier);
      if (options?.sort) params.set('sort', options.sort);
      if (options?.page) params.set('page', String(options.page));
      const qs = params.toString();
      return client.get(`/constructs${qs ? `?${qs}` : ''}`);
    },
  });
}
