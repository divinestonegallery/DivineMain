// @ts-nocheck
import type { NotificationTemplateKey } from "./config";

export type NotificationContext = {
  templateKey: NotificationTemplateKey;
  reference: string;
  status: string;
  amountPaise: number | null;
  currency: string;
  link: string;
};

function money(value: number | null, currency: string) {
  return value === null ? "To be confirmed" : new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value / 100);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);
}

const copy: Record<NotificationTemplateKey, { subject: string; heading: string; message: string }> = {
  order_placed: { subject: "Your Divine Stone Gallery order is placed", heading: "Your order is safely recorded.", message: "We have received your order and will keep you informed as it progresses." },
  payment_captured: { subject: "Your payment is confirmed", heading: "Payment received.", message: "Your online payment has been verified for your Divine Stone Gallery order." },
  commission_submitted: { subject: "Your custom moorti request is saved", heading: "Your commission journey has begun.", message: "The gallery has received your custom-moorti brief and will review it personally." },
  commission_quote_ready: { subject: "Your custom commission quotation is ready", heading: "Your quotation is ready to review.", message: "The gallery has prepared the individual price and advance arrangement for your commission." },
  commission_status_updated: { subject: "Your commission status has been updated", heading: "Your making journey has moved forward.", message: "There is a new status update for your Divine Stone Gallery commission." },
  commission_milestone_ready: { subject: "A production milestone is ready for approval", heading: "A new making milestone awaits you.", message: "Please review the gallery note and progress images, then approve the milestone or request changes." },
};

export function renderNotification(context: NotificationContext) {
  const template = copy[context.templateKey];
  const amount = money(context.amountPaise, context.currency);
  const status = context.status.replaceAll("_", " ");
  const text = `${template.heading}\n\n${template.message}\n\nReference: ${context.reference}\nStatus: ${status}\nAmount: ${amount}\nOpen securely: ${context.link}\n\nDivine Stone Gallery · Alwar, Rajasthan`;
  const html = `<div style="font-family:Georgia,serif;max-width:620px;margin:auto;padding:32px;color:#26231f;background:#fffdf9"><p style="font:700 11px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#9b6d2f">Divine Stone Gallery</p><h1 style="font-size:34px;font-weight:400;line-height:1.1">${escapeHtml(template.heading)}</h1><p style="font:16px/1.7 Arial,sans-serif;color:#625b52">${escapeHtml(template.message)}</p><div style="margin:24px 0;padding:18px;border:1px solid #e2d8c9;border-radius:14px;font:14px/1.8 Arial,sans-serif"><strong>Reference:</strong> ${escapeHtml(context.reference)}<br><strong>Status:</strong> ${escapeHtml(status)}<br><strong>Amount:</strong> ${escapeHtml(amount)}</div><a href="${escapeHtml(context.link)}" style="display:inline-block;padding:13px 20px;border-radius:999px;color:white;background:#26231f;text-decoration:none;font:700 13px Arial,sans-serif">Open your private update</a><p style="margin-top:30px;font:12px/1.6 Arial,sans-serif;color:#81786e">Divine Stone Gallery · Fourth-generation master moortikars · Alwar, Rajasthan</p></div>`;
  return { subject: template.subject, text, html, reference: context.reference, status, amount, link: context.link };
}

export function isNotificationTemplateKey(value: string): value is NotificationTemplateKey {
  return value in copy;
}
