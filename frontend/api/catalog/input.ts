// @ts-nocheck
import { readTextWithinLimit } from "@/api/security/request-limits";

export type JsonObject = Record<string, unknown>;

export async function readJsonObject(request: Request): Promise<JsonObject | null> {
  try {
    const text = await readTextWithinLimit(request, 64 * 1024);
    if (text === null) return null;
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as JsonObject)
      : null;
  } catch {
    return null;
  }
}

export function requiredString(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

export function optionalString(value: unknown, maxLength = 500) {
  if (value === null || value === undefined || value === "") return null;
  return requiredString(value, maxLength);
}

export function optionalInteger(value: unknown, minimum = 0) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = typeof value === "number" ? value : Number(value);
  return Number.isInteger(normalized) && normalized >= minimum ? normalized : undefined;
}

export function enumValue<const T extends readonly string[]>(value: unknown, allowed: T) {
  return typeof value === "string" && allowed.includes(value) ? (value as T[number]) : null;
}

export function slugValue(value: unknown) {
  const slug = requiredString(value, 160)?.toLowerCase();
  return slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}
