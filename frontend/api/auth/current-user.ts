// @ts-nocheck
import { fetchApi } from "@/api/services/api";

export async function synchronizeCurrentClerkUser(userId: string) {
  // Try fetching from Django
  try {
    const data = await fetchApi<any>("/me", { requireAuth: true });
    return data.user;
  } catch {
    return null;
  }
}
