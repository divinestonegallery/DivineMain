// @ts-nocheck
// drizzle removed
import { localUserId } from "@/api/auth/clerk-sync";
import { synchronizeCurrentClerkUser } from "@/api/auth/current-user";
import {
  cartItems,
  products,
  productVariants,
  users,
  wishlistItems,
} from "@/db/schema";

async function database() {
  const { getDb } = await import("@/db");
  return getDb();
}

function collectionIds(clerkUserId: string) {
  return {
    userId: localUserId(clerkUserId),
    wishlistId: `wishlist:${clerkUserId}`,
    cartId: `cart:${clerkUserId}`,
  };
}

async function ensureCustomer(clerkUserId: string) {
  const db = await database();
  const ids = collectionIds(clerkUserId);
  const [customer] = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(eq(users.id, ids.userId))
    .limit(1);

  if (!customer) {
    await synchronizeCurrentClerkUser(clerkUserId);
  } else if (customer.status !== "active") {
    throw new Error("Customer account is unavailable.");
  }
  return { db, ...ids };
}

export type CustomerCollections = {
  wishlistProductIds: string[];
  bagProductIds: string[];
};

export async function readCustomerCollections(clerkUserId: string): Promise<CustomerCollections> {
  const { db, wishlistId, cartId } = await ensureCustomer(clerkUserId);
  const [wishlistRows, bagRows] = await Promise.all([
    db
      .select({ productId: wishlistItems.productId })
      .from(wishlistItems)
      .innerJoin(products, eq(wishlistItems.productId, products.id))
      .where(and(eq(wishlistItems.wishlistId, wishlistId), eq(products.status, "active")))
      .orderBy(asc(wishlistItems.createdAt)),
    db
      .select({ productId: cartItems.productId })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.intent, "quote"), eq(products.status, "active")))
      .orderBy(asc(cartItems.createdAt)),
  ]);

  return {
    wishlistProductIds: wishlistRows.map((row) => row.productId),
    bagProductIds: bagRows.map((row) => row.productId),
  };
}

async function resolveActiveVariant(productId: string, requestedVariantId?: string | null) {
  const db = await database();
  const conditions = [
    eq(products.id, productId),
    eq(products.status, "active"),
    eq(productVariants.productId, productId),
    eq(productVariants.isActive, true),
  ];
  if (requestedVariantId) conditions.push(eq(productVariants.id, requestedVariantId));

  const [variant] = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(...conditions))
    .orderBy(asc(productVariants.createdAt))
    .limit(1);
  return variant?.id ?? null;
}

export async function addWishlistProduct(clerkUserId: string, productId: string, variantId?: string | null) {
  const { db, wishlistId } = await ensureCustomer(clerkUserId);
  const activeVariantId = await resolveActiveVariant(productId, variantId);
  if (!activeVariantId) return false;

  await db
    .insert(wishlistItems)
    .values({ wishlistId, productId, variantId: activeVariantId })
    .onConflictDoUpdate({
      target: [wishlistItems.wishlistId, wishlistItems.productId],
      set: { variantId: activeVariantId },
    });
  return true;
}

export async function removeWishlistProduct(clerkUserId: string, productId: string) {
  const { db, wishlistId } = await ensureCustomer(clerkUserId);
  await db
    .delete(wishlistItems)
    .where(
      and(
        eq(wishlistItems.wishlistId, wishlistId),
        eq(wishlistItems.productId, productId),
      ),
    );
}

export async function clearWishlist(clerkUserId: string) {
  const { db, wishlistId } = await ensureCustomer(clerkUserId);
  await db.delete(wishlistItems).where(eq(wishlistItems.wishlistId, wishlistId));
}

export async function addBagProduct(clerkUserId: string, productId: string, variantId?: string | null) {
  const { db, cartId } = await ensureCustomer(clerkUserId);
  const activeVariantId = await resolveActiveVariant(productId, variantId);
  if (!activeVariantId) return false;

  await db
    .insert(cartItems)
    .values({
      id: `cart-item:${crypto.randomUUID()}`,
      cartId,
      productId,
      variantId: activeVariantId,
      quantity: 1,
      intent: "quote",
    })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.variantId, cartItems.intent],
      set: { quantity: 1 },
    });
  return true;
}

export async function removeBagProduct(clerkUserId: string, productId: string) {
  const { db, cartId } = await ensureCustomer(clerkUserId);
  await db
    .delete(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.productId, productId),
        eq(cartItems.intent, "quote"),
      ),
    );
}

export async function clearBag(clerkUserId: string) {
  const { db, cartId } = await ensureCustomer(clerkUserId);
  await db.delete(cartItems).where(and(eq(cartItems.cartId, cartId), eq(cartItems.intent, "quote")));
}

export async function mergeDeviceCollections(
  clerkUserId: string,
  wishlistProductIds: string[],
  bagProductIds: string[],
) {
  const { db, wishlistId, cartId } = await ensureCustomer(clerkUserId);
  const requestedIds = Array.from(new Set([...wishlistProductIds, ...bagProductIds])).slice(0, 100);

  if (requestedIds.length) {
    const candidates = await db
      .select({ productId: products.id, variantId: productVariants.id })
      .from(products)
      .innerJoin(productVariants, eq(productVariants.productId, products.id))
      .where(and(inArray(products.id, requestedIds), eq(products.status, "active"), eq(productVariants.isActive, true)))
      .orderBy(asc(productVariants.createdAt));
    const firstVariant = new Map<string, string>();
    for (const candidate of candidates) {
      if (!firstVariant.has(candidate.productId)) firstVariant.set(candidate.productId, candidate.variantId);
    }

    const wishlistValues = Array.from(new Set(wishlistProductIds))
      .flatMap((productId) => firstVariant.has(productId)
        ? [{ wishlistId, productId, variantId: firstVariant.get(productId)! }]
        : []);
    const bagValues = Array.from(new Set(bagProductIds))
      .flatMap((productId) => firstVariant.has(productId)
        ? [{ id: `cart-item:${crypto.randomUUID()}`, cartId, productId, variantId: firstVariant.get(productId)!, quantity: 1, intent: "quote" as const }]
        : []);

    if (wishlistValues.length) {
      await db.insert(wishlistItems).values(wishlistValues).onConflictDoNothing();
    }
    if (bagValues.length) {
      await db.insert(cartItems).values(bagValues).onConflictDoNothing();
    }
  }

  return readCustomerCollections(clerkUserId);
}
