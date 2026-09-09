// @ts-nocheck
// drizzle removed
import {
  addresses,
  auditLogs,
  customCommissions,
  orderItems,
  orders,
  notifications,
  payments,
  returnCases,
  returnItems,
  shipments,
  staffMembers,
  users,
} from "@/db/schema";

async function database() {
  const { getDb } = await import("@/db");
  return getDb();
}

function addressSummary(value: string) {
  try {
    const row = JSON.parse(value) as Record<string, unknown>;
    return {
      recipientName: typeof row.recipientName === "string" ? row.recipientName : "",
      phoneE164: typeof row.phoneE164 === "string" ? row.phoneE164 : "",
      city: typeof row.city === "string" ? row.city : "",
      state: typeof row.state === "string" ? row.state : "",
      postalCode: typeof row.postalCode === "string" ? row.postalCode : "",
      line1: typeof row.line1 === "string" ? row.line1 : "",
    };
  } catch {
    return { recipientName: "", phoneE164: "", city: "", state: "", postalCode: "", line1: "" };
  }
}

export async function listAdminOrders() {
  const db = await database();
  const [orderRows, itemRows, paymentRows, shipmentRows, returnRows] = await Promise.all([
    db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      customerName: users.displayName,
      customerEmail: users.email,
      customerPhone: users.phoneE164,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      codApprovalStatus: orders.codApprovalStatus,
      subtotalPaise: orders.subtotalPaise,
      gstPaise: orders.gstPaise,
      shippingPaise: orders.shippingPaise,
      discountPaise: orders.discountPaise,
      totalPaise: orders.totalPaise,
      currency: orders.currency,
      customerNote: orders.customerNote,
      shippingAddressJson: orders.shippingAddressJson,
      placedAt: orders.placedAt,
      updatedAt: orders.updatedAt,
    }).from(orders).innerJoin(users, eq(orders.userId, users.id)).orderBy(desc(orders.placedAt)),
    db.select().from(orderItems).orderBy(asc(orderItems.createdAt)),
    db.select({ id: payments.id, orderId: payments.orderId, method: payments.method, status: payments.status, amountPaise: payments.amountPaise, provider: payments.provider, bankReference: payments.bankReference }).from(payments),
    db.select({ id: shipments.id, orderId: shipments.orderId, status: shipments.status, provider: shipments.provider, serviceName: shipments.serviceName, trackingNumber: shipments.trackingNumber }).from(shipments),
    db.select({ id: returnCases.id, orderId: returnCases.orderId, returnNumber: returnCases.returnNumber, status: returnCases.status }).from(returnCases),
  ]);
  return orderRows.map((order) => ({
    ...order,
    shippingAddress: addressSummary(order.shippingAddressJson),
    items: itemRows.filter((item) => item.orderId === order.id),
    payments: paymentRows.filter((payment) => payment.orderId === order.id),
    shipments: shipmentRows.filter((shipment) => shipment.orderId === order.id),
    returns: returnRows.filter((item) => item.orderId === order.id),
  }));
}

export type OrderPatch = Partial<{
  status: "approval_pending" | "placed" | "confirmed" | "in_production" | "ready_to_ship" | "shipped" | "delivered" | "cancelled" | "returned";
  paymentStatus: "pending" | "partially_paid" | "paid" | "failed" | "refunded" | "partially_refunded";
  codApprovalStatus: "not_required" | "pending" | "approved" | "rejected";
}>;

export async function updateAdminOrder(id: string, patch: OrderPatch, actorUserId: string) {
  const db = await database();
  const [current] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, id)).limit(1);
  if (!current) throw new Error("ORDER_NOT_FOUND");
  const effectiveStatus = patch.codApprovalStatus === "approved" && current.status === "approval_pending"
    ? "confirmed" as const
    : patch.codApprovalStatus === "rejected"
      ? "cancelled" as const
      : patch.status;
  const update = {
    ...patch,
    ...(effectiveStatus ? { status: effectiveStatus } : {}),
    ...(effectiveStatus === "cancelled" ? { cancelledAt: sql`(extract(epoch from now())::integer)` } : {}),
    updatedAt: sql`(extract(epoch from now())::integer)`,
  };
  await db.batch([
    db.update(orders).set(update).where(eq(orders.id, id)),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "order.updated", entityType: "order", entityId: id, changesJson: JSON.stringify(patch) }),
  ]);
  return listAdminOrders();
}

