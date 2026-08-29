// @ts-nocheck
// drizzle removed
// schema removed
import { getRazorpayConfiguration } from "./config";
import {
  fetchRazorpayPayment,
  parseRazorpayPayment,
  validateRemotePayment,
  verifyRazorpayCheckoutSignature,
  type RazorpayPayment,
} from "./providers/razorpay";
import type { RazorpayVerificationInput } from "./input";

async function database() {
  const { getDb } = await import("@/db");
  return getDb();
}

async function paymentRecord(providerOrderId: string, userId?: string) {
  const db = await database();
  const conditions = [
    eq(payments.provider, "razorpay"),
    eq(payments.providerOrderId, providerOrderId),
  ];
  if (userId) conditions.push(eq(orders.userId, userId));
  const [record] = await db
    .select({
      paymentId: payments.id,
      providerOrderId: payments.providerOrderId,
      paymentStatus: payments.status,
      amountPaise: payments.amountPaise,
      currency: payments.currency,
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      orderStatus: orders.status,
      orderPaymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      subtotalPaise: orders.subtotalPaise,
      gstPaise: orders.gstPaise,
      shippingPaise: orders.shippingPaise,
      totalPaise: orders.totalPaise,
      orderCurrency: orders.currency,
      userId: users.id,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      phoneE164: users.phoneE164,
      phoneVerifiedAt: users.phoneVerifiedAt,
      whatsappTransactionalOptInAt: users.whatsappTransactionalOptInAt,
    })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .innerJoin(users, eq(orders.userId, users.id))
    .where(and(...conditions))
    .limit(1);
  return record ?? null;
}

