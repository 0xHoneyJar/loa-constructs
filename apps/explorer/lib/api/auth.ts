import { publicClient } from './client';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export async function loginApi(data: LoginRequest): Promise<AuthTokens> {
  return publicClient.post<AuthTokens>('/auth/login', data);
}

export async function registerApi(data: RegisterRequest): Promise<{ message: string }> {
  return publicClient.post<{ message: string }>('/auth/register', data);
}

export async function refreshTokenApi(refreshToken: string): Promise<AuthTokens> {
  return publicClient.post<AuthTokens>('/auth/refresh', { refresh_token: refreshToken });
}

export async function logoutApi(accessToken: string): Promise<void> {
  await publicClient.post<void>('/auth/logout', undefined, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function fetchMe(accessToken: string): Promise<User> {
  return publicClient.get<User>('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function forgotPasswordApi(email: string): Promise<{ message: string }> {
  return publicClient.post<{ message: string }>('/auth/forgot-password', { email });
}

export async function resetPasswordApi(data: ResetPasswordRequest): Promise<{ message: string }> {
  return publicClient.post<{ message: string }>('/auth/reset-password', data);
}

export async function verifyEmailApi(token: string): Promise<{ message: string }> {
  return publicClient.post<{ message: string }>('/auth/verify', { token });
}
