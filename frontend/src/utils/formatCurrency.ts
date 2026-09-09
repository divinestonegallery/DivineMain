// @ts-nocheck
type CurrencyFormatOptions = {
  fallback?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
};

export function numberFromCurrencyValue(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const amount = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(amount) ? amount : null;
}

export function formatOptionalCurrency(value: number | string | null | undefined, options: CurrencyFormatOptions = {}): string | null {
  const amount = numberFromCurrencyValue(value);
  if (amount === null) return null;

  const hasFraction = Math.abs(amount % 1) > 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: options.minimumFractionDigits ?? (hasFraction ? 2 : 0),
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(amount);
}

export function formatCurrency(value: number | string | null | undefined, options: CurrencyFormatOptions = {}): string {
  return formatOptionalCurrency(value, options) ?? options.fallback ?? "Price on request";
}

export function formatDiscountPercentage(value: number | string | null | undefined): string | null {
  const amount = numberFromCurrencyValue(value);
  if (amount === null || amount <= 0) return null;

  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted}%`;
}
