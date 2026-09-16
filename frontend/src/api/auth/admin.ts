// @ts-nocheck
// drizzle removed
// schema removed
import { localUserId } from "./clerk-sync";
import { synchronizeCurrentClerkUser } from "./current-user";
import { getGallerySession, isGalleryAuthConfigured } from "./server";

export type CurrentStaffAccess =
  | { status: "auth-unconfigured" }
  | { status: "signed-out" }
  | { status: "forbidden" }
  | { status: "storage-unavailable" }
  | { status: "authorized"; userId: string };

export async function getCurrentStaffAccess(): Promise<CurrentStaffAccess> {
  if (!isGalleryAuthConfigured()) return { status: "auth-unconfigured" };
  const session = await getGallerySession();
  if (!session) return { status: "signed-out" };

  try {
    await synchronizeCurrentClerkUser(session.userId);
    const { getDb } = await import("@/db");
    const db = getDb();
    const userId = localUserId(session.userId);
    const [staff] = await db
      .select({ id: staffMembers.id })
      .from(staffMembers)
      .where(and(eq(staffMembers.userId, userId), eq(staffMembers.status, "active")))
      .limit(1);
    return staff ? { status: "authorized", userId } : { status: "forbidden" };
  } catch {
    return { status: "storage-unavailable" };
  }
}
