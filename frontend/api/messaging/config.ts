// @ts-nocheck
const templateKeys = [
  "order_placed",
  "payment_captured",
  "commission_submitted",
  "commission_quote_ready",
  "commission_status_updated",
  "commission_milestone_ready",
] as const;

export type NotificationTemplateKey = typeof templateKeys[number];
export type TemplateMap = Partial<Record<NotificationTemplateKey, string>>;

function templateMap(value: string | undefined): TemplateMap {
  if (!value?.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(templateKeys.flatMap((key) => {
      const entry = (parsed as Record<string, unknown>)[key];
      return typeof entry === "string" && entry.trim() ? [[key, entry.trim()]] : [];
    }));
  } catch { return {}; }
}

function hasEveryTemplate(templates: TemplateMap) {
  return templateKeys.every((key) => Boolean(templates[key]));
}

export function getEmailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return null;
  return { apiKey, from, replyTo: process.env.RESEND_REPLY_TO?.trim() || null };
}

export function getSmsConfiguration() {
  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const templates = templateMap(process.env.MSG91_SMS_TEMPLATE_MAP_JSON);
  if (!authKey) return null;
  return { authKey, senderId: process.env.MSG91_SENDER_ID?.trim() || null, templates };
}

export function getWhatsAppConfiguration() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim();
  const templates = templateMap(process.env.WHATSAPP_TEMPLATE_MAP_JSON);
  if (!accessToken || !phoneNumberId || !/^v\d+\.\d+$/.test(graphApiVersion || "")) return null;
  return { accessToken, phoneNumberId, graphApiVersion: graphApiVersion!, languageCode: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "en", templates };
}

export function getNotificationWorkerSecret() {
  return process.env.NOTIFICATION_WORKER_SECRET?.trim() || process.env.CRON_SECRET?.trim() || null;
}

export function notificationCapabilities() {
  const email = getEmailConfiguration();
  const sms = getSmsConfiguration();
  const whatsapp = getWhatsAppConfiguration();
  return {
    email: Boolean(email),
    sms: Boolean(sms && hasEveryTemplate(sms.templates)),
    whatsapp: Boolean(whatsapp && hasEveryTemplate(whatsapp.templates)),
  };
}