export async function listAdminCustomers() {
  const db = await database();
  const [customerRows, orderRows, commissionRows, addressRows, staffRows] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)),
    db.select({ userId: orders.userId, totalPaise: orders.totalPaise, paymentStatus: orders.paymentStatus, placedAt: orders.placedAt }).from(orders),
    db.select({ userId: customCommissions.userId, status: customCommissions.status }).from(customCommissions),
    db.select({ userId: addresses.userId }).from(addresses),
    db.select({ userId: staffMembers.userId }).from(staffMembers),
  ]);
  const staffUserIds = new Set(staffRows.map((staff) => staff.userId));
  return customerRows.filter((customer) => !staffUserIds.has(customer.id)).map((customer) => {
    const customerOrders = orderRows.filter((order) => order.userId === customer.id);
    return {
      ...customer,
      orderCount: customerOrders.length,
      paidRevenuePaise: customerOrders.filter((order) => order.paymentStatus === "paid").reduce((total, order) => total + order.totalPaise, 0),
      lastOrderAt: customerOrders.reduce<number | null>((latest, order) => latest === null || order.placedAt > latest ? order.placedAt : latest, null),
      commissionCount: commissionRows.filter((commission) => commission.userId === customer.id).length,
      addressCount: addressRows.filter((address) => address.userId === customer.id).length,
    };
  });
}

export type CustomerPatch = Partial<{
  status: "active" | "blocked" | "deleted";
  preferredLocale: string;
}>;

export async function updateAdminCustomer(id: string, patch: CustomerPatch, actorUserId: string) {
  const db = await database();
  const [staff] = await db.select({ userId: staffMembers.userId }).from(staffMembers).where(eq(staffMembers.userId, id)).limit(1);
  if (staff) throw new Error("STAFF_ACCOUNT_PROTECTED");
  await db.batch([
    db.update(users).set({ ...patch, updatedAt: sql`(extract(epoch from now())::integer)` }).where(eq(users.id, id)),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "customer.updated", entityType: "user", entityId: id, changesJson: JSON.stringify(patch) }),
  ]);
  return listAdminCustomers();
}

export async function listAdminPayments() {
  const db = await database();
  return db.select({
    id: payments.id,
    orderId: payments.orderId,
    orderNumber: orders.orderNumber,
    commissionId: payments.commissionId,
    commissionNumber: customCommissions.commissionNumber,
    customerName: users.displayName,
    customerEmail: users.email,
    provider: payments.provider,
    providerOrderId: payments.providerOrderId,
    providerPaymentId: payments.providerPaymentId,
    method: payments.method,
    status: payments.status,
    amountPaise: payments.amountPaise,
    currency: payments.currency,
    bankReference: payments.bankReference,
    failureCode: payments.failureCode,
    failureMessage: payments.failureMessage,
    paidAt: payments.paidAt,
    createdAt: payments.createdAt,
    updatedAt: payments.updatedAt,
  }).from(payments)
    .leftJoin(orders, eq(payments.orderId, orders.id))
    .leftJoin(customCommissions, eq(payments.commissionId, customCommissions.id))
    .leftJoin(users, sql`${users.id} = coalesce(${orders.userId}, ${customCommissions.userId})`)
    .orderBy(desc(payments.createdAt));
}

export type PaymentPatch = Partial<{
  status: "created" | "pending" | "authorized" | "captured" | "failed" | "refunded" | "cancelled";
  bankReference: string | null;
  providerPaymentId: string | null;
}>;

