// @ts-nocheck
import { apiRequest } from "./client";

export const adminModules = [
  { section: "products", title: "Products", description: "Review active, draft, and archived product listings.", endpoint: "/api/admin/products" },
  { section: "catalog", title: "Catalog Taxonomy", description: "Review categories, materials, and deities.", endpoint: "/api/admin/products/categories, /materials, /deities" },
  { section: "contact", title: "Contact Messages", description: "Review customer contact submissions.", endpoint: "/api/admin/contact/message" },
  { section: "commissions", title: "Custom Requests", description: "Review customization requests and workflow statuses.", endpoint: "/api/admin/contact/customize" },
  { section: "faqs", title: "FAQs", description: "Review FAQ records.", endpoint: "/api/admin/faqs" },
  { section: "reviews", title: "Reviews", description: "Review customer review moderation queue.", endpoint: "/api/admin/reviews" },
  { section: "staff", title: "Staff", description: "Review staff and admin users.", endpoint: "/api/admin/staff" },
] as const;

export type AdminSection = (typeof adminModules)[number]["section"];

export interface AdminPagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface AdminList<T = Record<string, unknown>> {
  items: T[];
  pagination: AdminPagination;
}

export function getAdminModule(section: string) {
  return adminModules.find((module) => module.section === section);
}

export async function getAdminSectionData(section: AdminSection) {
  if (section === "catalog") {
    const [categories, materials, deities] = await Promise.all([
      apiRequest<Record<string, unknown>[]>("/api/admin/products/categories"),
      apiRequest<Record<string, unknown>[]>("/api/admin/products/materials"),
      apiRequest<Record<string, unknown>[]>("/api/admin/products/deities"),
    ]);

    return {
      items: [
        { id: "categories", name: "Categories", total: categories.length },
        { id: "materials", name: "Materials", total: materials.length },
        { id: "deities", name: "Deities", total: deities.length },
      ],
      pagination: { page: 1, page_size: 3, total_items: 3, total_pages: 1 },
    } satisfies AdminList;
  }

  const endpoints: Record<Exclude<AdminSection, "catalog">, string> = {
    products: "/api/admin/products?page_size=5",
    contact: "/api/admin/contact/message?page_size=5",
    commissions: "/api/admin/contact/customize?page_size=5",
    faqs: "/api/admin/faqs",
    reviews: "/api/admin/reviews?page_size=5",
    staff: "/api/admin/staff?page_size=5",
  };

  const data = await apiRequest<AdminList | Record<string, unknown>[]>(endpoints[section]);
  if (Array.isArray(data)) {
    return {
      items: data,
      pagination: { page: 1, page_size: data.length, total_items: data.length, total_pages: 1 },
    } satisfies AdminList;
  }

  return data;
}
