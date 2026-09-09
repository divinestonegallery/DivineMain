// @ts-nocheck
import type { NotificationTemplateKey, getSmsConfiguration } from "../config";

type Configuration = NonNullable<ReturnType<typeof getSmsConfiguration>>;

export function normalizeIndianMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}

export async function sendMsg91Sms(configuration: Configuration, input: { templateKey: NotificationTemplateKey; to: string; reference: string; status: string; amount: string; link: string }) {
  const templateId = configuration.templates[input.templateKey];
  if (!templateId) throw new Error(`MSG91_TEMPLATE_MISSING_${input.templateKey}`);
  const mobile = normalizeIndianMobile(input.to);
  if (!mobile) throw new Error("MSG91_INVALID_INDIAN_MOBILE");
  const response = await fetch("https://control.msg91.com/api/v5/flow", {
    method: "POST",
    headers: { accept: "application/json", authkey: configuration.authKey, "content-type": "application/json" },
    body: JSON.stringify({
      template_id: templateId,
      short_url: "0",
      realTimeResponse: "1",
      ...(configuration.senderId ? { sender: configuration.senderId } : {}),
      recipients: [{ mobiles: mobile, REFERENCE: input.reference, STATUS: input.status, AMOUNT: input.amount, LINK: input.link }],
    }),
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || payload?.type === "error") throw new Error(`MSG91_${response.status}_${String(payload?.message || "FAILED").slice(0, 120)}`);
  const message = payload?.message;
  const providerMessageId = typeof payload?.request_id === "string" ? payload.request_id : typeof message === "string" ? message : Array.isArray(message) && typeof message[0] === "string" ? message[0] : null;
  if (!providerMessageId) throw new Error("MSG91_INVALID_RESPONSE");
  return { provider: "msg91", providerMessageId };
}
