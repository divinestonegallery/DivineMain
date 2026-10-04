// @ts-nocheck
const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const ACCESS_TOKEN_STORAGE_KEY = "dsg_access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "dsg_refresh_token";

export const API_BASE_URL = rawBaseUrl
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api(?:\/v1)?$/i, "");

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

type ApiRequestOptions = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

export class ApiError extends Error {
  status: number;
  details: unknown;
  code?: string;
  retryable?: boolean;

  constructor(message: string, status: number, details?: unknown, code?: string, retryable?: boolean) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.code = code;
    this.retryable = retryable;
  }
}

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE_URL) return normalizedPath;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getStoredAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
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

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      headers: apiHeaders(options.headers, Boolean(options.body)),
      cache: options.cache ?? "no-store",
    });
  } catch {
    throw new ApiError(`Could not reach the API at ${apiUrl(path)}.`, 503);
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.error?.message ?? payload?.message ?? "The request could not be completed.",
      response.status,
      payload?.data,
      payload?.error?.code,
      payload?.error?.retryable,
    );
  }

  return payload.data;
}
