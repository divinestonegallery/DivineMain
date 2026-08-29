// @ts-nocheck
// drizzle removed
import { synchronizeCurrentClerkUser } from "@/api/auth/current-user";
import {
  auditLogs,
  commissionMedia,
  commissionMilestones,
  customCommissions,
  mediaAssets,
  milestoneMedia,
  notifications,
  users,
} from "@/db/schema";

async function database() {
  const { getDb } = await import("@/db");
  return getDb();
}

function commissionNumber() {
  return `DSG-C-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 7).toUpperCase()}`;
}

async function notificationStatements(db: Awaited<ReturnType<typeof database>>, customer: { id: string; email: string | null; phoneE164: string | null; emailVerifiedAt: number | null; phoneVerifiedAt: number | null; whatsappTransactionalOptInAt: number | null }, commissionId: string, templateKey: string) {
  const recipients = [
    customer.email && customer.emailVerifiedAt ? { channel: "email" as const, recipient: customer.email } : null,
    customer.phoneE164 && customer.phoneVerifiedAt ? { channel: "sms" as const, recipient: customer.phoneE164 } : null,
    customer.phoneE164 && customer.phoneVerifiedAt && customer.whatsappTransactionalOptInAt ? { channel: "whatsapp" as const, recipient: customer.phoneE164 } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  return recipients.map((recipient) => db.insert(notifications).values({
    id: `notification:${crypto.randomUUID()}`,
    userId: customer.id,
    commissionId,
    channel: recipient.channel,
    templateKey,
    recipient: recipient.recipient,
  }));
}

async function customerById(userId: string) {
  const db = await database();
  const [customer] = await db.select({ id: users.id, email: users.email, phoneE164: users.phoneE164, emailVerifiedAt: users.emailVerifiedAt, phoneVerifiedAt: users.phoneVerifiedAt, whatsappTransactionalOptInAt: users.whatsappTransactionalOptInAt })
    .from(users).where(eq(users.id, userId)).limit(1);
  return customer ?? null;
}

export async function createCommission(clerkUserId: string, userId: string, input: {
  title: string; deityOrSubject: string; requirements: string; preferredMaterial: string;
  destinationPostalCode: string; targetHeightMm: number | null; targetWidthMm: number | null; targetDepthMm: number | null;
}) {
  await synchronizeCurrentClerkUser(clerkUserId);
  const db = await database();
  const customer = await customerById(userId);
  if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
  const id = `commission:${crypto.randomUUID()}`;
  const number = commissionNumber();
  await db.batch([
    db.insert(customCommissions).values({ id, commissionNumber: number, userId, ...input }),
    ...(await notificationStatements(db, customer, id, "commission_submitted")),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId: userId, action: "commission.submitted", entityType: "custom_commission", entityId: id }),
  ] as unknown as Parameters<typeof db.batch>[0]);
  return { commissionNumber: number };
}

export async function listCustomerCommissions(userId: string) {
  const db = await database();
  return db.select({
    id: customCommissions.id, commissionNumber: customCommissions.commissionNumber, title: customCommissions.title,
    deityOrSubject: customCommissions.deityOrSubject, status: customCommissions.status,
    quotedPricePaise: customCommissions.quotedPricePaise, gstPaise: customCommissions.gstPaise,
    shippingPaise: customCommissions.shippingPaise, advanceAmountPaise: customCommissions.advanceAmountPaise,
    balanceAmountPaise: customCommissions.balanceAmountPaise, expectedCompletionAt: customCommissions.expectedCompletionAt,
    createdAt: customCommissions.createdAt, updatedAt: customCommissions.updatedAt,
  }).from(customCommissions).where(eq(customCommissions.userId, userId)).orderBy(desc(customCommissions.updatedAt));
}

