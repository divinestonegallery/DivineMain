// @ts-nocheck
import { fetchApi } from "@/api/services/api";

export const ACCESS_TOKEN_KEY = "dsg_access_token";
export const REFRESH_TOKEN_KEY = "dsg_refresh_token";

function authData(payload: any) {
  return payload?.data ?? payload;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=2592000; samesite=lax`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

function broadcastAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("dsg:auth-change"));
}

export function persistAuthSession(payload: any) {
  const data = authData(payload);
  const accessToken = data?.access ?? data?.access_token ?? data?.tokens?.access ?? data?.token ?? null;
  const refreshToken = data?.refresh ?? data?.refresh_token ?? data?.tokens?.refresh ?? null;

  if (typeof window !== "undefined") {
    if (accessToken) window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  if (accessToken) writeCookie(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) writeCookie(REFRESH_TOKEN_KEY, refreshToken);
  broadcastAuthChange();

  return data;
}

export function clearAuthSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  clearCookie(ACCESS_TOKEN_KEY);
  clearCookie(REFRESH_TOKEN_KEY);
  clearCookie("sessionid");
  broadcastAuthChange();
}

export function onAuthSessionChange(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  const storageHandler = (event: StorageEvent) => {
    if (!event.key || [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY].includes(event.key)) callback();
  };
  window.addEventListener("dsg:auth-change", handler);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener("dsg:auth-change", handler);
    window.removeEventListener("storage", storageHandler);
  };
}

export async function login(credentials: any) {
  try {
    const data = await fetchApi<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    return persistAuthSession(data);
  } catch (error: any) {
    throw new Error(error.message || "Failed to login");
  }
}

export async function register(userData: any) {
  try {
    const data = await fetchApi<any>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    return persistAuthSession(data);
  } catch (error: any) {
    throw new Error(error.message || "Failed to register");
  }
}

export async function getCurrentUser() {
  const data = await fetchApi<any>("/auth/profile", { requireAuth: true });
  return authData(data);
}
