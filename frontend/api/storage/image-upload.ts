// @ts-nocheck
const maxProductImageBytes = 4 * 1024 * 1024;

type ValidatedImage = {
  bytes: ArrayBuffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  checksumSha256: string;
};

function matches(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((byte, index) => bytes[index + offset] === byte);
}

async function checksum(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function validateProductImage(file: File): Promise<ValidatedImage | null> {
  if (!file.size || file.size > maxProductImageBytes) return null;
  const bytes = await file.arrayBuffer();
  const header = new Uint8Array(bytes.slice(0, 16));

  let detected: Pick<ValidatedImage, "contentType" | "extension"> | null = null;
  if (matches(header, [0xff, 0xd8, 0xff])) detected = { contentType: "image/jpeg", extension: "jpg" };
  else if (matches(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) detected = { contentType: "image/png", extension: "png" };
  else if (matches(header, [0x52, 0x49, 0x46, 0x46]) && matches(header, [0x57, 0x45, 0x42, 0x50], 8)) detected = { contentType: "image/webp", extension: "webp" };

  if (!detected || file.type !== detected.contentType) return null;
  return { bytes, ...detected, checksumSha256: await checksum(bytes) };
}