async function commissionDetail(where: ReturnType<typeof eq>) {
  const db = await database();
  const [commission] = await db.select().from(customCommissions).where(where).limit(1);
  if (!commission) return null;
  const [references, milestones] = await Promise.all([
    db.select({ id: mediaAssets.id, filename: mediaAssets.originalFilename, contentType: mediaAssets.contentType, altText: mediaAssets.altText })
      .from(commissionMedia).innerJoin(mediaAssets, eq(commissionMedia.mediaAssetId, mediaAssets.id))
      .where(and(eq(commissionMedia.commissionId, commission.id), eq(mediaAssets.status, "ready"))).orderBy(asc(commissionMedia.createdAt)),
    db.select().from(commissionMilestones).where(eq(commissionMilestones.commissionId, commission.id)).orderBy(asc(commissionMilestones.sequence)),
  ]);
  const milestoneIds = milestones.map((item) => item.id);
  const allMedia = milestoneIds.length ? await db.select({ milestoneId: milestoneMedia.milestoneId, id: mediaAssets.id, filename: mediaAssets.originalFilename, contentType: mediaAssets.contentType, altText: mediaAssets.altText, sortOrder: milestoneMedia.sortOrder })
    .from(milestoneMedia).innerJoin(mediaAssets, eq(milestoneMedia.mediaAssetId, mediaAssets.id))
    .where(and(inArray(milestoneMedia.milestoneId, milestoneIds), eq(mediaAssets.status, "ready"))).orderBy(asc(milestoneMedia.sortOrder)) : [];
  return { ...commission, references, milestones: milestones.map((item) => ({ ...item, media: allMedia.filter((media) => media.milestoneId === item.id) })) };
}

export function getCustomerCommission(userId: string, number: string) {
  return commissionDetail(and(eq(customCommissions.userId, userId), eq(customCommissions.commissionNumber, number))!);
}

export function getCommissionById(id: string) {
  return commissionDetail(eq(customCommissions.id, id));
}

export async function listAdminCommissions() {
  const db = await database();
  return db.select({
    id: customCommissions.id, commissionNumber: customCommissions.commissionNumber, title: customCommissions.title,
    deityOrSubject: customCommissions.deityOrSubject, requirements: customCommissions.requirements,
    preferredMaterial: customCommissions.preferredMaterial, targetHeightMm: customCommissions.targetHeightMm,
    destinationPostalCode: customCommissions.destinationPostalCode, status: customCommissions.status,
    quotedPricePaise: customCommissions.quotedPricePaise, gstPaise: customCommissions.gstPaise,
    shippingPaise: customCommissions.shippingPaise, advanceAmountPaise: customCommissions.advanceAmountPaise,
    balanceAmountPaise: customCommissions.balanceAmountPaise, expectedCompletionAt: customCommissions.expectedCompletionAt,
    customerName: users.displayName, customerEmail: users.email, customerPhone: users.phoneE164,
    createdAt: customCommissions.createdAt, updatedAt: customCommissions.updatedAt,
  }).from(customCommissions).innerJoin(users, eq(customCommissions.userId, users.id)).orderBy(desc(customCommissions.updatedAt));
}

export async function updateCommission(id: string, patch: Record<string, unknown>, actorUserId: string) {
  const db = await database();
  const [commission] = await db.select({ id: customCommissions.id, userId: customCommissions.userId }).from(customCommissions).where(eq(customCommissions.id, id)).limit(1);
  if (!commission) return null;
  const customer = await customerById(commission.userId);
  if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
  const notification = typeof patch.status === "string"
    ? await notificationStatements(
      db,
      customer,
      commission.id,
      patch.status === "quoted" || patch.status === "awaiting_advance"
        ? "commission_quote_ready"
        : "commission_status_updated",
    )
    : [];
  await db.batch([
    db.update(customCommissions).set({ ...patch, assignedStaffUserId: actorUserId, updatedAt: sql`(extract(epoch from now())::integer)` }).where(eq(customCommissions.id, id)),
    ...notification,
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "commission.updated", entityType: "custom_commission", entityId: id, changesJson: JSON.stringify(patch) }),
  ] as unknown as Parameters<typeof db.batch>[0]);
  return getCommissionById(id);
}

export async function createMilestone(commissionId: string, input: { title: string; description: string | null }, actorUserId: string) {
  const db = await database();
  const [commission] = await db.select({ id: customCommissions.id }).from(customCommissions).where(eq(customCommissions.id, commissionId)).limit(1);
  if (!commission) return null;
  const [row] = await db.select({ sequence: max(commissionMilestones.sequence) }).from(commissionMilestones).where(eq(commissionMilestones.commissionId, commissionId));
  const id = `milestone:${crypto.randomUUID()}`;
  await db.batch([
    db.insert(commissionMilestones).values({ id, commissionId, sequence: (row?.sequence ?? 0) + 1, ...input }),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "commission_milestone.created", entityType: "commission_milestone", entityId: id, changesJson: JSON.stringify(input) }),
  ]);
  return getCommissionById(commissionId);
}

