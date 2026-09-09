// @ts-nocheck
// drizzle removed
// schema removed

export type ClerkIdentityProfile = {
  clerkUserId: string;
  displayName: string;
  email: string | null;
  phoneE164: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
};

export function localUserId(clerkUserId: string) {
  return `clerk:${clerkUserId}`;
}

async function database() {
  const { getDb } = await import("@/db");
  return getDb();
}

export async function syncClerkIdentity(profile: ClerkIdentityProfile) {
  const db = await database();
  const userId = localUserId(profile.clerkUserId);
  const now = sql`(extract(epoch from now())::integer)`;

  await db.batch([
    db
      .insert(users)
      .values({
        id: userId,
        email: profile.email,
        phoneE164: profile.phoneE164,
        displayName: profile.displayName,
        emailVerifiedAt: profile.emailVerified ? now : null,
        phoneVerifiedAt: profile.phoneVerified ? now : null,
        status: "active",
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: profile.email,
          phoneE164: profile.phoneE164,
          displayName: profile.displayName,
          emailVerifiedAt: profile.emailVerified ? now : null,
          phoneVerifiedAt: profile.phoneVerified ? now : null,
          status: "active",
          updatedAt: now,
        },
      }),
    db
      .insert(authIdentities)
      .values({
        id: `clerk:${profile.clerkUserId}`,
        userId,
        provider: "clerk",
        providerSubject: profile.clerkUserId,
        lastAuthenticatedAt: now,
      })
      .onConflictDoUpdate({
        target: [authIdentities.provider, authIdentities.providerSubject],
        set: { userId, lastAuthenticatedAt: now, updatedAt: now },
      }),
    db
      .insert(wishlists)
      .values({ id: `wishlist:${profile.clerkUserId}`, userId })
      .onConflictDoNothing({ target: wishlists.userId }),
    db
      .insert(carts)
      .values({ id: `cart:${profile.clerkUserId}`, userId, status: "active" })
      .onConflictDoNothing(),
  ]);

  const initialAdminEmails = (process.env.INITIAL_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (profile.email && initialAdminEmails.includes(profile.email.toLowerCase())) {
    await db
      .insert(staffMembers)
      .values({
        id: `staff:${profile.clerkUserId}`,
        userId,
        accessLevel: "full_access",
        status: "active",
      })
      .onConflictDoUpdate({
        target: staffMembers.userId,
        set: { status: "active", updatedAt: now },
      });
  }

  return userId;
}

export async function markClerkIdentityDeleted(clerkUserId: string) {
  const db = await database();
  await db
    .update(users)
    .set({ status: "deleted", updatedAt: sql`(extract(epoch from now())::integer)` })
    .where(sql`${users.id} = ${localUserId(clerkUserId)}`);
}

type ClerkEmail = {
  id: string;
  email_address: string;
  verification?: { status?: string } | null;
};

type ClerkPhone = {
  id: string;
  phone_number: string;
  verification?: { status?: string } | null;
};

export function profileFromWebhookUser(data: {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email_address_id?: string | null;
  primary_phone_number_id?: string | null;
  email_addresses?: ClerkEmail[];
  phone_numbers?: ClerkPhone[];
}): ClerkIdentityProfile {
  const email = data.email_addresses?.find(
    (item) => item.id === data.primary_email_address_id,
  );
  const phone = data.phone_numbers?.find(
    (item) => item.id === data.primary_phone_number_id,
  );
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();

  return {
    clerkUserId: data.id,
    displayName: fullName || email?.email_address || phone?.phone_number || "Gallery customer",
    email: email?.email_address.toLowerCase() ?? null,
    phoneE164: phone?.phone_number ?? null,
    emailVerified: email?.verification?.status === "verified",
    phoneVerified: phone?.verification?.status === "verified",
  };
}

export function profileFromBackendUser(data: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  primaryEmailAddressId?: string | null;
  primaryPhoneNumberId?: string | null;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification?: { status?: string } | null;
  }>;
  phoneNumbers: Array<{
    id: string;
    phoneNumber: string;
    verification?: { status?: string } | null;
  }>;
}): ClerkIdentityProfile {
  const email = data.emailAddresses.find((item) => item.id === data.primaryEmailAddressId);
  const phone = data.phoneNumbers.find((item) => item.id === data.primaryPhoneNumberId);
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();

  return {
    clerkUserId: data.id,
    displayName: fullName || email?.emailAddress || phone?.phoneNumber || "Gallery customer",
    email: email?.emailAddress.toLowerCase() ?? null,
    phoneE164: phone?.phoneNumber ?? null,
    emailVerified: email?.verification?.status === "verified",
    phoneVerified: phone?.verification?.status === "verified",
  };
}
