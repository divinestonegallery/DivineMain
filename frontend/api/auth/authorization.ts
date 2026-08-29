// @ts-nocheck
// drizzle removed
// schema removed
import { localUserId } from "./clerk-sync";
import { getGallerySessionFromRequest } from "./server";

export type AuthorizationResult =
  | { authorized: true; clerkUserId: string; userId: string }
  | { authorized: false; status: 401 | 403 };

export async function authorizeCustomer(request: Request): Promise<AuthorizationResult> {
  const session = await getGallerySessionFromRequest(request);
  if (!session) return { authorized: false, status: 401 };

  return {
    authorized: true,
    clerkUserId: session.userId,
    userId: localUserId(session.userId),
  };
}

export async function authorizeStaff(request: Request): Promise<AuthorizationResult> {
  const customer = await authorizeCustomer(request);
  if (!customer.authorized) return customer;

  const { getDb } = await import("@/db");
  const db = getDb();
  const [staff] = await db
    .select({ id: staffMembers.id })
    .from(staffMembers)
    .where(
      and(
        eq(staffMembers.userId, customer.userId),
        eq(staffMembers.status, "active"),
      ),
    )
    .limit(1);

  return staff ? customer : { authorized: false, status: 403 };
}
