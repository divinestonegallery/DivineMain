// @ts-nocheck
import type { getEmailConfiguration } from "../config";

type Configuration = NonNullable<ReturnType<typeof getEmailConfiguration>>;

export async function sendResendEmail(configuration: Configuration, input: { idempotencyKey: string; to: string; subject: string; text: string; html: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${configuration.apiKey}`, "content-type": "application/json", "idempotency-key": input.idempotencyKey.slice(0, 256) },
    body: JSON.stringify({ from: configuration.from, to: [input.to], subject: input.subject, text: input.text, html: input.html, ...(configuration.replyTo ? { reply_to: configuration.replyTo } : {}) }),
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => null) as { id?: unknown; message?: unknown } | null;
  if (!response.ok) throw new Error(`RESEND_${response.status}_${typeof payload?.message === "string" ? payload.message.slice(0, 120) : "FAILED"}`);
  if (typeof payload?.id !== "string" || !payload.id) throw new Error("RESEND_INVALID_RESPONSE");
  return { provider: "resend", providerMessageId: payload.id };
}
