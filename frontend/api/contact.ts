import { ApiError, apiRequest } from "./client";
import {
  cleanUploadFilename,
  prepareSupportedUploadImage,
  putPresignedImage,
  type PresignedImageUploadSession,
  type UploadImageContentType,
} from "./uploads";

export interface ContactMessagePayload {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export interface CustomizeRequestPayload {
  name?: string;
  email?: string;
  phone?: string;
  city: string;
  pincode?: string;
  approximate_height?: string;
  preferred_material?: string;
  description?: string;
  reference_object_key?: string;
}

export interface CustomizationUploadSessionPayload {
  filename: string;
  content_type: UploadImageContentType;
  file_size: number;
}

export type CustomizationUploadSession = PresignedImageUploadSession;

export function sendContactMessage(payload: ContactMessagePayload) {
  return apiRequest<ContactMessagePayload>("/api/v1/contact/message", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitCustomizeRequest(payload: CustomizeRequestPayload) {
  return apiRequest<CustomizeRequestPayload>("/api/v1/contact/customize", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createCustomizationUploadSession(payload: CustomizationUploadSessionPayload) {
  return apiRequest<CustomizationUploadSession>("/api/v1/contact/customize/upload-url", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadCustomizationReferenceImage(file: File) {
  const uploadFile = await prepareSupportedUploadImage(file);
  let session: CustomizationUploadSession;
  try {
    session = await createCustomizationUploadSession({
      filename: cleanUploadFilename(uploadFile),
      content_type: uploadFile.type,
      file_size: uploadFile.size,
    });
  } catch (reason) {
    if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) throw reason;
    throw new Error("Unable to prepare image upload. Please try again.");
  }

  await putPresignedImage(session, uploadFile);

  return {
    session,
    uploadFile,
    objectKey: session.object_key,
    publicUrl: session.public_url ?? null,
  };
}
