/** Shared configuration constants for the explorer app */

export const API_BASE =
  process.env.CONSTRUCTS_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.constructs.network/v1';

export const FETCH_TIMEOUT_MS = 15_000;

/** Fetch with an AbortController timeout to prevent hung requests during build */
export async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
