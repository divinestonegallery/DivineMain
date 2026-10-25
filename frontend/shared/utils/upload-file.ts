// @ts-nocheck
import { ApiError } from "./http";


export type UploadImageContentType = "image/jpeg" | "image/png" | "image/webp";

export interface PresignedImageUploadSession {
  method: "PUT" | string;
  upload_url: string;
  object_key: string;
  public_url?: string | null;
  required_headers?: Record<string, string>;
  expires_in_seconds?: number;
}

export const maxOriginalImageFileSize = 12 * 1024 * 1024;
export const supportedUploadContentTypes = new Set<string>(["image/jpeg", "image/png", "image/webp"]);

export function cleanUploadFilename(file: File) {
  const name = (file.name || "image").split(/[\\/]/).pop()?.replace(/^\.+/, "") || "image";
  return name.slice(0, 255);
}

export function isSupportedUploadContentType(type: string): type is UploadImageContentType {
  return supportedUploadContentTypes.has(type);
}

export function validateUploadImageFile(file: File) {
  if (!file.size || file.size > maxOriginalImageFileSize) return "Image must be 12 MB or smaller.";
  if (!isSupportedUploadContentType(file.type)) return "Please choose a JPG, PNG, or WEBP image.";
  return "";
}

const browserInputLimit = 12 * 1024 * 1024;
const portableUploadTarget = 600 * 1024;

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

async function prepareImageForUpload(file: File) {
  if (!file.size || file.size > browserInputLimit) throw new Error("IMAGE_TOO_LARGE");
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error("INVALID_IMAGE_TYPE");
  if (file.size <= portableUploadTarget) return file;

  const bitmap = await createImageBitmap(file);
  try {
    let scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    let best: Blob | null = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("IMAGE_PROCESSING_UNAVAILABLE");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const candidate = await canvasBlob(canvas, Math.max(0.58, 0.86 - attempt * 0.05));
      if (!candidate) throw new Error("IMAGE_PROCESSING_UNAVAILABLE");
      best = candidate;
      if (candidate.size <= portableUploadTarget) break;
      scale *= 0.8;
    }
    if (!best || best.size > 4 * 1024 * 1024) throw new Error("IMAGE_COULD_NOT_BE_OPTIMIZED");
    return new File([best], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}

export async function prepareSupportedUploadImage(file: File) {
  const uploadFile = await prepareImageForUpload(file);
  if (!isSupportedUploadContentType(uploadFile.type)) throw new Error("INVALID_IMAGE_TYPE");
  return uploadFile as File & { type: UploadImageContentType };
}

export function uploadHeaders(session: PresignedImageUploadSession, file: File) {
  const headers = new Headers();
  Object.entries(session.required_headers || {}).forEach(([name, value]) => {
    if (name.toLowerCase() !== "content-length") headers.set(name, String(value));
  });
  if (!headers.has("Content-Type")) headers.set("Content-Type", file.type);
  return headers;
}

export async function putPresignedImage(session: PresignedImageUploadSession, file: File) {
  const response = await fetch(session.upload_url, {
    method: session.method || "PUT",
    headers: uploadHeaders(session, file),
    body: file,
  });

  if (!response.ok) throw new Error("Image upload failed. Please try again.");
}

export function friendlyUploadError(reason: unknown) {
  if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) {
    return reason.message || "Please sign in again to upload images.";
  }
  const message = reason instanceof Error ? reason.message : String(reason || "");
  if (message === "IMAGE_TOO_LARGE") return "Image must be 12 MB or smaller before optimization.";
  if (message === "INVALID_IMAGE_TYPE") return "Please choose a JPG, PNG, or WEBP image.";
  if (message === "IMAGE_PROCESSING_UNAVAILABLE") return "This browser could not prepare the image. Please try another file.";
  if (message === "IMAGE_COULD_NOT_BE_OPTIMIZED") return "The image could not be optimized for upload. Please choose a smaller file.";
  if (/unsupported image type/i.test(message)) return "Please choose a JPG, PNG, or WEBP image.";
  if (/exceed|too large|size/i.test(message)) return message;
  if (/upload/i.test(message)) return message;
  return "Image upload failed. Please try again.";
}
