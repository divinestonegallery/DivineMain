// @ts-nocheck
import { cookies } from "next/headers";
import { apiUrl } from "@/api/client";

export type GallerySession = {
  userId: string;
  sessionId: string | null;
};

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice(7).trim() || null;
}

function cookieToken(cookieHeader: string | null) {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === "dsg_access_token") return decodeURIComponent(value.join("="));
    if (name === "sessionid") return decodeURIComponent(value.join("="));
  }

  return null;
}

async function verifySessionToken(token: string): Promise<GallerySession | null> {
  try {
    const response = await fetch(apiUrl("/api/v1/auth/profile"), {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const user = payload?.data ?? payload;
    const userId = user?.id ?? user?.uid ?? user?.email;
    return userId ? { userId: String(userId), sessionId: token } : null;
  } catch {
    return null;
  }
}

export async function getGallerySessionFromRequest(request: Request) {
  const token = bearerToken(request) ?? cookieToken(request.headers.get("cookie"));
  return token ? verifySessionToken(token) : null;
}

export async function getGallerySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dsg_access_token")?.value ?? cookieStore.get("sessionid")?.value;
  return token ? verifySessionToken(token) : null;
}

export function isGalleryAuthConfigured() {
  return true;
}
