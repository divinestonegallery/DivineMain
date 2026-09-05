// @ts-nocheck
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Price on request";

  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return "Price on request";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
