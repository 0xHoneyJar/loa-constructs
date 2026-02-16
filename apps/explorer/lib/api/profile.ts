import { getAuthClient } from '@/components/auth/auth-initializer';

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface UpdateProfileRequest {
  name?: string;
  avatarUrl?: string;
}

export async function fetchProfile(): Promise<Profile> {
  return getAuthClient().get<Profile>('/auth/me');
}

export async function updateProfile(data: UpdateProfileRequest): Promise<Profile> {
  // Note: T1.0 identified no PUT /profile endpoint. Using auth/me PATCH if available,
  // or this will need API work. For now, typed for when API is ready.
  return getAuthClient().put<Profile>('/profile', data);
}
