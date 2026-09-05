// @ts-nocheck
// drizzle removed
// schema removed
import { getEmailConfiguration, getSmsConfiguration, getWhatsAppConfiguration, notificationCapabilities } from "./config";
import { sendMetaWhatsApp } from "./providers/meta-whatsapp";
import { sendMsg91Sms } from "./providers/msg91";
import { sendResendEmail } from "./providers/resend";
import { isNotificationTemplateKey, renderNotification } from "./templates";

async function database() { const { getDb } = await import("@/db"); return getDb(); }

function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://divinestonegallery.com").replace(/\/$/, "");
}

async function contextFor(notificationId: string) {
  const db = await database();
  const [row] = await db.select({
    id: notifications.id, channel: notifications.channel, recipient: notifications.recipient,
    templateKey: notifications.templateKey, attempts: notifications.attempts,
    orderNumber: orders.orderNumber, orderStatus: orders.status, orderPaymentStatus: orders.paymentStatus,
    orderTotalPaise: orders.totalPaise, orderCurrency: orders.currency,
    commissionNumber: customCommissions.commissionNumber, commissionStatus: customCommissions.status,
    commissionPricePaise: customCommissions.quotedPricePaise, commissionGstPaise: customCommissions.gstPaise,
    commissionShippingPaise: customCommissions.shippingPaise,
  }).from(notifications)
    .leftJoin(orders, eq(notifications.orderId, orders.id))
    .leftJoin(customCommissions, eq(notifications.commissionId, customCommissions.id))
    .where(eq(notifications.id, notificationId)).limit(1);
  if (!row || !isNotificationTemplateKey(row.templateKey)) return null;
  const templateKey = row.templateKey;
  const isOrder = Boolean(row.orderNumber);
  const reference = row.orderNumber ?? row.commissionNumber;
  if (!reference) return null;
  const amountPaise = isOrder ? row.orderTotalPaise : row.commissionPricePaise === null ? null : row.commissionPricePaise + (row.commissionGstPaise ?? 0) + (row.commissionShippingPaise ?? 0);
  const status = isOrder ? (templateKey === "payment_captured" ? row.orderPaymentStatus : row.orderStatus) : row.commissionStatus;
  const link = isOrder ? `${siteOrigin()}/account/orders` : `${siteOrigin()}/account/commissions/${encodeURIComponent(reference)}`;
  return { ...row, templateKey, content: renderNotification({ templateKey, reference, status: status || "updated", amountPaise, currency: row.orderCurrency || "INR", link }) };
}

async function deliver(notificationId: string) {
  const row = await contextFor(notificationId);
  if (!row) throw new Error("NOTIFICATION_CONTEXT_INVALID");
  if (row.channel === "email") {
    const configuration = getEmailConfiguration();
    if (!configuration) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
    return sendResendEmail(configuration, { idempotencyKey: row.id, to: row.recipient, subject: row.content.subject, text: row.content.text, html: row.content.html });
  }
  const providerInput = { templateKey: row.templateKey, to: row.recipient, reference: row.content.reference, status: row.content.status, amount: row.content.amount, link: row.content.link };
  if (row.channel === "sms") {
    const configuration = getSmsConfiguration();
    if (!configuration) throw new Error("SMS_PROVIDER_NOT_CONFIGURED");
    return sendMsg91Sms(configuration, providerInput);
  }
  const configuration = getWhatsAppConfiguration();
  if (!configuration) throw new Error("WHATSAPP_PROVIDER_NOT_CONFIGURED");
  return sendMetaWhatsApp(configuration, providerInput);
}

export async function processNotificationQueue(limit = 20) {
  const db = await database();
  const now = Math.floor(Date.now() / 1000);
  const candidates = await db.select({ id: notifications.id }).from(notifications)
    .where(and(
      lt(notifications.attempts, 5),
      lte(notifications.scheduledAt, now),
      inArray(notifications.status, ["queued", "failed", "processing"]),
    )).orderBy(asc(notifications.scheduledAt), asc(notifications.createdAt)).limit(Math.min(Math.max(limit, 1), 50));
  const result = { examined: candidates.length, sent: 0, failed: 0, skipped: 0 };
  for (const candidate of candidates) {
    const [claimed] = await db.update(notifications).set({ status: "processing", attempts: sql`${notifications.attempts} + 1`, scheduledAt: now + 300, lastError: null, updatedAt: sql`(extract(epoch from now())::integer)` })
      .where(and(eq(notifications.id, candidate.id), lte(notifications.scheduledAt, now), inArray(notifications.status, ["queued", "failed", "processing"]), lt(notifications.attempts, 5)))
      .returning({ id: notifications.id, attempts: notifications.attempts });
    if (!claimed) { result.skipped += 1; continue; }
    try {
      const delivered = await deliver(claimed.id);
      await db.update(notifications).set({ status: "sent", provider: delivered.provider, providerMessageId: delivered.providerMessageId, sentAt: sql`(extract(epoch from now())::integer)`, lastError: null, updatedAt: sql`(extract(epoch from now())::integer)` }).where(and(eq(notifications.id, claimed.id), eq(notifications.status, "processing")));
      result.sent += 1;
    } catch (error) {
      const delay = Math.min(21_600, 60 * 2 ** Math.max(0, claimed.attempts - 1));
      await db.update(notifications).set({ status: "failed", lastError: (error instanceof Error ? error.message : "DELIVERY_FAILED").slice(0, 500), scheduledAt: now + delay, updatedAt: sql`(extract(epoch from now())::integer)` }).where(and(eq(notifications.id, claimed.id), eq(notifications.status, "processing")));
      result.failed += 1;
    }
  }
  return result;
}

export async function notificationQueueStatus() {
  const db = await database();
  const rows = await db.select({ status: notifications.status, channel: notifications.channel, count: sql<number>`count(*)` }).from(notifications).groupBy(notifications.status, notifications.channel);
  return { capabilities: notificationCapabilities(), queue: rows.map((row) => ({ ...row, count: Number(row.count) })) };
}
