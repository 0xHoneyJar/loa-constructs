const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.CONSTRUCTS_API_URL ||
  'https://api.constructs.network/v1';

interface ApiError {
  status: number;
  message: string;
  code?: string;
}

class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = error.status;
    this.code = error.code;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = response.statusText;
    let code: string | undefined;
    try {
      const body = await response.json();
      message = body.message || body.error || message;
      code = body.code;
    } catch {
      // Use statusText
    }
    throw new ApiClientError({ status: response.status, message, code });
  }
  return response.json();
}

function buildUrl(path: string): string {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

// Public client — no auth, for ISR server components and auth endpoints
export const publicClient = {
  async get<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(buildUrl(path), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
    return parseResponse<T>(response);
  },

  async post<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    const response = await fetch(buildUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
    return parseResponse<T>(response);
  },

  async put<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    const response = await fetch(buildUrl(path), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
    return parseResponse<T>(response);
  },

  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(buildUrl(path), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
    return parseResponse<T>(response);
  },
};

// Authenticated client factory — uses dependency injection to avoid circular imports
interface AuthClientOptions {
  getToken: () => string | undefined;
  onRefresh: () => Promise<void>;
  onAuthFailure: () => void;
}

let refreshPromise: Promise<void> | null = null;

export function createAuthClient({ getToken, onRefresh, onAuthFailure }: AuthClientOptions) {
  async function authFetch<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(buildUrl(path), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });

    if (response.status === 401) {
      // Single-flight refresh
      if (!refreshPromise) {
        refreshPromise = onRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      try {
        await refreshPromise;
      } catch {
        onAuthFailure();
        throw new ApiClientError({ status: 401, message: 'Authentication failed' });
      }

      // Single retry with new token
      const newToken = getToken();
      const retryHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
      };
      if (newToken) {
        retryHeaders.Authorization = `Bearer ${newToken}`;
      }

      const retryResponse = await fetch(buildUrl(path), {
        method,
        headers: retryHeaders,
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      });

      if (retryResponse.status === 401) {
        onAuthFailure();
        throw new ApiClientError({ status: 401, message: 'Authentication failed after refresh' });
      }

      return parseResponse<T>(retryResponse);
    }

    return parseResponse<T>(response);
  }

  return {
    get: <T>(path: string, options?: RequestInit) => authFetch<T>('GET', path, undefined, options),
    post: <T>(path: string, body?: unknown, options?: RequestInit) =>
      authFetch<T>('POST', path, body, options),
    put: <T>(path: string, body?: unknown, options?: RequestInit) =>
      authFetch<T>('PUT', path, body, options),
    delete: <T>(path: string, options?: RequestInit) =>
      authFetch<T>('DELETE', path, undefined, options),
  };
}

export { ApiClientError };
export type { ApiError };