export async function updateAdminPayment(id: string, patch: PaymentPatch, actorUserId: string) {
  const db = await database();
  const [current] = await db.select({
    status: payments.status,
    orderId: payments.orderId,
    userId: orders.userId,
    email: users.email,
    phoneE164: users.phoneE164,
    emailVerifiedAt: users.emailVerifiedAt,
    phoneVerifiedAt: users.phoneVerifiedAt,
    whatsappTransactionalOptInAt: users.whatsappTransactionalOptInAt,
  }).from(payments)
    .leftJoin(orders, eq(payments.orderId, orders.id))
    .leftJoin(users, eq(orders.userId, users.id))
    .where(eq(payments.id, id)).limit(1);
  if (!current) throw new Error("PAYMENT_NOT_FOUND");
  const orderPaymentStatus = patch.status === "captured" ? "paid" as const : patch.status === "refunded" ? "refunded" as const : patch.status === "failed" ? "failed" as const : null;
  const shouldNotifyCaptured = patch.status === "captured" && current.status !== "captured" && current.orderId && current.userId;
  const recipients = shouldNotifyCaptured ? [
    current.email && current.emailVerifiedAt ? { channel: "email" as const, recipient: current.email } : null,
    current.phoneE164 && current.phoneVerifiedAt ? { channel: "sms" as const, recipient: current.phoneE164 } : null,
    current.phoneE164 && current.phoneVerifiedAt && current.whatsappTransactionalOptInAt ? { channel: "whatsapp" as const, recipient: current.phoneE164 } : null,
  ].filter((recipient): recipient is NonNullable<typeof recipient> => Boolean(recipient)) : [];
  const statements = [
    db.update(payments).set({ ...patch, ...(patch.status === "captured" ? { paidAt: sql`(extract(epoch from now())::integer)` } : {}), updatedAt: sql`(extract(epoch from now())::integer)` }).where(eq(payments.id, id)),
    ...(current?.orderId && orderPaymentStatus ? [db.update(orders).set({ paymentStatus: orderPaymentStatus, updatedAt: sql`(extract(epoch from now())::integer)` }).where(eq(orders.id, current.orderId))] : []),
    ...recipients.map((recipient) => db.insert(notifications).values({
      id: `notification:${crypto.randomUUID()}`,
      userId: current.userId!,
      orderId: current.orderId!,
      channel: recipient.channel,
      templateKey: "payment_captured",
      recipient: recipient.recipient,
    })),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "payment.updated", entityType: "payment", entityId: id, changesJson: JSON.stringify(patch) }),
  ];
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  return listAdminPayments();
}

export async function listAdminShipments() {
  const db = await database();
  return db.select({
    id: shipments.id,
    orderId: shipments.orderId,
    orderNumber: orders.orderNumber,
    customerName: users.displayName,
    customerPhone: users.phoneE164,
    provider: shipments.provider,
    providerShipmentId: shipments.providerShipmentId,
    trackingNumber: shipments.trackingNumber,
    status: shipments.status,
    serviceName: shipments.serviceName,
    shippingPaise: shipments.shippingPaise,
    chargeableWeightGrams: shipments.chargeableWeightGrams,
    originPostalCode: shipments.originPostalCode,
    destinationPostalCode: shipments.destinationPostalCode,
    estimatedDeliveryAt: shipments.estimatedDeliveryAt,
    shippedAt: shipments.shippedAt,
    deliveredAt: shipments.deliveredAt,
    createdAt: shipments.createdAt,
    updatedAt: shipments.updatedAt,
  }).from(shipments).innerJoin(orders, eq(shipments.orderId, orders.id)).innerJoin(users, eq(orders.userId, users.id)).orderBy(desc(shipments.createdAt));
}

export type ShipmentPatch = Partial<{
  provider: string | null;
  providerShipmentId: string | null;
  trackingNumber: string | null;
  status: "rate_selected" | "booked" | "picked_up" | "in_transit" | "delivered" | "exception" | "cancelled";
  serviceName: string | null;
  estimatedDeliveryAt: number | null;
}>;

export async function updateAdminShipment(id: string, patch: ShipmentPatch, actorUserId: string) {
  const db = await database();
  const [current] = await db.select({ orderId: shipments.orderId }).from(shipments).where(eq(shipments.id, id)).limit(1);
  const now = sql`(extract(epoch from now())::integer)`;
  const orderStatus = patch.status === "delivered" ? "delivered" as const : patch.status === "picked_up" || patch.status === "in_transit" ? "shipped" as const : null;
  const statements = [
    db.update(shipments).set({
      ...patch,
      ...(patch.status === "picked_up" || patch.status === "in_transit" ? { shippedAt: now } : {}),
      ...(patch.status === "delivered" ? { deliveredAt: now, shippedAt: now } : {}),
      updatedAt: now,
    }).where(eq(shipments.id, id)),
    ...(current?.orderId && orderStatus ? [db.update(orders).set({ status: orderStatus, updatedAt: now }).where(eq(orders.id, current.orderId))] : []),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "shipment.updated", entityType: "shipment", entityId: id, changesJson: JSON.stringify(patch) }),
  ];
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  return listAdminShipments();
}

