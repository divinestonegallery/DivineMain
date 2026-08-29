// @ts-nocheck
// drizzle removed
// schema removed
import { readCheckoutPreview, type PaymentMethod } from "@/api/checkout/repository";
import { getShiprocketConfiguration } from "./config";
import { getShiprocketRates, type ShippingPackage } from "./providers/shiprocket";
import { isRazorpayConfigured } from "@/api/payments/config";

async function database() {
  const { getDb } = await import("@/db");
  return getDb();
}

export class ShippingConfigurationError extends Error {}
export class ShippingProviderError extends Error {}

export async function quoteShippingRates(
  clerkUserId: string,
  userId: string,
  destinationPostalCode: string,
  paymentMethod: PaymentMethod,
) {
  const preview = await readCheckoutPreview(clerkUserId, userId);
  const paymentIssues = [
    paymentMethod === "cod" && !preview.phoneVerified
      ? { code: "PHONE_VERIFICATION_REQUIRED", message: "Verify your account phone number before choosing Cash on Delivery." }
      : null,
    paymentMethod === "cod" && preview.items.some((item) => !item.codEligible)
      ? { code: "COD_UNAVAILABLE", message: "Cash on Delivery is unavailable for one or more selected works." }
      : null,
    paymentMethod === "online" && !isRazorpayConfigured()
      ? { code: "ONLINE_PROVIDER_REQUIRED", message: "Online payment will activate after Razorpay test credentials are configured." }
      : null,
  ].filter((issue): issue is NonNullable<typeof issue> => Boolean(issue));

  if (!preview.commerciallyReady || paymentIssues.length) {
    return { status: "not_ready" as const, preview, paymentIssues, options: [] };
  }

  const configuration = getShiprocketConfiguration();
  if (!configuration) throw new ShippingConfigurationError("Shiprocket is not configured.");
  const packages: ShippingPackage[] = preview.items.flatMap((item) =>
    Array.from({ length: item.quantity }, (_, index) => ({
      packageId: `package:${item.variantId}:${index + 1}`,
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      quantity: 1,
      weightGrams: item.weightGrams!,
      lengthMm: item.packageLengthMm!,
      widthMm: item.packageWidthMm!,
      heightMm: item.packageHeightMm!,
      declaredValuePaise: Math.round(item.unitPricePaise! + item.unitPricePaise! * item.gstRateBps! / 10000),
    })),
  );

  let providerOptions;
  try {
    providerOptions = await getShiprocketRates(
      configuration,
      destinationPostalCode,
      paymentMethod,
      packages,
    );
  } catch (error) {
    throw new ShippingProviderError(error instanceof Error ? error.message : "Shipping provider failed.");
  }

  if (!providerOptions.length) {
    return {
      status: "manual_review" as const,
      preview,
      paymentIssues,
      options: [],
      message: "No suitable surface courier returned a rate for every packed work. The gallery will arrange a protected freight quotation.",
    };
  }

  const db = await database();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 30 * 60;
  const options = providerOptions.map((option) => ({
    quoteId: `shipping-quote:${crypto.randomUUID()}`,
    provider: option.provider,
    serviceCode: option.providerServiceCode,
    serviceName: option.serviceName,
    shippingPaise: option.shippingPaise,
    totalPaise: preview.subtotalPaise + preview.gstPaise + option.shippingPaise,
    estimatedDeliveryDays: option.estimatedDeliveryDays,
    expiresAt,
    packages: option.packageRates.map((item) => ({
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      weightGrams: item.weightGrams,
      lengthMm: item.lengthMm,
      widthMm: item.widthMm,
      heightMm: item.heightMm,
      courierName: item.rate.courierName,
      ratePaise: item.rate.ratePaise,
    })),
  }));
  const inserts = options.map((option) => db.insert(shippingQuotes).values({
    id: option.quoteId,
    userId,
    status: "active",
    provider: option.provider,
    providerServiceCode: option.serviceCode,
    paymentMethod,
    cartFingerprint: preview.cartFingerprint,
    originPostalCode: configuration.originPostalCode,
    destinationPostalCode,
    serviceName: option.serviceName,
    estimatedDeliveryDays: option.estimatedDeliveryDays,
    chargeableWeightGrams: preview.chargeableWeightGrams,
    subtotalPaise: preview.subtotalPaise,
    gstPaise: preview.gstPaise,
    shippingPaise: option.shippingPaise,
    totalPaise: option.totalPaise,
    packagesJson: JSON.stringify(option.packages),
    rateSnapshotJson: JSON.stringify({
      provider: option.provider,
      serviceCode: option.serviceCode,
      serviceName: option.serviceName,
      shippingPaise: option.shippingPaise,
      estimatedDeliveryDays: option.estimatedDeliveryDays,
    }),
    expiresAt,
  }));
  const statements = [
    db.update(shippingQuotes).set({ status: "expired", updatedAt: sql`(extract(epoch from now())::integer)` }).where(and(eq(shippingQuotes.userId, userId), eq(shippingQuotes.status, "active"))),
    ...inserts,
  ];
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);

  return { status: "quoted" as const, preview, paymentIssues, options };
}
