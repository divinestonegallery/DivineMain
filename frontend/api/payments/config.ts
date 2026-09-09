// @ts-nocheck
export type RazorpayConfiguration = {
  apiBaseUrl: string;
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
};

export function getRazorpayConfiguration(): RazorpayConfiguration | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";
  if (!keyId || !keySecret) return null;
  return {
    apiBaseUrl: "https://api.razorpay.com/v1",
    keyId,
    keySecret,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null,
  };
}

export function getRazorpayWebhookSecret() {
  return process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null;
}

export function isRazorpayConfigured() {
  return getRazorpayConfiguration() !== null;
}
