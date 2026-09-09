// @ts-nocheck
// drizzle removed
import {
  auditLogs,
  categories,
  collections,
  deities,
  mediaAssets,
  productMedia,
  productCollections,
  products,
  productVariants,
} from "@/db/schema";
import { nextAvailableSlug, slugFromName } from "@/api/catalog/slug";

async function database() {
  const { getDb } = await import("@/db");
  return getDb();
}

export async function listAdminProducts() {
  const db = await database();
  const productRows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      shortDescription: products.shortDescription,
      description: products.description,
      categoryId: products.categoryId,
      category: categories.name,
      deityId: products.deityId,
      deity: deities.name,
      productType: products.productType,
      salesMode: products.salesMode,
      status: products.status,
      isFeatured: products.isFeatured,
      sortOrder: products.sortOrder,
      seoTitle: products.seoTitle,
      seoDescription: products.seoDescription,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(deities, eq(products.deityId, deities.id))
    .orderBy(asc(products.sortOrder), asc(products.name));

  const variantRows = await db
    .select()
    .from(productVariants)
    .orderBy(asc(productVariants.productId), asc(productVariants.createdAt));
  const mediaRows = await db
    .select({
      productId: productMedia.productId,
      id: mediaAssets.id,
      publicPath: mediaAssets.publicPath,
      altText: mediaAssets.altText,
      isPrimary: productMedia.isPrimary,
      sortOrder: productMedia.sortOrder,
    })
    .from(productMedia)
    .innerJoin(mediaAssets, eq(productMedia.mediaAssetId, mediaAssets.id))
    .orderBy(asc(productMedia.productId), asc(productMedia.sortOrder));
  const collectionRows = await db
    .select({
      productId: productCollections.productId,
      id: collections.id,
      name: collections.name,
      slug: collections.slug,
      sortOrder: productCollections.sortOrder,
    })
    .from(productCollections)
    .innerJoin(collections, eq(productCollections.collectionId, collections.id))
    .orderBy(asc(productCollections.productId), asc(productCollections.sortOrder));

  return productRows.map((product) => ({
    ...product,
    variants: variantRows.filter((variant) => variant.productId === product.id),
    media: mediaRows.filter((media) => media.productId === product.id),
    collections: collectionRows.filter((collection) => collection.productId === product.id),
  }));
}

export async function getAdminProduct(id: string) {
  const items = await listAdminProducts();
  return items.find((item) => item.id === id) ?? null;
}

export type NewProduct = {
  name: string;
  shortDescription: string | null;
  description: string;
  categoryId: string | null;
  deityId: string | null;
  productType: "ready_made" | "made_to_order";
  salesMode: "direct" | "quote" | "both";
};

export async function createAdminProduct(input: NewProduct, actorUserId: string) {
  const db = await database();
  const id = `prd:${crypto.randomUUID()}`;
  const auditId = crypto.randomUUID();
  const baseSlug = slugFromName(input.name, "moorti");
  const existingSlugs = (await db
      .select({ slug: products.slug })
      .from(products)
      .where(or(eq(products.slug, baseSlug), like(products.slug, `${baseSlug}-%`))))
    .map((item) => item.slug);
  const slug = nextAvailableSlug(baseSlug, existingSlugs);
  const productInput = { ...input, slug };

  await db.batch([
    db.insert(products).values({
      id,
      ...productInput,
      status: "draft",
      isFeatured: false,
      sortOrder: 999,
    }),
    db.insert(auditLogs).values({
      id: auditId,
      actorUserId,
      action: "product.created",
      entityType: "product",
      entityId: id,
      changesJson: JSON.stringify(productInput),
    }),
  ]);

  return getAdminProduct(id);
}

export type ProductPatch = Partial<{
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string;
  categoryId: string | null;
  deityId: string | null;
  productType: "ready_made" | "made_to_order";
  salesMode: "direct" | "quote" | "both";
  status: "draft" | "active" | "archived";
  isFeatured: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
}>;

export async function updateAdminProduct(
  id: string,
  patch: ProductPatch,
  actorUserId: string,
) {
  const db = await database();
  await db.batch([
    db
      .update(products)
      .set({ ...patch, updatedAt: sql`(extract(epoch from now())::integer)` })
      .where(eq(products.id, id)),
    db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorUserId,
      action: "product.updated",
      entityType: "product",
      entityId: id,
      changesJson: JSON.stringify(patch),
    }),
  ]);

  return getAdminProduct(id);
}

export type NewVariant = {
  sku: string;
  name: string;
  material: string;
  finish: string | null;
  heightMm: number;
  widthMm: number | null;
  depthMm: number | null;
  weightMinGrams: number | null;
  weightGrams: number | null;
  packageLengthMm: number | null;
  packageWidthMm: number | null;
  packageHeightMm: number | null;
  pricePaise: number | null;
  gstRateBps: number | null;
  inventoryKind: "unique" | "repeatable";
  stockQuantity: number;
  lowStockThreshold: number;
  codEligible: boolean;
};

export async function createAdminVariant(
  productId: string,
  input: NewVariant,
  actorUserId: string,
) {
  const db = await database();
  const id = `var:${crypto.randomUUID()}`;
  await db.batch([
    db.insert(productVariants).values({ id, productId, ...input, isActive: true }),
    db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorUserId,
      action: "product_variant.created",
      entityType: "product_variant",
      entityId: id,
      changesJson: JSON.stringify({ productId, ...input }),
    }),
  ]);

  return id;
}

export type VariantPatch = Partial<Omit<NewVariant, "sku" | "name"> & {
  sku: string;
  name: string;
  isActive: boolean;
}>;

export async function updateAdminVariant(
  id: string,
  patch: VariantPatch,
  actorUserId: string,
) {
  const db = await database();
  await db.batch([
    db
      .update(productVariants)
      .set({ ...patch, updatedAt: sql`(extract(epoch from now())::integer)` })
      .where(eq(productVariants.id, id)),
    db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorUserId,
      action: "product_variant.updated",
      entityType: "product_variant",
      entityId: id,
      changesJson: JSON.stringify(patch),
    }),
  ]);

  const [variant] = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.id, id)))
    .limit(1);
  return variant ?? null;
}

export async function listCatalogLookups() {
  const db = await database();
  const [categoryRows, deityRows, collectionRows] = await Promise.all([
    db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder)),
    db.select().from(deities).where(eq(deities.isActive, true)).orderBy(asc(deities.sortOrder)),
    db.select().from(collections).where(eq(collections.isActive, true)).orderBy(asc(collections.sortOrder)),
  ]);
  return { categories: categoryRows, deities: deityRows, collections: collectionRows };
}

export async function setAdminProductCollections(
  productId: string,
  collectionIds: string[],
  actorUserId: string,
) {
  const db = await database();
  const statements = [
    db.delete(productCollections).where(eq(productCollections.productId, productId)),
    ...collectionIds.map((collectionId, sortOrder) =>
      db.insert(productCollections).values({ productId, collectionId, sortOrder }),
    ),
    db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorUserId,
      action: "product.collections_updated",
      entityType: "product",
      entityId: productId,
      changesJson: JSON.stringify({ collectionIds }),
    }),
  ];
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  return getAdminProduct(productId);
}
