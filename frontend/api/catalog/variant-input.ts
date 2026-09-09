// @ts-nocheck
import { NewVariant, VariantPatch } from "./admin-repository";
import { enumValue, JsonObject, optionalInteger, optionalString, requiredString } from "./input";

type ParseResult<T> = { value: T } | { error: string };

export function parseNewVariant(body: JsonObject): ParseResult<NewVariant> {
  const sku = requiredString(body.sku, 100);
  const name = requiredString(body.name, 160);
  const material = requiredString(body.material, 160);
  const finish = optionalString(body.finish, 160);
  const heightMm = optionalInteger(body.heightMm, 1);
  const widthMm = optionalInteger(body.widthMm, 1);
  const depthMm = optionalInteger(body.depthMm, 1);
  const weightMinGrams = optionalInteger(body.weightMinGrams, 1);
  const weightGrams = optionalInteger(body.weightGrams, 1);
  const packageLengthMm = optionalInteger(body.packageLengthMm, 1);
  const packageWidthMm = optionalInteger(body.packageWidthMm, 1);
  const packageHeightMm = optionalInteger(body.packageHeightMm, 1);
  const pricePaise = optionalInteger(body.pricePaise, 0);
  const gstRateBps = optionalInteger(body.gstRateBps, 0);
  const parsedStockQuantity = optionalInteger(body.stockQuantity, 0);
  const parsedLowStockThreshold = optionalInteger(body.lowStockThreshold, 0);
  const stockQuantity = parsedStockQuantity ?? 0;
  const lowStockThreshold = parsedLowStockThreshold ?? 1;
  const inventoryKind = enumValue(body.inventoryKind, ["unique", "repeatable"] as const) ?? "repeatable";
  const codEligible = typeof body.codEligible === "boolean" ? body.codEligible : true;

  if (!sku || !name || !material || !heightMm) return { error: "SKU, variant name, material and height are required." };
  if (widthMm === undefined || depthMm === undefined || weightMinGrams === undefined || weightGrams === undefined || packageLengthMm === undefined || packageWidthMm === undefined || packageHeightMm === undefined || pricePaise === undefined || gstRateBps === undefined || parsedStockQuantity === undefined || parsedLowStockThreshold === undefined) return { error: "A numeric variant value is invalid." };
  if (weightMinGrams !== null && (weightGrams === null || weightMinGrams > weightGrams)) return { error: "The minimum weight cannot exceed the maximum weight." };
  if (gstRateBps !== null && gstRateBps > 10000) return { error: "GST rate cannot exceed 100%." };

  return { value: { sku, name, material, finish, heightMm, widthMm, depthMm, weightMinGrams, weightGrams, packageLengthMm, packageWidthMm, packageHeightMm, pricePaise, gstRateBps, inventoryKind, stockQuantity, lowStockThreshold, codEligible } };
}

export function parseVariantPatch(body: JsonObject): ParseResult<VariantPatch> {
  const patch: VariantPatch = {};
  const stringFields = [["sku", 100], ["name", 160], ["material", 160]] as const;
  for (const [field, max] of stringFields) {
    if (field in body) {
      const value = requiredString(body[field], max);
      if (!value) return { error: `${field} is invalid.` };
      patch[field] = value;
    }
  }
  if ("finish" in body) patch.finish = optionalString(body.finish, 160);

  const numberFields = ["heightMm", "widthMm", "depthMm", "weightMinGrams", "weightGrams", "packageLengthMm", "packageWidthMm", "packageHeightMm", "pricePaise", "gstRateBps", "stockQuantity", "lowStockThreshold"] as const;
  for (const field of numberFields) {
    if (field in body) {
      const minimum = field === "pricePaise" || field === "gstRateBps" || field === "stockQuantity" || field === "lowStockThreshold" ? 0 : 1;
      const value = optionalInteger(body[field], minimum);
      if (value === undefined || ((field === "heightMm" || field === "stockQuantity" || field === "lowStockThreshold") && value === null)) return { error: `${field} is invalid.` };
      if (field === "heightMm") patch.heightMm = value!;
      if (field === "widthMm") patch.widthMm = value;
      if (field === "depthMm") patch.depthMm = value;
      if (field === "weightMinGrams") patch.weightMinGrams = value;
      if (field === "weightGrams") patch.weightGrams = value;
      if (field === "packageLengthMm") patch.packageLengthMm = value;
      if (field === "packageWidthMm") patch.packageWidthMm = value;
      if (field === "packageHeightMm") patch.packageHeightMm = value;
      if (field === "pricePaise") patch.pricePaise = value;
      if (field === "gstRateBps") patch.gstRateBps = value;
      if (field === "stockQuantity") patch.stockQuantity = value!;
      if (field === "lowStockThreshold") patch.lowStockThreshold = value!;
    }
  }
  if (patch.weightMinGrams !== undefined && patch.weightGrams !== undefined && patch.weightMinGrams !== null && (patch.weightGrams === null || patch.weightMinGrams > patch.weightGrams)) return { error: "The minimum weight cannot exceed the maximum weight." };
  if (patch.gstRateBps !== undefined && patch.gstRateBps !== null && patch.gstRateBps > 10000) return { error: "GST rate cannot exceed 100%." };
  if ("inventoryKind" in body) { const value = enumValue(body.inventoryKind, ["unique", "repeatable"] as const); if (!value) return { error: "Inventory type is invalid." }; patch.inventoryKind = value; }
  if ("codEligible" in body) { if (typeof body.codEligible !== "boolean") return { error: "COD eligibility must be true or false." }; patch.codEligible = body.codEligible; }
  if ("isActive" in body) { if (typeof body.isActive !== "boolean") return { error: "Active status must be true or false." }; patch.isActive = body.isActive; }

  return Object.keys(patch).length ? { value: patch } : { error: "No valid changes were supplied." };
}
