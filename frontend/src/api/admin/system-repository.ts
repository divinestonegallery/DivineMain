// @ts-nocheck
// drizzle removed
// schema removed

async function database() { const { getDb } = await import("@/db"); return getDb(); }

export const settingDefinitions = [
  { key: "business_name", label: "Business name", group: "Business", defaultValue: "Divine Stone Gallery" },
  { key: "support_email", label: "Customer email", group: "Business", defaultValue: "divinestonegallery@gmail.com" },
  { key: "support_phone", label: "Customer phone", group: "Business", defaultValue: "+91 91661 38566" },
  { key: "business_address", label: "Workshop address", group: "Business", defaultValue: "Alwar, Rajasthan, India" },
  { key: "currency", label: "Currency", group: "Commerce", defaultValue: "INR" },
  { key: "gst_display", label: "GST display", group: "Commerce", defaultValue: "Excluded; calculated separately" },
  { key: "shipping_display", label: "Shipping display", group: "Commerce", defaultValue: "Calculated from postcode, size and weight" },
  { key: "order_email_enabled", label: "Order email notifications", group: "Notifications", defaultValue: "true" },
  { key: "order_sms_enabled", label: "Order SMS notifications", group: "Notifications", defaultValue: "true" },
  { key: "order_whatsapp_enabled", label: "Order WhatsApp notifications", group: "Notifications", defaultValue: "true" },
] as const;

export async function listSystemAdminData() {
  const db = await database();
  const [stored, people, audit] = await Promise.all([
    db.select().from(businessSettings).orderBy(asc(businessSettings.groupName), asc(businessSettings.key)),
    db.select({ id: users.id, email: users.email, displayName: users.displayName, userStatus: users.status, staffId: staffMembers.id, staffStatus: staffMembers.status, accessLevel: staffMembers.accessLevel, createdAt: users.createdAt })
      .from(users).leftJoin(staffMembers, eq(users.id, staffMembers.userId)).orderBy(asc(users.displayName)),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100),
  ]);
  const byKey = new Map(stored.map((item) => [item.key, item]));
  return {
    settings: settingDefinitions.map((definition) => ({ ...definition, value: byKey.get(definition.key)?.value ?? definition.defaultValue, updatedAt: byKey.get(definition.key)?.updatedAt ?? null })),
    users: people,
    audit,
  };
}

export async function updateBusinessSetting(key: string, value: string, actorUserId: string) {
  const definition = settingDefinitions.find((item) => item.key === key);
  if (!definition) throw new Error("UNKNOWN_SETTING");
  const db = await database();
  await db.batch([
    db.insert(businessSettings).values({ key, value, groupName: definition.group.toLowerCase(), updatedByUserId: actorUserId })
      .onConflictDoUpdate({ target: businessSettings.key, set: { value, groupName: definition.group.toLowerCase(), updatedByUserId: actorUserId, updatedAt: sql`(extract(epoch from now())::integer)` } }),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "business_setting.updated", entityType: "business_setting", entityId: key, changesJson: JSON.stringify({ value }) }),
  ]);
  return listSystemAdminData();
}

export async function updateStaffAccess(userId: string, status: "active" | "disabled", actorUserId: string) {
  const db = await database();
  const [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (!target || (status === "disabled" && target.email?.toLowerCase() === "divinestonegallery@gmail.com")) throw new Error("OWNER_PROTECTED");
  await db.batch([
    db.insert(staffMembers).values({ id: `staff:${crypto.randomUUID()}`, userId, accessLevel: "full_access", status, invitedByUserId: actorUserId })
      .onConflictDoUpdate({ target: staffMembers.userId, set: { status, updatedAt: sql`(extract(epoch from now())::integer)` } }),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: status === "active" ? "staff.activated" : "staff.disabled", entityType: "staff_member", entityId: userId, changesJson: JSON.stringify({ status, accessLevel: "full_access" }) }),
  ]);
  return listSystemAdminData();
}