export async function decideMilestone(userId: string, number: string, milestoneId: string, decision: "approved" | "changes_requested", note: string | null) {
  const db = await database();
  const [row] = await db.select({ commissionId: customCommissions.id, milestoneId: commissionMilestones.id, status: commissionMilestones.status })
    .from(customCommissions).innerJoin(commissionMilestones, eq(commissionMilestones.commissionId, customCommissions.id))
    .where(and(eq(customCommissions.userId, userId), eq(customCommissions.commissionNumber, number), eq(commissionMilestones.id, milestoneId))).limit(1);
  if (!row || row.status !== "submitted") return null;
  let commissionStatus: "in_production" | "ready_to_ship" = "in_production";
  if (decision === "approved") {
    const [remaining] = await db.select({ count: sql<number>`count(*)` }).from(commissionMilestones)
      .where(and(eq(commissionMilestones.commissionId, row.commissionId), sql`${commissionMilestones.id} != ${milestoneId}`, sql`${commissionMilestones.status} != 'approved'`));
    commissionStatus = Number(remaining?.count ?? 0) === 0 ? "ready_to_ship" : "in_production";
  }
  await db.batch([
    db.update(commissionMilestones).set({ status: decision, customerNote: note, approvedAt: decision === "approved" ? sql`(extract(epoch from now())::integer)` : null, updatedAt: sql`(extract(epoch from now())::integer)` }).where(eq(commissionMilestones.id, milestoneId)),
    db.update(customCommissions).set({ status: commissionStatus, updatedAt: sql`(extract(epoch from now())::integer)` }).where(eq(customCommissions.id, row.commissionId)),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId: userId, action: `commission_milestone.${decision}`, entityType: "commission_milestone", entityId: milestoneId, changesJson: JSON.stringify({ note }) }),
  ]);
  return getCustomerCommission(userId, number);
}

export type CommissionAsset = {
  id: string;
  storageKey: string;
  originalFilename: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  byteSize: number;
  checksumSha256: string;
  altText: string;
};

export async function attachCommissionReference(
  userId: string,
  number: string,
  asset: CommissionAsset,
) {
  const db = await database();
  const [commission] = await db.select({ id: customCommissions.id }).from(customCommissions)
    .where(and(eq(customCommissions.userId, userId), eq(customCommissions.commissionNumber, number))).limit(1);
  if (!commission) return null;
  await db.batch([
    db.insert(mediaAssets).values({ ...asset, uploadedByUserId: userId, kind: "image", status: "ready" }),
    db.insert(commissionMedia).values({ commissionId: commission.id, mediaAssetId: asset.id, source: "website" }),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId: userId, action: "commission_reference.created", entityType: "commission_media", entityId: asset.id }),
  ]);
  return asset.id;
}

export async function submitMilestone(
  commissionId: string,
  milestoneId: string,
  staffNote: string | null,
  assets: CommissionAsset[],
  actorUserId: string,
) {
  const db = await database();
  const [row] = await db.select({
    milestoneId: commissionMilestones.id,
    milestoneStatus: commissionMilestones.status,
    commissionId: customCommissions.id,
    userId: customCommissions.userId,
  }).from(commissionMilestones).innerJoin(customCommissions, eq(commissionMilestones.commissionId, customCommissions.id))
    .where(and(eq(customCommissions.id, commissionId), eq(commissionMilestones.id, milestoneId))).limit(1);
  if (!row || !["pending", "in_progress", "changes_requested"].includes(row.milestoneStatus)) return null;
  const customer = await customerById(row.userId);
  if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
  const statements: unknown[] = [
    db.update(commissionMilestones).set({ status: "submitted", staffNote, submittedAt: sql`(extract(epoch from now())::integer)`, approvedAt: null, updatedAt: sql`(extract(epoch from now())::integer)` }).where(eq(commissionMilestones.id, milestoneId)),
    db.update(customCommissions).set({ status: "awaiting_approval", assignedStaffUserId: actorUserId, updatedAt: sql`(extract(epoch from now())::integer)` }).where(eq(customCommissions.id, commissionId)),
    ...assets.map((asset) => db.insert(mediaAssets).values({ ...asset, uploadedByUserId: actorUserId, kind: "image", status: "ready" })),
    ...assets.map((asset, index) => db.insert(milestoneMedia).values({ milestoneId, mediaAssetId: asset.id, sortOrder: index + 1 })),
    ...(await notificationStatements(db, customer, commissionId, "commission_milestone_ready")),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "commission_milestone.submitted", entityType: "commission_milestone", entityId: milestoneId, changesJson: JSON.stringify({ staffNote, mediaCount: assets.length }) }),
  ];
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  return getCommissionById(commissionId);
}
