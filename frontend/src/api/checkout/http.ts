// @ts-nocheck
import { authorizeCustomer } from "@/api/auth/authorization";

export async function requireCheckoutCustomer(request: Request) {
  const authorization = await authorizeCustomer(request);
  if (authorization.authorized) return authorization;
  return Response.json(
    { error: { code: "AUTH_REQUIRED", message: "Please sign in before checkout." } },
    { status: authorization.status },
  );
}

export function checkoutUnavailable() {
  return Response.json(
    { error: { code: "CHECKOUT_UNAVAILABLE", message: "Checkout could not be loaded. Please try again." } },
    { status: 503 },
  );
}
