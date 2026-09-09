// @ts-nocheck
import { requiredString, type JsonObject } from "@/api/catalog/input";

export type RazorpayVerificationInput = {
  orderNumber: string;
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
};

export function parseRazorpayVerification(body: JsonObject): RazorpayVerificationInput | null {
  const orderNumber = requiredString(body.orderNumber, 80);
  const providerOrderId = requiredString(body.razorpay_order_id, 120);
  const providerPaymentId = requiredString(body.razorpay_payment_id, 120);
  const signature = requiredString(body.razorpay_signature, 256);
  if (
    !orderNumber || !providerOrderId?.startsWith("order_") ||
    !providerPaymentId?.startsWith("pay_") || !signature || !/^[a-f0-9]{64}$/i.test(signature)
  ) return null;
  return { orderNumber, providerOrderId, providerPaymentId, signature };
}
