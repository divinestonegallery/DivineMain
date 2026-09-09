// @ts-nocheck
// drizzle removed
import { synchronizeCurrentClerkUser } from "@/api/auth/current-user";
import {
  cartItems,
  carts,
  inventoryReservations,
  notifications,
  orderItems,
  orders,
  payments,
  products,
  productVariants,
  shippingQuotes,
  shipments,
  users,
} from "@/db/schema";
import { getRazorpayConfiguration } from "@/api/payments/config";
import { createRazorpayOrder } from "@/api/payments/providers/razorpay";

async function database() {
  const { getDb } = await import("@/db");
  return getDb();
}

export type PaymentMethod = "online" | "bank_transfer" | "cod";

export type CheckoutAddress = {
  recipientName: string;
  phoneE164: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  postalCode: string;
  countryCode: "IN";
};

export type CheckoutIssue = {
  code:
    | "CART_EMPTY"
    | "PRODUCT_UNAVAILABLE"
    | "QUOTE_ONLY"
    | "PRICE_MISSING"
    | "GST_MISSING"
    | "WEIGHT_MISSING"
    | "PACKAGING_MISSING"
    | "OUT_OF_STOCK";
  productId?: string;
  message: string;
};

type CheckoutItem = {
  productId: string;
  productSlug: string;
  productName: string;
  productType: "ready_made" | "made_to_order";
  salesMode: "direct" | "quote" | "both";
  productStatus: "draft" | "active" | "archived";
  variantId: string;
  variantName: string;
  sku: string;
  material: string;
  finish: string | null;
  heightMm: number;
  widthMm: number | null;
  depthMm: number | null;
  weightGrams: number | null;
  packageLengthMm: number | null;
  packageWidthMm: number | null;
  packageHeightMm: number | null;
  pricePaise: number | null;
  gstRateBps: number | null;
  stockQuantity: number;
  inventoryKind: "unique" | "repeatable";
  codEligible: boolean;
  isActive: boolean;
  quantity: number;
  updatedAt: number;
};

async function checkoutCustomer(clerkUserId: string, userId: string) {
  const db = await database();
  let [customer] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      phoneE164: users.phoneE164,
      phoneVerifiedAt: users.phoneVerifiedAt,
      whatsappTransactionalOptInAt: users.whatsappTransactionalOptInAt,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!customer) {
    await synchronizeCurrentClerkUser(clerkUserId);
    [customer] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        emailVerifiedAt: users.emailVerifiedAt,
        phoneE164: users.phoneE164,
        phoneVerifiedAt: users.phoneVerifiedAt,
        whatsappTransactionalOptInAt: users.whatsappTransactionalOptInAt,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
  }

  if (!customer || customer.status !== "active") {
    throw new Error("Customer account is unavailable.");
  }
  return { db, customer };
}

async function cartRows(userId: string): Promise<CheckoutItem[]> {
  const db = await database();
  return db
    .select({
      productId: products.id,
      productSlug: products.slug,
      productName: products.name,
      productType: products.productType,
      salesMode: products.salesMode,
      productStatus: products.status,
      variantId: productVariants.id,
      variantName: productVariants.name,
      sku: productVariants.sku,
      material: productVariants.material,
      finish: productVariants.finish,
      heightMm: productVariants.heightMm,
      widthMm: productVariants.widthMm,
      depthMm: productVariants.depthMm,
      weightGrams: productVariants.weightGrams,
      packageLengthMm: productVariants.packageLengthMm,
      packageWidthMm: productVariants.packageWidthMm,
      packageHeightMm: productVariants.packageHeightMm,
      pricePaise: productVariants.pricePaise,
      gstRateBps: productVariants.gstRateBps,
      stockQuantity: productVariants.stockQuantity,
      inventoryKind: productVariants.inventoryKind,
      codEligible: productVariants.codEligible,
      isActive: productVariants.isActive,
      quantity: cartItems.quantity,
      updatedAt: productVariants.updatedAt,
    })
    .from(cartItems)
    .innerJoin(carts, eq(cartItems.cartId, carts.id))
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .where(
      and(
        eq(carts.userId, userId),
        eq(carts.status, "active"),
        eq(cartItems.intent, "quote"),
      ),
    )
    .orderBy(asc(cartItems.createdAt));
}

