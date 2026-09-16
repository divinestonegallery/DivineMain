// @ts-nocheck
import type { NotificationTemplateKey, getWhatsAppConfiguration } from "../config";

type Configuration = NonNullable<ReturnType<typeof getWhatsAppConfiguration>>;

export function normalizeWhatsAppRecipient(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 && !digits.startsWith("0") ? digits : null;
}

export async function sendMetaWhatsApp(configuration: Configuration, input: { templateKey: NotificationTemplateKey; to: string; reference: string; status: string; amount: string; link: string }) {
  const templateName = configuration.templates[input.templateKey];
  if (!templateName) throw new Error(`WHATSAPP_TEMPLATE_MISSING_${input.templateKey}`);
  const recipient = normalizeWhatsAppRecipient(input.to);
  if (!recipient) throw new Error("WHATSAPP_INVALID_RECIPIENT");
  const response = await fetch(`https://graph.facebook.com/${configuration.graphApiVersion}/${encodeURIComponent(configuration.phoneNumberId)}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${configuration.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "template",
      template: {
        name: templateName,
        language: { code: configuration.languageCode },
        components: [{ type: "body", parameters: [input.reference, input.status, input.amount, input.link].map((text) => ({ type: "text", text })) }],
      },
    }),
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => null) as { messages?: Array<{ id?: unknown }>; error?: { message?: unknown } } | null;
  if (!response.ok) throw new Error(`WHATSAPP_${response.status}_${String(payload?.error?.message || "FAILED").slice(0, 120)}`);
  const providerMessageId = payload?.messages?.[0]?.id;
  if (typeof providerMessageId !== "string" || !providerMessageId) throw new Error("WHATSAPP_INVALID_RESPONSE");
  return { provider: "meta_whatsapp", providerMessageId };
}
