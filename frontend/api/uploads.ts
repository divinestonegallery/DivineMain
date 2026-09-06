import { apiRequest } from "./client";
import { prepareImageForUpload } from "@/components/Uploads/prepare-image";

export type AdminUploadContentType = "image/jpeg" | "image/png" | "image/webp";

export interface AdminUploadSessionPayload {
  filename: string;
  content_type: AdminUploadContentType;
  file_size: number;
  purpose: "product_image";
}

export interface AdminUploadSession {
  method: "PUT" | string;
  upload_url: string;
  object_key: string;
  public_url?: string | null;
  required_headers?: Record<string, string>;
  expires_in_seconds?: number;
}

const supportedContentTypes = new Set<string>(["image/jpeg", "image/png", "image/webp"]);

function cleanFilename(file: File) {
  const name = (file.name || "image").split(/[\\/]/).pop()?.replace(/^\.+/, "") || "image";
  return name.slice(0, 255);
}

function isSupportedContentType(type: string): type is AdminUploadContentType {
  return supportedContentTypes.has(type);
}

function uploadHeaders(session: AdminUploadSession, file: File) {
  const headers = new Headers();
  Object.entries(session.required_headers || {}).forEach(([name, value]) => {
    if (name.toLowerCase() !== "content-length") headers.set(name, String(value));
  });
  if (!headers.has("Content-Type")) headers.set("Content-Type", file.type);
  return headers;
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
  const uploadFile = await prepareImageForUpload(file);
  if (!isSupportedContentType(uploadFile.type)) throw new Error("INVALID_IMAGE_TYPE");

  return {
    uploadFile,
    session: await apiRequest<AdminUploadSession>("/api/v1/common/upload/presigned-url", {
      method: "POST",
      body: JSON.stringify({
        filename: cleanFilename(uploadFile),
        content_type: uploadFile.type,
        file_size: uploadFile.size,
        purpose: "product_image",
      } satisfies AdminUploadSessionPayload),
    }),
  };
}

export async function uploadAdminImage(file: File) {
  const { uploadFile, session } = await createAdminUploadSession(file);
  const response = await fetch(session.upload_url, {
    method: session.method || "PUT",
    headers: uploadHeaders(session, uploadFile),
    body: uploadFile,
  });

  if (!response.ok) throw new Error("Image upload failed. Please try again.");
  return session;
}
