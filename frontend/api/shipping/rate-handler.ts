// @ts-nocheck
import { readJsonObject } from "@/api/catalog/input";
import { requireCheckoutCustomer } from "@/api/checkout/http";
import { parseIndianPostalCode, parsePaymentMethod } from "@/api/checkout/input";
import {
  quoteShippingRates,
  ShippingConfigurationError,
  ShippingProviderError,
} from "./service";

export async function handleShippingRateRequest(request: Request) {
  const authorization = await requireCheckoutCustomer(request);
  if (authorization instanceof Response) return authorization;
  const body = await readJsonObject(request);
  const postalCode = parseIndianPostalCode(body?.postalCode);
  const paymentMethod = parsePaymentMethod(body?.paymentMethod);
  if (!body || !postalCode || !paymentMethod) {
    return Response.json(
      { error: { code: "INVALID_SHIPPING_REQUEST", message: "A valid Indian postcode and payment method are required." } },
      { status: 400 },
    );
  }

  try {
    const data = await quoteShippingRates(
      authorization.clerkUserId,
      authorization.userId,
      postalCode,
      paymentMethod,
    );
    return Response.json({ data: { ...data, postalCode, paymentMethod } });
  } catch (error) {
    if (error instanceof ShippingConfigurationError) {
      return Response.json(
        { error: { code: "SHIPPING_PROVIDER_REQUIRED", message: "Automatic delivery rates are ready and will activate after the gallery connects its Shiprocket API account." } },
        { status: 503 },
      );
    }
    if (error instanceof ShippingProviderError) {
      return Response.json(
        { error: { code: "SHIPPING_PROVIDER_UNAVAILABLE", message: "Live courier rates are temporarily unavailable. Please try again or request a gallery freight quote." } },
        { status: 502 },
      );
    }
    return Response.json(
      { error: { code: "SHIPPING_UNAVAILABLE", message: "Delivery rates could not be calculated." } },
      { status: 503 },
    );
  }
}
