// @ts-nocheck
// drizzle removed
import {
  auditLogs,
  categories,
  collections,
  deities,
  productCollections,
  products,
} from "@/db/schema";
import { nextAvailableSlug, slugFromName } from "@/api/catalog/slug";

export type CatalogEntityKind = "category" | "deity" | "collection";

async function database() {
  const { getDb } = await import("@/db");
  return getDb();
}

export async function listAdminCatalogStructure() {
  const db = await database();
  const [categoryRows, deityRows, collectionRows, productRows, assignmentRows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select().from(deities).orderBy(asc(deities.sortOrder), asc(deities.name)),
    db.select().from(collections).orderBy(asc(collections.sortOrder), asc(collections.name)),
    db.select({ id: products.id, categoryId: products.categoryId, deityId: products.deityId }).from(products),
    db.select({ collectionId: productCollections.collectionId }).from(productCollections),
  ]);

  return {
    categories: categoryRows.map((item) => ({
      ...item,
      productCount: productRows.filter((product) => product.categoryId === item.id).length,
    })),
    deities: deityRows.map((item) => ({
      ...item,
      productCount: productRows.filter((product) => product.deityId === item.id).length,
    })),
    collections: collectionRows.map((item) => ({
      ...item,
      productCount: assignmentRows.filter((assignment) => assignment.collectionId === item.id).length,
    })),
  };
}

type NewCatalogEntity = {
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
};

export async function createAdminCatalogEntity(
  kind: CatalogEntityKind,
  input: NewCatalogEntity,
  actorUserId: string,
) {
  const db = await database();
  const id = `${kind.slice(0, 3)}:${crypto.randomUUID()}`;
  const baseSlug = slugFromName(input.name, kind);
  const existingRows = kind === "category"
    ? await db.select({ slug: categories.slug }).from(categories).where(or(eq(categories.slug, baseSlug), like(categories.slug, `${baseSlug}-%`)))
    : kind === "deity"
      ? await db.select({ slug: deities.slug }).from(deities).where(or(eq(deities.slug, baseSlug), like(deities.slug, `${baseSlug}-%`)))
      : await db.select({ slug: collections.slug }).from(collections).where(or(eq(collections.slug, baseSlug), like(collections.slug, `${baseSlug}-%`)));
  const slug = nextAvailableSlug(baseSlug, existingRows.map((item) => item.slug));
  const values = {
    id,
    name: input.name,
    slug,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  };

  const insert = kind === "category"
    ? db.insert(categories).values({ ...values, description: input.description })
    : kind === "deity"
      ? db.insert(deities).values(values)
      : db.insert(collections).values({
          ...values,
          description: input.description,
          isFeatured: input.isFeatured,
        });

  await db.batch([
    insert,
    db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorUserId,
      action: `${kind}.created`,
      entityType: kind,
      entityId: id,
      changesJson: JSON.stringify({ ...input, slug }),
    }),
  ] as unknown as Parameters<typeof db.batch>[0]);

  return listAdminCatalogStructure();
}

export type CatalogEntityPatch = Partial<{
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
}>;

export async function updateAdminCatalogEntity(
  kind: CatalogEntityKind,
  id: string,
  patch: CatalogEntityPatch,
  actorUserId: string,
) {
  const db = await database();
  const basePatch = {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
    ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
    ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
    updatedAt: sql`(extract(epoch from now())::integer)`,
  };
  const update = kind === "category"
    ? db.update(categories).set({ ...basePatch, ...(patch.description !== undefined ? { description: patch.description } : {}) }).where(eq(categories.id, id))
    : kind === "deity"
      ? db.update(deities).set(basePatch).where(eq(deities.id, id))
      : db.update(collections).set({
          ...basePatch,
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.isFeatured !== undefined ? { isFeatured: patch.isFeatured } : {}),
        }).where(eq(collections.id, id));

  await db.batch([
    update,
    db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorUserId,
      action: `${kind}.updated`,
      entityType: kind,
      entityId: id,
      changesJson: JSON.stringify(patch),
    }),
  ] as unknown as Parameters<typeof db.batch>[0]);

  return listAdminCatalogStructure();
}
