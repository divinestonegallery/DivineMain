import { apiRequest } from "./client";
import { prepareImageForUpload } from "@/components/Uploads/prepare-image";

export type UploadImageContentType = "image/jpeg" | "image/png" | "image/webp";
export type AdminUploadContentType = UploadImageContentType;

export interface AdminUploadSessionPayload {
  filename: string;
  content_type: AdminUploadContentType;
  file_size: number;
  purpose: "product_image";
}

export interface PresignedImageUploadSession {
  method: "PUT" | string;
  upload_url: string;
  object_key: string;
  public_url?: string | null;
  required_headers?: Record<string, string>;
  expires_in_seconds?: number;
}

export type AdminUploadSession = PresignedImageUploadSession;

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

export async function createAdminUploadSession(file: File) {
  const uploadFile = await prepareSupportedUploadImage(file);

  return {
    uploadFile,
    session: await apiRequest<AdminUploadSession>("/api/v1/common/upload/presigned-url", {
      method: "POST",
      body: JSON.stringify({
        filename: cleanUploadFilename(uploadFile),
        content_type: uploadFile.type,
        file_size: uploadFile.size,
        purpose: "product_image",
      } satisfies AdminUploadSessionPayload),
    }),
  };
}

export async function uploadAdminImage(file: File) {
  const { uploadFile, session } = await createAdminUploadSession(file);
  await putPresignedImage(session, uploadFile);
  return session;
}
