// @ts-nocheck
import { cookies } from "next/headers";

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
    if (name === "sessionid") return decodeURIComponent(value.join("="));
  }

  return null;
}

async function verifySessionToken(token: string): Promise<GallerySession | null> {
  // In full implementation, call Django API to verify token
  // const res = await fetch("http://localhost:8000/api/v1/auth/verify", { headers: { Authorization: `Bearer ${token}` } });
  // if (res.ok) {
  //   const data = await res.json();
  //   return { userId: data.user.id, sessionId: token };
  // }
  return null;
}

export async function getGallerySessionFromRequest(request: Request) {
  const token = bearerToken(request) ?? cookieToken(request.headers.get("cookie"));
  return token ? verifySessionToken(token) : null;
}

export async function getGallerySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sessionid")?.value;
  return token ? verifySessionToken(token) : null;
}

export function isGalleryAuthConfigured() {
  return true;
}
