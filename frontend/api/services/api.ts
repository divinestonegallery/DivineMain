// @ts-nocheck
/**
 * API Service for DivineMain Frontend
 * Centralized fetch wrapper to communicate with the Django backend.
 */

import { apiHeaders, apiUrl } from "@/api/client";

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

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { requireAuth = false, headers, ...customConfig } = options;
  const nextHeaders = apiHeaders(headers, Boolean(customConfig.body));

  if (requireAuth) {
    const token = typeof window === "undefined" ? null : window.localStorage.getItem("dsg_access_token");
    if (!token) throw new Error("Please sign in to continue.");
  }

  const path = `/api/v1${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  let response: Response;

  try {
    response = await fetch(apiUrl(path), {
      ...customConfig,
      headers: nextHeaders,
      cache: "no-store",
    });
  } catch {
    throw new Error("Unable to reach the backend. Please check your connection and try again.");
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    const details = formatApiErrorDetails(payload?.data);
    const message = payload?.message || `API Error: ${response.status}`;
    throw new Error(details ? `${message}: ${details}` : message);
  }

  return payload;
}