export async function listAdminReturns() {
  const db = await database();
  const [caseRows, itemRows] = await Promise.all([
    db.select({
      id: returnCases.id,
      returnNumber: returnCases.returnNumber,
      orderId: returnCases.orderId,
      orderNumber: orders.orderNumber,
      userId: returnCases.userId,
      customerName: users.displayName,
      customerEmail: users.email,
      customerPhone: users.phoneE164,
      status: returnCases.status,
      reason: returnCases.reason,
      customerNote: returnCases.customerNote,
      staffDecisionNote: returnCases.staffDecisionNote,
      decidedAt: returnCases.decidedAt,
      createdAt: returnCases.createdAt,
      updatedAt: returnCases.updatedAt,
    }).from(returnCases).innerJoin(orders, eq(returnCases.orderId, orders.id)).innerJoin(users, eq(returnCases.userId, users.id)).orderBy(desc(returnCases.createdAt)),
    db.select({ returnCaseId: returnItems.returnCaseId, orderItemId: returnItems.orderItemId, quantity: returnItems.quantity, conditionNote: returnItems.conditionNote, itemName: orderItems.itemName, variantName: orderItems.variantName, sku: orderItems.sku }).from(returnItems).innerJoin(orderItems, eq(returnItems.orderItemId, orderItems.id)),
  ]);
  return caseRows.map((item) => ({ ...item, items: itemRows.filter((row) => row.returnCaseId === item.id) }));
}

export type ReturnPatch = Partial<{
  status: "requested" | "under_review" | "approved" | "rejected" | "in_transit" | "received" | "refunded" | "closed";
  staffDecisionNote: string | null;
}>;

export async function updateAdminReturn(id: string, patch: ReturnPatch, actorUserId: string) {
  const db = await database();
  const [current] = await db.select({ orderId: returnCases.orderId }).from(returnCases).where(eq(returnCases.id, id)).limit(1);
  const decision = patch.status === "approved" || patch.status === "rejected";
  const statements = [
    db.update(returnCases).set({ ...patch, ...(decision ? { decidedByUserId: actorUserId, decidedAt: sql`(extract(epoch from now())::integer)` } : {}), updatedAt: sql`(extract(epoch from now())::integer)` }).where(eq(returnCases.id, id)),
    ...(current?.orderId && patch.status === "refunded" ? [db.update(orders).set({ status: "returned", paymentStatus: "refunded", updatedAt: sql`(extract(epoch from now())::integer)` }).where(eq(orders.id, current.orderId))] : []),
    ...(current?.orderId && patch.status === "refunded" ? [db.update(payments).set({ status: "refunded", updatedAt: sql`(extract(epoch from now())::integer)` }).where(eq(payments.orderId, current.orderId))] : []),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "return.updated", entityType: "return_case", entityId: id, changesJson: JSON.stringify(patch) }),
  ];
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  return listAdminReturns();
}

export async function createAdminReturn(orderId: string, reason: string, customerNote: string | null, actorUserId: string) {
  const db = await database();
  const [order] = await db.select({ userId: orders.userId, orderNumber: orders.orderNumber }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("ORDER_NOT_FOUND");
  const items = await db.select({ id: orderItems.id, quantity: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, orderId));
  if (!items.length) throw new Error("ORDER_ITEMS_MISSING");
  const id = `return:${crypto.randomUUID()}`;
  const returnNumber = `DSG-RET-${Date.now().toString().slice(-8)}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  const statements = [
    db.insert(returnCases).values({ id, returnNumber, orderId, userId: order.userId, reason, customerNote, status: "requested" }),
    ...items.map((item) => db.insert(returnItems).values({ returnCaseId: id, orderItemId: item.id, quantity: item.quantity })),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "return.created", entityType: "return_case", entityId: id, changesJson: JSON.stringify({ orderId, reason, customerNote }) }),
  ];
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  return listAdminReturns();
}
