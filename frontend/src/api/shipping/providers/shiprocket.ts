// @ts-nocheck
import type { ShiprocketConfiguration } from "../config";

export type ShippingPackage = {
  packageId: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  weightGrams: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  declaredValuePaise: number;
};

export type PackageRate = {
  courierId: string;
  courierName: string;
  ratePaise: number;
  estimatedDeliveryDays: number | null;
};

export type ShippingRateOption = {
  provider: "shiprocket";
  providerServiceCode: string;
  serviceName: string;
  shippingPaise: number;
  estimatedDeliveryDays: number | null;
  packageRates: Array<ShippingPackage & { rate: PackageRate }>;
};

type ShiprocketResponse = {
  data?: {
    available_courier_companies?: unknown;
  };
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function truthyProviderFlag(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "Y" || value === "y";
}

export function parseShiprocketRates(payload: unknown, cod: boolean): PackageRate[] {
  if (!payload || typeof payload !== "object") return [];
  const companies = (payload as ShiprocketResponse).data?.available_courier_companies;
  if (!Array.isArray(companies)) return [];

  return companies.flatMap((company): PackageRate[] => {
    if (!company || typeof company !== "object") return [];
    const row = company as Record<string, unknown>;
    const courierIdValue = row.courier_company_id ?? row.courier_id;
    const courierId = courierIdValue === undefined || courierIdValue === null
      ? null
      : String(courierIdValue);
    const courierName = typeof row.courier_name === "string"
      ? row.courier_name.trim()
      : typeof row.courier_company_name === "string"
        ? row.courier_company_name.trim()
        : "";
    const rateRupees = numberValue(row.rate) ?? numberValue(row.freight_charge);
    if (!courierId || !courierName || rateRupees === null || rateRupees <= 0) return [];
    if (cod && !truthyProviderFlag(row.cod)) return [];
    const estimatedDays = numberValue(row.estimated_delivery_days);
    return [{
      courierId,
      courierName,
      ratePaise: Math.round(rateRupees * 100),
      estimatedDeliveryDays: estimatedDays === null ? null : Math.max(0, Math.ceil(estimatedDays)),
    }];
  });
}

async function bearerToken(configuration: ShiprocketConfiguration) {
  if (configuration.apiToken) return configuration.apiToken;
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const response = await fetch(`${configuration.apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: configuration.apiEmail, password: configuration.apiPassword }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("SHIPROCKET_AUTH_FAILED");
  const payload = await response.json() as { token?: unknown };
  if (typeof payload.token !== "string" || !payload.token) throw new Error("SHIPROCKET_AUTH_FAILED");
  cachedToken = { value: payload.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  return payload.token;
}

async function ratesForPackage(
  configuration: ShiprocketConfiguration,
  token: string,
  destinationPostalCode: string,
  paymentMethod: "online" | "bank_transfer" | "cod",
  item: ShippingPackage,
) {
  const query = new URLSearchParams({
    pickup_postcode: configuration.originPostalCode,
    delivery_postcode: destinationPostalCode,
    cod: paymentMethod === "cod" ? "1" : "0",
    weight: (item.weightGrams / 1000).toFixed(3),
    length: (item.lengthMm / 10).toFixed(1),
    breadth: (item.widthMm / 10).toFixed(1),
    height: (item.heightMm / 10).toFixed(1),
    declared_value: (item.declaredValuePaise / 100).toFixed(2),
    mode: "Surface",
    is_return: "0",
  });
  const response = await fetch(`${configuration.apiBaseUrl}/courier/serviceability/?${query}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`SHIPROCKET_RATE_FAILED_${response.status}`);
  return parseShiprocketRates(await response.json(), paymentMethod === "cod");
}

export function combineCommonCouriers(
  packages: ShippingPackage[],
  packageRates: PackageRate[][],
): ShippingRateOption[] {
  if (!packages.length || packageRates.some((rates) => !rates.length)) return [];
  const commonIds = packageRates
    .slice(1)
    .reduce(
      (common, rates) => new Set([...common].filter((id) => rates.some((rate) => rate.courierId === id))),
      new Set(packageRates[0].map((rate) => rate.courierId)),
    );

  const commonOptions = [...commonIds].flatMap((courierId): ShippingRateOption[] => {
    const selected = packageRates.map((rates) => rates.find((rate) => rate.courierId === courierId));
    if (selected.some((rate) => !rate)) return [];
    const complete = selected as PackageRate[];
    const estimatedDays = complete.some((rate) => rate.estimatedDeliveryDays === null)
      ? null
      : Math.max(...complete.map((rate) => rate.estimatedDeliveryDays!));
    return [{
      provider: "shiprocket",
      providerServiceCode: courierId,
      serviceName: `${complete[0].courierName} Surface`,
      shippingPaise: complete.reduce((sum, rate) => sum + rate.ratePaise, 0),
      estimatedDeliveryDays: estimatedDays,
      packageRates: packages.map((item, index) => ({ ...item, rate: complete[index] })),
    }];
  });
  if (commonOptions.length) return commonOptions.sort((a, b) => a.shippingPaise - b.shippingPaise).slice(0, 3);

  const cheapest = packageRates.map((rates) => [...rates].sort((a, b) => a.ratePaise - b.ratePaise)[0]);
  const estimatedDays = cheapest.some((rate) => rate.estimatedDeliveryDays === null)
    ? null
    : Math.max(...cheapest.map((rate) => rate.estimatedDeliveryDays!));
  return [{
    provider: "shiprocket",
    providerServiceCode: `multi:${cheapest.map((rate) => rate.courierId).join(",")}`,
    serviceName: "Protected multi-parcel surface delivery",
    shippingPaise: cheapest.reduce((sum, rate) => sum + rate.ratePaise, 0),
    estimatedDeliveryDays: estimatedDays,
    packageRates: packages.map((item, index) => ({ ...item, rate: cheapest[index] })),
  }];
}

export async function getShiprocketRates(
  configuration: ShiprocketConfiguration,
  destinationPostalCode: string,
  paymentMethod: "online" | "bank_transfer" | "cod",
  packages: ShippingPackage[],
) {
  const token = await bearerToken(configuration);
  const allRates = await Promise.all(
    packages.map((item) => ratesForPackage(
      configuration,
      token,
      destinationPostalCode,
      paymentMethod,
      item,
    )),
  );
  return combineCommonCouriers(packages, allRates);
}
