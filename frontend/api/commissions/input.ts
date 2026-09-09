// @ts-nocheck
import { enumValue, optionalInteger, optionalString, requiredString, type JsonObject } from "@/api/catalog/input";

export function parseCommissionRequest(body: JsonObject) {
  const deityOrSubject = requiredString(body.deityOrSubject, 160);
  const requirements = requiredString(body.requirements, 5000);
  const preferredMaterial = requiredString(body.preferredMaterial, 120) ?? "Marble";
  const destinationPostalCode = requiredString(body.destinationPostalCode, 6);
  const title = optionalString(body.title, 180) ?? (deityOrSubject ? `Custom ${deityOrSubject}` : null);
  const targetHeightMm = optionalInteger(body.targetHeightMm, 1);
  const targetWidthMm = optionalInteger(body.targetWidthMm, 1);
  const targetDepthMm = optionalInteger(body.targetDepthMm, 1);
  if (!title || !deityOrSubject || !requirements || !destinationPostalCode || !/^[1-9]\d{5}$/.test(destinationPostalCode)) return null;
  if ([targetHeightMm, targetWidthMm, targetDepthMm].includes(undefined)) return null;
  return { title, deityOrSubject, requirements, preferredMaterial, destinationPostalCode, targetHeightMm: targetHeightMm ?? null, targetWidthMm: targetWidthMm ?? null, targetDepthMm: targetDepthMm ?? null };
}

export function parseCommissionPatch(body: JsonObject) {
  const status = enumValue(body.status, ["consultation", "quoted", "awaiting_advance", "in_production", "ready_to_ship", "completed", "cancelled"] as const);
  if (body.status !== undefined && !status) return null;
  const quotedPricePaise = optionalInteger(body.quotedPricePaise, 0);
  const gstPaise = optionalInteger(body.gstPaise, 0);
  const shippingPaise = optionalInteger(body.shippingPaise, 0);
  const advanceAmountPaise = optionalInteger(body.advanceAmountPaise, 0);
  const expectedCompletionAt = optionalInteger(body.expectedCompletionAt, 1);
  if ([quotedPricePaise, gstPaise, shippingPaise, advanceAmountPaise, expectedCompletionAt].includes(undefined)) return null;
  const financial = [quotedPricePaise, gstPaise, shippingPaise, advanceAmountPaise].some((value) => value !== null);
  if (!status && !financial && expectedCompletionAt === null) return null;
  if (financial && [quotedPricePaise, gstPaise, shippingPaise, advanceAmountPaise].some((value) => value === null)) return null;
  const total = financial ? quotedPricePaise! + gstPaise! + shippingPaise! : null;
  if (total !== null && advanceAmountPaise! > total) return null;
  return {
    status,
    quotedPricePaise,
    gstPaise,
    shippingPaise,
    advanceAmountPaise,
    balanceAmountPaise: total === null ? null : total - advanceAmountPaise!,
    expectedCompletionAt,
    financial,
  };
}

export function parseMilestone(body: JsonObject) {
  const title = requiredString(body.title, 180);
  const description = optionalString(body.description, 2000);
  return title ? { title, description } : null;
}

export function parseMilestoneDecision(body: JsonObject) {
  return { note: optionalString(body.note, 2000) };
}
