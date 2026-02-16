'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProfile, updateProfile, type Profile, type UpdateProfileRequest } from './profile';
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
