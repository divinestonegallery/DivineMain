// @ts-nocheck
import { validateProductImage } from "@/api/storage/image-upload";
import { getMediaBucket } from "@/api/storage/media";
import type { CommissionAsset } from "./repository";

export async function storeCommissionImage(file: File, folder: string, altText: string) {
  const image = await validateProductImage(file);
  if (!image) return null;
  const id = `media:${crypto.randomUUID()}`;
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "_");
  let storageKey = `commissions/${safeFolder}/${crypto.randomUUID()}.${image.extension}`;
  storageKey = await getMediaBucket().put(storageKey, image.bytes, {
    httpMetadata: { contentType: image.contentType, cacheControl: "private, max-age=3600" },
    customMetadata: { mediaId: id },
  });
  const asset: CommissionAsset = {
    id,
    storageKey,
    originalFilename: file.name.slice(0, 255) || `reference.${image.extension}`,
    contentType: image.contentType,
    byteSize: file.size,
    checksumSha256: image.checksumSha256,
    altText,
  };
  return { asset, remove: () => getMediaBucket().delete(storageKey) };
}
