// @ts-nocheck
/**
 * API Service for DivineMain Frontend
 * Centralized fetch wrapper to communicate with the Django backend.
 */

import { ACCESS_TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY, apiHeaders, apiUrl, getStoredAccessToken } from "@/api/client";

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

function formatApiErrorDetails(details: unknown): string {
  if (!details) return "";
  if (typeof details === "string") return details;
  if (Array.isArray(details)) return details.map(formatApiErrorDetails).filter(Boolean).join(" ");
  if (typeof details === "object") {
    return Object.entries(details as Record<string, unknown>)
      .map(([field, value]) => {
        const message = formatApiErrorDetails(value);
        return message ? `${field}: ${message}` : "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return String(details);
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=2592000; samesite=lax`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

function clearStoredAuthSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("dsg:auth-change"));
  }

  clearCookie(ACCESS_TOKEN_STORAGE_KEY);
  clearCookie(REFRESH_TOKEN_STORAGE_KEY);
  clearCookie("sessionid");
}

function authData(payload: any) {
  return payload?.data ?? payload;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshStoredAuthSession() {
  if (typeof window === "undefined") return false;

  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(apiUrl("/api/v1/auth/refresh"), {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.success === false) return false;

        const data = authData(payload);
        const accessToken = data?.access ?? data?.access_token ?? data?.tokens?.access ?? data?.token ?? null;
        const nextRefreshToken = data?.refresh ?? data?.refresh_token ?? data?.tokens?.refresh ?? refreshToken;

        if (!accessToken) return false;

        window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
        if (nextRefreshToken) window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, nextRefreshToken);
        writeCookie(ACCESS_TOKEN_STORAGE_KEY, accessToken);
        if (nextRefreshToken) writeCookie(REFRESH_TOKEN_STORAGE_KEY, nextRefreshToken);
        window.dispatchEvent(new CustomEvent("dsg:auth-change"));
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function requestWithFreshHeaders(path: string, customConfig: RequestInit, headers: HeadersInit | undefined) {
  return fetch(apiUrl(path), {
    ...customConfig,
    headers: apiHeaders(headers, Boolean(customConfig.body)),
    cache: "no-store",
  });
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { requireAuth = false, headers, ...customConfig } = options;

  if (requireAuth) {
    const token = getStoredAccessToken();
    const refreshed = token ? true : await refreshStoredAuthSession();
    if (!refreshed) {
      clearStoredAuthSession();
      throw new Error("Please sign in to continue.");
    }
  }

  const path = `/api/v1${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  let response: Response;
  let payload: any;

  try {
    response = await requestWithFreshHeaders(path, customConfig, headers);
  } catch {
    throw new Error("Unable to reach the backend. Please check your connection and try again.");
  }

  payload = await response.json().catch(() => null);

  if (requireAuth && response.status === 401 && (await refreshStoredAuthSession())) {
    try {
      response = await requestWithFreshHeaders(path, customConfig, headers);
      payload = await response.json().catch(() => null);
    } catch {
      throw new Error("Unable to reach the backend. Please check your connection and try again.");
    }
  }

  if (!response.ok || payload?.success === false) {
    if (requireAuth && response.status === 401) clearStoredAuthSession();
    const details = formatApiErrorDetails(payload?.data);
    const message = payload?.message || `API Error: ${response.status}`;
    throw new Error(details ? `${message}: ${details}` : message);
  }

  return payload;
}
