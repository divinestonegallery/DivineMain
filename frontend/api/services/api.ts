// @ts-nocheck
/**
 * API Service for DivineMain Frontend
 * Centralized fetch wrapper to communicate with the Django backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { requireAuth = false, headers, ...customConfig } = options;

  const config: RequestInit = {
    ...customConfig,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (requireAuth) {
    // In a real implementation, get the token from cookies/localStorage/auth context
    // const token = getToken();
    // if (token) {
    //   config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    // }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || `API Error: ${response.status}`);
  }

  return response.json();
}
