// @ts-nocheck
/**
 * API Service for DivineMain Frontend
 * Centralized fetch wrapper to communicate with the Django backend.
 */

import { apiHeaders, apiUrl } from "@/api/client";

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { requireAuth = false, headers, ...customConfig } = options;
  const nextHeaders = apiHeaders(headers, Boolean(customConfig.body));

  if (requireAuth) {
    const token = typeof window === "undefined" ? null : window.localStorage.getItem("dsg_access_token");
    if (!token) throw new Error("Please sign in to continue.");
  }

  const response = await fetch(apiUrl(`/api/v1${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`), {
    ...customConfig,
    headers: nextHeaders,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || `API Error: ${response.status}`);
  }

  return response.json();
}
