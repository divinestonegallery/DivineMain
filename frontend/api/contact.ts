import { apiRequest } from "./client";

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
  content_type: "image/jpeg" | "image/png" | "image/webp";
  file_size: number;
}

export interface CustomizationUploadSession {
  method: "PUT" | string;
  upload_url: string;
  object_key: string;
  public_url?: string | null;
  required_headers?: Record<string, string>;
  expires_in_seconds?: number;
}

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
  return apiRequest<CustomizationUploadSession>("/api/v1/common/upload/customization-url", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