function issuesFor(items: CheckoutItem[]): CheckoutIssue[] {
  if (!items.length) {
    return [{ code: "CART_EMPTY", message: "Add at least one work to your enquiry bag." }];
  }

  return items.flatMap((item) => {
    const issues: CheckoutIssue[] = [];
    const unavailable = item.productStatus !== "active" || !item.isActive || item.productType !== "ready_made";
    if (unavailable) issues.push({ code: "PRODUCT_UNAVAILABLE", productId: item.productId, message: `${item.productName} is not available for direct checkout.` });
    if (item.salesMode === "quote") issues.push({ code: "QUOTE_ONLY", productId: item.productId, message: `${item.productName} requires a personal quotation.` });
    if (item.pricePaise === null) issues.push({ code: "PRICE_MISSING", productId: item.productId, message: `${item.productName} still needs its selling price.` });
    if (item.gstRateBps === null) issues.push({ code: "GST_MISSING", productId: item.productId, message: `${item.productName} still needs its GST rate.` });
    if (item.weightGrams === null) issues.push({ code: "WEIGHT_MISSING", productId: item.productId, message: `${item.productName} still needs its packed weight.` });
    if (item.packageLengthMm === null || item.packageWidthMm === null || item.packageHeightMm === null) issues.push({ code: "PACKAGING_MISSING", productId: item.productId, message: `${item.productName} still needs packed length, width and height for shipping.` });
    if (item.stockQuantity < item.quantity) issues.push({ code: "OUT_OF_STOCK", productId: item.productId, message: `${item.productName} is not currently in stock.` });
    return issues;
  });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fingerprint(items: CheckoutItem[]) {
  return sha256(items.map((item) => [
    item.variantId,
    item.quantity,
    item.pricePaise,
    item.gstRateBps,
    item.weightGrams,
    item.widthMm,
    item.depthMm,
    item.packageLengthMm,
    item.packageWidthMm,
    item.packageHeightMm,
    item.updatedAt,
  ].join(":" )).join("|"));
}

function totals(items: CheckoutItem[]) {
  const subtotalPaise = items.reduce(
    (sum, item) => sum + (item.pricePaise ?? 0) * item.quantity,
    0,
  );
  const gstPaise = items.reduce(
    (sum, item) => sum + Math.round(((item.pricePaise ?? 0) * item.quantity * (item.gstRateBps ?? 0)) / 10000),
    0,
  );
  const chargeableWeightGrams = items.reduce(
    (sum, item) => sum + (item.weightGrams ?? 0) * item.quantity,
    0,
  );
  return { subtotalPaise, gstPaise, chargeableWeightGrams };
}

export async function readCheckoutPreview(clerkUserId: string, userId: string) {
  const { customer } = await checkoutCustomer(clerkUserId, userId);
  const items = await cartRows(userId);
  const summary = totals(items);
  const issues = issuesFor(items);
  return {
    items: items.map((item) => ({
      productId: item.productId,
      slug: item.productSlug,
      name: item.productName,
      variantId: item.variantId,
      variantName: item.variantName,
      sku: item.sku,
      quantity: item.quantity,
      unitPricePaise: item.pricePaise,
      gstRateBps: item.gstRateBps,
      heightMm: item.heightMm,
      widthMm: item.widthMm,
      depthMm: item.depthMm,
      weightGrams: item.weightGrams,
      packageLengthMm: item.packageLengthMm,
      packageWidthMm: item.packageWidthMm,
      packageHeightMm: item.packageHeightMm,
      codEligible: item.codEligible,
      stockQuantity: item.stockQuantity,
    })),
    ...summary,
    currency: "INR" as const,
    cartFingerprint: await fingerprint(items),
    issues,
    commerciallyReady: issues.length === 0,
    phoneVerified: Boolean(customer.phoneVerifiedAt),
    shippingQuoteRequired: true,
  };
}

function orderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `DSG-${date}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function orderResult(order: {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotalPaise: number;
  gstPaise: number;
  shippingPaise: number;
  totalPaise: number;
  currency: string;
}) {
  return order;
}

function razorpaySession(
  keyId: string,
  providerOrderId: string,
  order: ReturnType<typeof orderResult>,
  customer: { displayName: string; email: string | null; phoneE164: string | null },
) {
  return {
    provider: "razorpay" as const,
    keyId,
    providerOrderId,
    amountPaise: order.totalPaise,
    currency: order.currency,
    orderNumber: order.orderNumber,
    prefill: {
      name: customer.displayName,
      email: customer.email,
      contact: customer.phoneE164,
    },
  };
}

export type PlaceOrderInput = {
  shippingQuoteId: string;
  paymentMethod: PaymentMethod;
  shippingAddress: CheckoutAddress;
  billingAddress: CheckoutAddress;
  customerNote: string | null;
};

export async function checkoutRequestHash(input: PlaceOrderInput) {
  return sha256(JSON.stringify(input));
}

export async function placeOrder(
  clerkUserId: string,
  userId: string,
  idempotencyKey: string,
  requestHash: string,
  input: PlaceOrderInput,
) {
  const { db, customer } = await checkoutCustomer(clerkUserId, userId);
  const [existing] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      subtotalPaise: orders.subtotalPaise,
      gstPaise: orders.gstPaise,
      shippingPaise: orders.shippingPaise,
      totalPaise: orders.totalPaise,
      currency: orders.currency,
      checkoutRequestHash: orders.checkoutRequestHash,
    })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.idempotencyKey, idempotencyKey)))
    .limit(1);

  if (existing) {
    if (existing.checkoutRequestHash !== requestHash) {
      return { conflict: true as const };
    }
    const replayedOrder = orderResult(existing);
    if (existing.paymentMethod === "online") {
      const configuration = getRazorpayConfiguration();
      const [payment] = await db.select({ providerOrderId: payments.providerOrderId })
        .from(payments)
        .where(and(eq(payments.orderId, existing.id), eq(payments.provider, "razorpay")))
        .limit(1);
      if (configuration && payment?.providerOrderId) {
        return {
          replayed: true as const,
          order: replayedOrder,
          paymentSession: razorpaySession(configuration.keyId, payment.providerOrderId, replayedOrder, customer),
        };
      }
    }
    return { replayed: true as const, order: replayedOrder };
  }

  const items = await cartRows(userId);
  const checkoutIssues = issuesFor(items);
  if (checkoutIssues.length) return { issues: checkoutIssues };
  const summary = totals(items);
  const cartFingerprint = await fingerprint(items);
  const now = Math.floor(Date.now() / 1000);
  const [shippingQuote] = await db
    .select()
    .from(shippingQuotes)
    .where(
      and(
        eq(shippingQuotes.id, input.shippingQuoteId),
        eq(shippingQuotes.userId, userId),
        eq(shippingQuotes.status, "active"),
      ),
    )
    .limit(1);

  if (
    !shippingQuote ||
    shippingQuote.expiresAt <= now ||
    shippingQuote.cartFingerprint !== cartFingerprint ||
    shippingQuote.paymentMethod !== input.paymentMethod ||
    shippingQuote.destinationPostalCode !== input.shippingAddress.postalCode ||
    shippingQuote.subtotalPaise !== summary.subtotalPaise ||
    shippingQuote.gstPaise !== summary.gstPaise ||
    shippingQuote.chargeableWeightGrams !== summary.chargeableWeightGrams ||
    shippingQuote.totalPaise !== summary.subtotalPaise + summary.gstPaise + shippingQuote.shippingPaise
  ) {
    return { shippingQuoteInvalid: true as const };
  }

  if (input.paymentMethod === "cod") {
    if (!customer.phoneVerifiedAt) return { phoneVerificationRequired: true as const };
    if (items.some((item) => !item.codEligible)) return { codUnavailable: true as const };
  }

  const orderId = `order:${crypto.randomUUID()}`;
  const number = orderNumber();
  const status = input.paymentMethod === "cod" ? "approval_pending" as const : "placed" as const;
  const codApprovalStatus = input.paymentMethod === "cod" ? "pending" as const : "not_required" as const;
  const shippingAddressJson = JSON.stringify(input.shippingAddress);
  const billingAddressJson = JSON.stringify(input.billingAddress);
  const paymentId = `payment:${crypto.randomUUID()}`;
  const razorpayConfiguration = input.paymentMethod === "online" ? getRazorpayConfiguration() : null;
  if (input.paymentMethod === "online" && !razorpayConfiguration) {
    return { onlineProviderRequired: true as const };
  }
  const providerOrder = razorpayConfiguration
    ? await createRazorpayOrder(razorpayConfiguration, {
      amountPaise: shippingQuote.totalPaise,
      receipt: number,
      localOrderId: orderId,
      userId,
    })
    : null;
  const orderInsert = db.insert(orders).values({
    id: orderId,
    orderNumber: number,
    userId,
    shippingQuoteId: shippingQuote.id,
    idempotencyKey,
    checkoutRequestHash: requestHash,
    status,
    paymentStatus: "pending",
    paymentMethod: input.paymentMethod,
    codApprovalStatus,
    phoneVerifiedAt: input.paymentMethod === "cod" ? customer.phoneVerifiedAt : null,
    shippingAddressJson,
    billingAddressJson,
    subtotalPaise: summary.subtotalPaise,
    gstPaise: summary.gstPaise,
    shippingPaise: shippingQuote.shippingPaise,
    totalPaise: shippingQuote.totalPaise,
    customerNote: input.customerNote,
  });
  const orderItemInserts = items.map((item) => db.insert(orderItems).values({
    id: `order-item:${crypto.randomUUID()}`,
    orderId,
    productId: item.productId,
    variantId: item.variantId,
    itemName: item.productName,
    variantName: item.variantName,
    sku: item.sku,
    quantity: item.quantity,
    unitPricePaise: item.pricePaise!,
    gstRateBps: item.gstRateBps!,
    gstPaise: Math.round((item.pricePaise! * item.quantity * item.gstRateBps!) / 10000),
    lineTotalPaise: item.pricePaise! * item.quantity,
    productSnapshotJson: JSON.stringify({
      productName: item.productName,
      productSlug: item.productSlug,
      variantName: item.variantName,
      sku: item.sku,
      material: item.material,
      finish: item.finish,
      dimensionsMm: { height: item.heightMm, width: item.widthMm, depth: item.depthMm },
      packageDimensionsMm: { length: item.packageLengthMm, width: item.packageWidthMm, height: item.packageHeightMm },
      weightGrams: item.weightGrams,
    }),
  }));
  const reservationInserts = items
    .filter((item) => item.inventoryKind === "unique")
    .map((item) => db.insert(inventoryReservations).values({
      id: `reservation:${crypto.randomUUID()}`,
      variantId: item.variantId,
      userId,
      orderId,
      status: "converted",
      expiresAt: now,
    }));
  const stockUpdates = items.map((item) => db
    .update(productVariants)
    .set({
      stockQuantity: sql`${productVariants.stockQuantity} - ${item.quantity}`,
      updatedAt: sql`(extract(epoch from now())::integer)`,
    })
    .where(eq(productVariants.id, item.variantId)));
  const recipients = [
    customer.email && customer.emailVerifiedAt ? { channel: "email" as const, recipient: customer.email } : null,
    customer.phoneE164 && customer.phoneVerifiedAt ? { channel: "sms" as const, recipient: customer.phoneE164 } : null,
    customer.phoneE164 && customer.phoneVerifiedAt && customer.whatsappTransactionalOptInAt ? { channel: "whatsapp" as const, recipient: customer.phoneE164 } : null,
  ].filter((recipient): recipient is NonNullable<typeof recipient> => Boolean(recipient));
  const notificationInserts = recipients.map((recipient) => db.insert(notifications).values({
    id: `notification:${crypto.randomUUID()}`,
    userId,
    orderId,
    channel: recipient.channel,
    templateKey: "order_placed",
    recipient: recipient.recipient,
  }));
  const statements = [
    orderInsert,
    ...orderItemInserts,
    ...reservationInserts,
    ...stockUpdates,
    db.update(shippingQuotes).set({ status: "consumed", updatedAt: sql`(extract(epoch from now())::integer)` }).where(eq(shippingQuotes.id, shippingQuote.id)),
    db.insert(payments).values({
      id: paymentId,
      orderId,
      provider: providerOrder ? "razorpay" : "manual",
      providerOrderId: providerOrder?.id,
      method: input.paymentMethod,
      status: providerOrder ? "created" : "pending",
      amountPaise: shippingQuote.totalPaise,
    }),
    db.insert(shipments).values({
      id: `shipment:${crypto.randomUUID()}`,
      orderId,
      provider: shippingQuote.provider,
      status: "rate_selected",
      serviceName: shippingQuote.serviceName,
      shippingPaise: shippingQuote.shippingPaise,
      chargeableWeightGrams: shippingQuote.chargeableWeightGrams,
      originPostalCode: shippingQuote.originPostalCode,
      destinationPostalCode: shippingQuote.destinationPostalCode,
      estimatedDeliveryAt: shippingQuote.estimatedDeliveryDays === null
        ? null
        : now + shippingQuote.estimatedDeliveryDays * 24 * 60 * 60,
    }),
    ...notificationInserts,
    db.delete(cartItems).where(and(eq(cartItems.cartId, `cart:${clerkUserId}`), eq(cartItems.intent, "quote"))),
  ];

  try {
    await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  } catch (error) {
    const [replayed] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        subtotalPaise: orders.subtotalPaise,
        gstPaise: orders.gstPaise,
        shippingPaise: orders.shippingPaise,
        totalPaise: orders.totalPaise,
        currency: orders.currency,
        checkoutRequestHash: orders.checkoutRequestHash,
      })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.idempotencyKey, idempotencyKey)))
      .limit(1);
    if (replayed?.checkoutRequestHash === requestHash) {
      const replayedOrder = orderResult(replayed);
      if (replayed.paymentMethod === "online") {
        const configuration = getRazorpayConfiguration();
        const [payment] = await db.select({ providerOrderId: payments.providerOrderId })
          .from(payments)
          .where(and(eq(payments.orderId, replayed.id), eq(payments.provider, "razorpay")))
          .limit(1);
        if (configuration && payment?.providerOrderId) {
          return {
            replayed: true as const,
            order: replayedOrder,
            paymentSession: razorpaySession(configuration.keyId, payment.providerOrderId, replayedOrder, customer),
          };
        }
      }
      return { replayed: true as const, order: replayedOrder };
    }
    throw error;
  }

  const placedOrder = orderResult({
    orderNumber: number,
    status,
    paymentStatus: "pending",
    paymentMethod: input.paymentMethod,
    subtotalPaise: summary.subtotalPaise,
    gstPaise: summary.gstPaise,
    shippingPaise: shippingQuote.shippingPaise,
    totalPaise: shippingQuote.totalPaise,
    currency: "INR",
  });
  return {
    replayed: false as const,
    order: placedOrder,
    ...(providerOrder && razorpayConfiguration
      ? { paymentSession: razorpaySession(razorpayConfiguration.keyId, providerOrder.id, placedOrder, customer) }
      : {}),
  };
}

export async function listCustomerOrders(userId: string) {
  const db = await database();
  return db
    .select({
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      totalPaise: orders.totalPaise,
      currency: orders.currency,
      placedAt: orders.placedAt,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.placedAt));
}

export async function getCustomerOrder(userId: string, orderNumberValue: string) {
  const db = await database();
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.orderNumber, orderNumberValue)))
    .limit(1);
  if (!order) return null;
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.createdAt));
  return { ...order, items };
}
