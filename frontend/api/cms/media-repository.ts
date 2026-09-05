// @ts-nocheck
// drizzle removed
// schema removed
import { publicUrlForMediaKey } from "@/api/storage/media";

async function database() {
  const { getDb } = await import("@/db");
  return getDb();
}

export async function listAdminMedia() {
  const db = await database();
  const legacyAssets = await db.select({ id: mediaAssets.id, storageKey: mediaAssets.storageKey }).from(mediaAssets).where(isNull(mediaAssets.publicPath));
  await Promise.all(legacyAssets.map(({ id, storageKey }) => {
    const publicPath = publicUrlForMediaKey(storageKey);
    return publicPath ? db.update(mediaAssets).set({ publicPath }).where(eq(mediaAssets.id, id)) : Promise.resolve();
  }));
  const [assetRows, productUsage, pageUsage] = await Promise.all([
    db.select().from(mediaAssets).where(ne(mediaAssets.status, "rejected")).orderBy(asc(mediaAssets.folder), asc(mediaAssets.originalFilename)),
    db.select({ mediaAssetId: productMedia.mediaAssetId, productId: products.id, productName: products.name }).from(productMedia).innerJoin(products, eq(productMedia.productId, products.id)),
    db.select({ mediaAssetId: siteSections.mediaAssetId, pageId: sitePages.id, pageTitle: sitePages.title, sectionHeading: siteSections.heading }).from(siteSections).innerJoin(sitePages, eq(siteSections.pageId, sitePages.id)),
  ]);
  const assets = assetRows.filter((asset) => asset.publicPath).map((asset) => ({
    ...asset,
    tags: (() => { try { const parsed: unknown = JSON.parse(asset.tagsJson); return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : []; } catch { return []; } })(),
    productUsage: productUsage.filter((usage) => usage.mediaAssetId === asset.id),
    pageUsage: pageUsage.filter((usage) => usage.mediaAssetId === asset.id),
  }));
  return {
    assets,
    folders: [...new Set(assets.map((asset) => asset.folder))].sort((a, b) => a.localeCompare(b)),
  };
}

export type MediaPatch = Partial<{
  altText: string | null;
  caption: string | null;
  folder: string;
  tagsJson: string;
  focalPointX: number;
  focalPointY: number;
  status: "ready" | "deleted";
}>;

export async function updateAdminMedia(id: string, patch: MediaPatch, actorUserId: string) {
  const db = await database();
  await db.batch([
    db.update(mediaAssets).set({ ...patch, updatedAt: sql`(extract(epoch from now())::integer)` }).where(eq(mediaAssets.id, id)),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: patch.status === "deleted" ? "media.archived" : patch.status === "ready" ? "media.restored" : "media.updated", entityType: "media_asset", entityId: id, changesJson: JSON.stringify(patch) }),
  ]);
  return listAdminMedia();
}

export async function findReusableMedia(checksumSha256: string) {
  const db = await database();
  const [asset] = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(and(eq(mediaAssets.checksumSha256, checksumSha256), isNotNull(mediaAssets.publicPath), eq(mediaAssets.status, "ready"))).limit(1);
  return asset ?? null;
}
