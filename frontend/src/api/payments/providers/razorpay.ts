// @ts-nocheck
import type { RazorpayConfiguration } from "../config";

export type RazorpayOrder = {
  id: string;
  amount: number;
  amount_due: number;
  amount_paid: number;
  currency: string;
  receipt: string | null;
  status: "created" | "attempted" | "paid";
};

export type RazorpayPayment = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  captured: boolean;
  method: string | null;
  error_code: string | null;
  error_description: string | null;
};

function basicAuthorization(configuration: RazorpayConfiguration) {
  return `Basic ${btoa(`${configuration.keyId}:${configuration.keySecret}`)}`;
}

function asInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

export function parseRazorpayOrder(value: unknown): RazorpayOrder | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const amount = asInteger(row.amount);
  const amountDue = asInteger(row.amount_due);
  const amountPaid = asInteger(row.amount_paid);
  if (
    typeof row.id !== "string" || !row.id.startsWith("order_") ||
    amount === null || amountDue === null || amountPaid === null ||
    typeof row.currency !== "string" ||
    !["created", "attempted", "paid"].includes(String(row.status))
  ) return null;
  return {
    id: row.id,
    amount,
    amount_due: amountDue,
    amount_paid: amountPaid,
    currency: row.currency,
    receipt: typeof row.receipt === "string" ? row.receipt : null,
    status: row.status as RazorpayOrder["status"],
  };
}

export function parseRazorpayPayment(value: unknown): RazorpayPayment | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const amount = asInteger(row.amount);
  if (
    typeof row.id !== "string" || !row.id.startsWith("pay_") ||
    amount === null || typeof row.currency !== "string" ||
    !["created", "authorized", "captured", "refunded", "failed"].includes(String(row.status))
  ) return null;
  return {
    id: row.id,
    order_id: typeof row.order_id === "string" ? row.order_id : null,
    amount,
    currency: row.currency,
    status: row.status as RazorpayPayment["status"],
    captured: row.captured === true,
    method: typeof row.method === "string" ? row.method : null,
    error_code: typeof row.error_code === "string" ? row.error_code : null,
    error_description: typeof row.error_description === "string" ? row.error_description : null,
  };
}

export async function createRazorpayOrder(
  configuration: RazorpayConfiguration,
  input: { amountPaise: number; receipt: string; localOrderId: string; userId: string },
) {
  const response = await fetch(`${configuration.apiBaseUrl}/orders`, {
    method: "POST",
    headers: {
      authorization: basicAuthorization(configuration),
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      partial_payment: false,
      notes: { local_order_id: input.localOrderId, local_user_id: input.userId },
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`RAZORPAY_ORDER_FAILED_${response.status}`);
  const order = parseRazorpayOrder(await response.json());
  if (!order || order.amount !== input.amountPaise || order.currency !== "INR") {
    throw new Error("RAZORPAY_ORDER_INVALID");
  }
  return order;
}

export async function fetchRazorpayPayment(
  configuration: RazorpayConfiguration,
  paymentId: string,
) {
  const response = await fetch(`${configuration.apiBaseUrl}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { authorization: basicAuthorization(configuration), accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`RAZORPAY_PAYMENT_FETCH_FAILED_${response.status}`);
  const payment = parseRazorpayPayment(await response.json());
  if (!payment) throw new Error("RAZORPAY_PAYMENT_INVALID");
  return payment;
}

export function validateRemotePayment(
  payment: RazorpayPayment,
  expected: { providerOrderId: string; amountPaise: number; currency: string },
) {
  return payment.order_id === expected.providerOrderId &&
    payment.amount === expected.amountPaise &&
    payment.currency === expected.currency;
}

function bytesToHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

function constantTimeHexEqual(left: string, right: string) {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  let difference = normalizedLeft.length ^ normalizedRight.length;
  const length = Math.max(normalizedLeft.length, normalizedRight.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (normalizedLeft.charCodeAt(index) || 0) ^ (normalizedRight.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function verifyRazorpayCheckoutSignature(
  providerOrderId: string,
  providerPaymentId: string,
  receivedSignature: string,
  keySecret: string,
) {
  const expected = await hmacSha256Hex(`${providerOrderId}|${providerPaymentId}`, keySecret);
  return constantTimeHexEqual(expected, receivedSignature);
}

export async function verifyRazorpayWebhookSignature(
  rawBody: string,
  receivedSignature: string,
  webhookSecret: string,
) {
  const expected = await hmacSha256Hex(rawBody, webhookSecret);
  return constantTimeHexEqual(expected, receivedSignature);
}

export async function sha256Hex(value: string) {
  return bytesToHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}