async function applySuccessfulPayment(
  record: NonNullable<Awaited<ReturnType<typeof paymentRecord>>>,
  remote: RazorpayPayment,
) {
  if (remote.status !== "authorized" && remote.status !== "captured") {
    throw new Error("PAYMENT_NOT_SUCCESSFUL");
  }
  if (remote.status === "captured" && !remote.captured) {
    throw new Error("PAYMENT_CAPTURE_INCONSISTENT");
  }
  const db = await database();
  const captured = remote.status === "captured";
  const nextStatus = captured ? "captured" as const : "authorized" as const;
  const paymentUpdate = db
    .update(payments)
    .set({
      providerPaymentId: remote.id,
      status: nextStatus,
      failureCode: null,
      failureMessage: null,
      paidAt: captured ? sql`(extract(epoch from now())::integer)` : null,
      updatedAt: sql`(extract(epoch from now())::integer)`,
    })
    .where(
      and(
        eq(payments.id, record.paymentId),
        captured ? sql`${payments.status} not in ('refunded')` : sql`${payments.status} not in ('captured', 'refunded')`,
      ),
    );
  const statements: unknown[] = [paymentUpdate];
  if (captured) {
    statements.push(
      db.update(orders)
        .set({ paymentStatus: "paid", updatedAt: sql`(extract(epoch from now())::integer)` })
        .where(and(eq(orders.id, record.orderId), sql`${orders.paymentStatus} != 'refunded'`)),
    );
    const recipients = [
      record.email && record.emailVerifiedAt ? { channel: "email" as const, recipient: record.email } : null,
      record.phoneE164 && record.phoneVerifiedAt ? { channel: "sms" as const, recipient: record.phoneE164 } : null,
      record.phoneE164 && record.phoneVerifiedAt && record.whatsappTransactionalOptInAt ? { channel: "whatsapp" as const, recipient: record.phoneE164 } : null,
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    statements.push(...recipients.map((recipient) => db
      .insert(notifications)
      .values({
        id: `notification:payment:${remote.id}:${recipient.channel}`,
        userId: record.userId,
        orderId: record.orderId,
        channel: recipient.channel,
        templateKey: "payment_captured",
        recipient: recipient.recipient,
      })
      .onConflictDoNothing()));
  }
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  return {
    orderNumber: record.orderNumber,
    status: record.orderStatus,
    paymentStatus: captured ? "paid" : "pending",
    paymentMethod: record.paymentMethod,
    subtotalPaise: record.subtotalPaise,
    gstPaise: record.gstPaise,
    shippingPaise: record.shippingPaise,
    totalPaise: record.totalPaise,
    currency: record.orderCurrency,
  };
}

export async function verifyCustomerRazorpayPayment(
  userId: string,
  input: RazorpayVerificationInput,
) {
  const configuration = getRazorpayConfiguration();
  if (!configuration) return { notConfigured: true as const };
  const record = await paymentRecord(input.providerOrderId, userId);
  if (!record || record.orderNumber !== input.orderNumber || !record.providerOrderId) {
    return { notFound: true as const };
  }
  const signatureValid = await verifyRazorpayCheckoutSignature(
    record.providerOrderId,
    input.providerPaymentId,
    input.signature,
    configuration.keySecret,
  );
  if (!signatureValid) return { invalidSignature: true as const };
  const remote = await fetchRazorpayPayment(configuration, input.providerPaymentId);
  if (!validateRemotePayment(remote, {
    providerOrderId: record.providerOrderId,
    amountPaise: record.amountPaise,
    currency: record.currency,
  })) return { mismatch: true as const };
  return { order: await applySuccessfulPayment(record, remote) };
}

async function claimWebhook(
  eventId: string,
  eventType: string,
  payloadSha256: string,
) {
  const db = await database();
  const [inserted] = await db
    .insert(webhookEvents)
    .values({
      id: `razorpay:${eventId}`,
      provider: "razorpay",
      providerEventId: eventId,
      eventType,
      payloadSha256,
      status: "received",
      attempts: 1,
    })
    .onConflictDoNothing({ target: [webhookEvents.provider, webhookEvents.providerEventId] })
    .returning({ id: webhookEvents.id });
  if (inserted) return inserted.id;
  const [existing] = await db
    .select({ id: webhookEvents.id, status: webhookEvents.status, payloadSha256: webhookEvents.payloadSha256 })
    .from(webhookEvents)
    .where(and(eq(webhookEvents.provider, "razorpay"), eq(webhookEvents.providerEventId, eventId)))
    .limit(1);
  if (!existing || existing.payloadSha256 !== payloadSha256 || existing.status !== "failed") return null;
  const [reclaimed] = await db
    .update(webhookEvents)
    .set({ status: "received", attempts: sql`${webhookEvents.attempts} + 1`, lastError: null, updatedAt: sql`(extract(epoch from now())::integer)` })
    .where(and(eq(webhookEvents.id, existing.id), eq(webhookEvents.status, "failed")))
    .returning({ id: webhookEvents.id });
  return reclaimed?.id ?? null;
}

async function finishWebhook(id: string, status: "processed" | "ignored" | "failed", lastError?: string) {
  const db = await database();
  await db.update(webhookEvents).set({
    status,
    lastError: lastError ?? null,
    processedAt: status === "processed" || status === "ignored" ? sql`(extract(epoch from now())::integer)` : null,
    updatedAt: sql`(extract(epoch from now())::integer)`,
  }).where(eq(webhookEvents.id, id));
}

async function applyFailedPayment(
  record: NonNullable<Awaited<ReturnType<typeof paymentRecord>>>,
  remote: RazorpayPayment,
) {
  const db = await database();
  await db.batch([
    db.update(payments).set({
      providerPaymentId: remote.id,
      status: "failed",
      failureCode: remote.error_code,
      failureMessage: remote.error_description,
      updatedAt: sql`(extract(epoch from now())::integer)`,
    }).where(and(eq(payments.id, record.paymentId), sql`${payments.status} not in ('captured', 'refunded')`)),
    db.update(orders).set({ paymentStatus: "failed", updatedAt: sql`(extract(epoch from now())::integer)` })
      .where(and(eq(orders.id, record.orderId), sql`${orders.paymentStatus} not in ('paid', 'refunded')`)),
  ]);
}

export async function processRazorpayWebhook(
  payload: unknown,
  eventId: string,
  payloadSha256: string,
) {
  const event = payload && typeof payload === "object" ? payload as Record<string, unknown> : null;
  const eventType = event && typeof event.event === "string" ? event.event : "unknown";
  const claimId = await claimWebhook(eventId, eventType, payloadSha256);
  if (!claimId) return { duplicate: true as const };
  try {
    const payloadObject = event?.payload && typeof event.payload === "object"
      ? event.payload as Record<string, unknown>
      : null;
    const paymentWrapper = payloadObject?.payment && typeof payloadObject.payment === "object"
      ? payloadObject.payment as Record<string, unknown>
      : null;
    const remote = parseRazorpayPayment(paymentWrapper?.entity);
    if (!remote || !remote.order_id || !["payment.authorized", "payment.captured", "payment.failed", "order.paid"].includes(eventType)) {
      await finishWebhook(claimId, "ignored");
      return { ignored: true as const };
    }
    const record = await paymentRecord(remote.order_id);
    if (!record) {
      await finishWebhook(claimId, "ignored");
      return { ignored: true as const };
    }
    if (!validateRemotePayment(remote, {
      providerOrderId: remote.order_id,
      amountPaise: record.amountPaise,
      currency: record.currency,
    })) throw new Error("WEBHOOK_PAYMENT_MISMATCH");
    if (eventType === "payment.failed" || remote.status === "failed") {
      await applyFailedPayment(record, remote);
    } else {
      await applySuccessfulPayment(record, remote);
    }
    await finishWebhook(claimId, "processed");
    return { processed: true as const };
  } catch (error) {
    await finishWebhook(claimId, "failed", error instanceof Error ? error.message : "WEBHOOK_PROCESSING_FAILED");
    throw error;
  }
}
