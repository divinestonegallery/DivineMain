// @ts-nocheck
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
