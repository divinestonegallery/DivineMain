// @ts-nocheck
// drizzle removed
// schema removed

async function database() {
  const { getDb } = await import("@/db");
  return getDb();
}

export async function listAdminInventory() {
  const db = await database();
  const now = Math.floor(Date.now() / 1000);
  const [variantRows, reservationRows] = await Promise.all([
    db
      .select({
        id: productVariants.id,
        productId: products.id,
        productName: products.name,
        productSlug: products.slug,
        productStatus: products.status,
        sku: productVariants.sku,
        variantName: productVariants.name,
        inventoryKind: productVariants.inventoryKind,
        stockQuantity: productVariants.stockQuantity,
        lowStockThreshold: productVariants.lowStockThreshold,
        isActive: productVariants.isActive,
        updatedAt: productVariants.updatedAt,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .orderBy(asc(products.name), asc(productVariants.name)),
    db
      .select({ variantId: inventoryReservations.variantId })
      .from(inventoryReservations)
      .where(and(eq(inventoryReservations.status, "active"), gt(inventoryReservations.expiresAt, now))),
  ]);

  return variantRows.map((variant) => {
    const reservedQuantity = reservationRows.filter((reservation) => reservation.variantId === variant.id).length;
    const availableQuantity = Math.max(0, variant.stockQuantity - reservedQuantity);
    return {
      ...variant,
      reservedQuantity,
      availableQuantity,
      stockState: !variant.isActive
        ? "inactive"
        : availableQuantity === 0
          ? "out_of_stock"
          : availableQuantity <= variant.lowStockThreshold
            ? "low_stock"
            : "in_stock",
    };
  });
}

export function inventorySummary(items: Awaited<ReturnType<typeof listAdminInventory>>) {
  return {
    totalVariants: items.length,
    inStock: items.filter((item) => item.stockState === "in_stock").length,
    lowStock: items.filter((item) => item.stockState === "low_stock").length,
    outOfStock: items.filter((item) => item.stockState === "out_of_stock").length,
    reserved: items.reduce((total, item) => total + item.reservedQuantity, 0),
  };
}
