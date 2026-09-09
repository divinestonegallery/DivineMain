// @ts-nocheck
import { enumValue, JsonObject, optionalString, requiredString } from "@/api/catalog/input";
import type { CheckoutAddress, PaymentMethod, PlaceOrderInput } from "./repository";

function phoneNumber(value: unknown) {
  const raw = requiredString(value, 24);
  if (!raw) return null;
  const compact = raw.replace(/[\s()-]/g, "");
  const normalized = /^[6-9]\d{9}$/.test(compact) ? `+91${compact}` : compact;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

function address(value: unknown): CheckoutAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as JsonObject;
  const recipientName = requiredString(body.recipientName, 120);
  const phoneE164 = phoneNumber(body.phoneE164);
  const line1 = requiredString(body.line1, 180);
  const line2 = optionalString(body.line2, 180);
  const landmark = optionalString(body.landmark, 180);
  const city = requiredString(body.city, 100);
  const state = requiredString(body.state, 100);
  const postalCode = requiredString(body.postalCode, 6);
  const countryCode = body.countryCode === undefined ? "IN" : body.countryCode;
  if (
    !recipientName ||
    !phoneE164 ||
    !line1 ||
    !city ||
    !state ||
    !postalCode ||
    !/^[1-9]\d{5}$/.test(postalCode) ||
    countryCode !== "IN"
  ) {
    return null;
  }
  return {
    recipientName,
    phoneE164,
    line1,
    line2,
    landmark,
    city,
    state,
    postalCode,
    countryCode: "IN",
  };
}

export function parsePaymentMethod(value: unknown): PaymentMethod | null {
  return enumValue(value, ["online", "bank_transfer", "cod"] as const);
}

export function parsePlaceOrder(body: JsonObject): PlaceOrderInput | null {
  const shippingQuoteId = requiredString(body.shippingQuoteId, 160);
  const paymentMethod = parsePaymentMethod(body.paymentMethod);
  const shippingAddress = address(body.shippingAddress);
  const billingAddress = body.billingSameAsShipping === true
    ? shippingAddress
    : address(body.billingAddress);
  const customerNote = optionalString(body.customerNote, 1000);
  if (!shippingQuoteId || !paymentMethod || !shippingAddress || !billingAddress) return null;
  return { shippingQuoteId, paymentMethod, shippingAddress, billingAddress, customerNote };
}

export function parseIndianPostalCode(value: unknown) {
  const postalCode = requiredString(value, 6);
  return postalCode && /^[1-9]\d{5}$/.test(postalCode) ? postalCode : null;
}

export function parseIdempotencyKey(value: string | null) {
  if (!value) return null;
  const key = value.trim();
  return key.length >= 8 && key.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(key)
    ? key
    : null;
}
