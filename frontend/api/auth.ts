// @ts-nocheck
import { fetchApi } from "@/api/services/api";

export async function login(credentials: any) {
  try {
    const data = await fetchApi<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    return data;
  } catch (error: any) {
    throw new Error(error.message || "Failed to login");
  }
}

export async function register(userData: any) {
  try {
    const data = await fetchApi<any>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    return data;
  } catch (error: any) {
    throw new Error(error.message || "Failed to register");
  }
}
