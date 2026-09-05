// @ts-nocheck
const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "https://api.divinestonegallery.com";

export const API_BASE_URL = rawBaseUrl
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/i, "");

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getStoredAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("dsg_access_token");
}

export function apiHeaders(headers?: HeadersInit, hasBody = false) {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("Accept", "application/json");

  if (hasBody && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }

  const accessToken = getStoredAccessToken();
  if (accessToken && !nextHeaders.has("Authorization")) {
    nextHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return nextHeaders;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      headers: apiHeaders(options.headers, Boolean(options.body)),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(`Could not reach the API at ${apiUrl(path)}.`, 503);
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !payload?.success) {
    throw new ApiError(payload?.message ?? "The request could not be completed.", response.status, payload?.data);
  }

  return payload.data;
}
