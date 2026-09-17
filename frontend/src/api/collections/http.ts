// @ts-nocheck
import { authorizeCustomer } from "@/api/auth/authorization";
import { readJsonObject, requiredString } from "@/api/catalog/input";

export async function requireCustomer(request: Request) {
  const authorization = await authorizeCustomer(request);
  if (authorization.authorized) return authorization;

  return Response.json(
    { error: { code: "AUTH_REQUIRED", message: "Please sign in to continue." } },
    { status: authorization.status },
  );
}

export async function readProductMutation(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return null;

  const productId = requiredString(body.productId, 160);
  const variantId = body.variantId === undefined || body.variantId === null
    ? null
    : requiredString(body.variantId, 160);
  if (!productId || (body.variantId !== undefined && body.variantId !== null && !variantId)) {
    return null;
  }
  return { productId, variantId };
}

export function readProductIdList(value: unknown) {
  if (!Array.isArray(value) || value.length > 100) return null;
  const ids = value.map((item) => requiredString(item, 160));
  if (ids.some((item) => !item)) return null;
  return Array.from(new Set(ids as string[]));
}

export function collectionUnavailable() {
  return Response.json(
    { error: { code: "COLLECTION_UNAVAILABLE", message: "Your saved items could not be updated." } },
    { status: 503 },
  );
}
