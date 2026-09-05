// @ts-nocheck
import { getCurrentUser } from "@/api/auth";

export async function synchronizeCurrentClerkUser(userId: string) {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}
