import { ApiError, apiRequest } from "@shared/utils/http";
import {
  cleanUploadFilename,
  friendlyUploadError,
  prepareSupportedUploadImage,
  putPresignedImage,
  validateUploadImageFile,
  type PresignedImageUploadSession,
  type UploadImageContentType,
} from "@shared/utils/upload-file";

export { friendlyUploadError, validateUploadImageFile };

export type AdminUploadSession = PresignedImageUploadSession;
export type AdminImageUploadTarget = "product" | "category" | "deity";

interface AdminUploadSessionPayload {
  filename: string;
  content_type: UploadImageContentType;
  file_size: number;
}

function adminUploadUrlPath(target: AdminImageUploadTarget) {
  if (target === "category") return "/api/admin/products/categories/upload-url";
  if (target === "deity") return "/api/admin/products/deities/upload-url";
  return "/api/admin/products/images/upload-url";
}

export async function createAdminUploadSession(file: File, target: AdminImageUploadTarget = "product") {
  const uploadFile = await prepareSupportedUploadImage(file);
  let session: AdminUploadSession;

  try {
    session = await apiRequest<AdminUploadSession>(adminUploadUrlPath(target), {
      method: "POST",
      body: JSON.stringify({
        filename: cleanUploadFilename(uploadFile),
        content_type: uploadFile.type,
        file_size: uploadFile.size,
      } satisfies AdminUploadSessionPayload),
    });
  } catch (reason) {
    if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) throw reason;
    throw new Error("Unable to prepare image upload. Please try again.");
  }

  return {
    uploadFile,
    session,
  };
}

export async function uploadAdminImage(file: File, target: AdminImageUploadTarget = "product") {
  const { uploadFile, session } = await createAdminUploadSession(file, target);
  await putPresignedImage(session, uploadFile);
  return session;
}
