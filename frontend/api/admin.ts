import { apiRequest } from "./client";

export const adminModules = [
  { section: "overview", title: "Overview", description: "Review live administration summary data.", endpoint: "/api/admin/products, /api/admin/reviews, /api/admin/contact/*" },
  { section: "category", title: "Category", description: "Review product categories.", endpoint: "/api/admin/products/categories" },
  { section: "deity", title: "Deity", description: "Review product deities.", endpoint: "/api/admin/products/deities" },
  { section: "material", title: "Material", description: "Review product materials.", endpoint: "/api/admin/products/materials" },
  { section: "product", title: "Product", description: "Review active, draft, and archived product listings.", endpoint: "/api/admin/products" },
  { section: "review", title: "Review", description: "Review customer review moderation queue.", endpoint: "/api/admin/reviews" },
  { section: "faqs", title: "FAQs", description: "Review FAQ records.", endpoint: "/api/admin/faqs" },
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

type AdminListResponse<T = Record<string, unknown>> = AdminList<T> | T[];

function normalizeAdminList<T>(data: AdminListResponse<T>): AdminList<T> {
  if (Array.isArray(data)) {
    return {
      items: data,
      pagination: { page: 1, page_size: data.length, total_items: data.length, total_pages: 1 },
    };
  }

  const items = Array.isArray(data.items) ? data.items : [];
  return {
    items,
    pagination: {
      page: data.pagination?.page ?? 1,
      page_size: data.pagination?.page_size ?? items.length,
      total_items: data.pagination?.total_items ?? items.length,
      total_pages: data.pagination?.total_pages ?? 1,
    },
  };
}

function getListTotal<T>(data: AdminListResponse<T>) {
  return normalizeAdminList(data).pagination.total_items;
}

export function getAdminModule(section: string) {
  return adminModules.find((module) => module.section === section);
}

export async function getAdminSectionData(section: AdminSection) {
  if (section === "overview") {
    const [products, categories, deities, materials, reviews, contacts, customize, faqs, staff] = await Promise.all([
      apiRequest<AdminListResponse>("/api/admin/products?page_size=5"),
      apiRequest<Record<string, unknown>[]>("/api/admin/products/categories"),
      apiRequest<Record<string, unknown>[]>("/api/admin/products/deities"),
      apiRequest<Record<string, unknown>[]>("/api/admin/products/materials"),
      apiRequest<AdminListResponse>("/api/admin/reviews?page_size=5"),
      apiRequest<AdminListResponse>("/api/admin/contact/message?page_size=5"),
      apiRequest<AdminListResponse>("/api/admin/contact/customize?page_size=5"),
      apiRequest<Record<string, unknown>[]>("/api/admin/faqs"),
      apiRequest<AdminListResponse>("/api/admin/staff?page_size=5"),
    ]);

    return {
      items: [
        { id: "products", name: "Products", total: getListTotal(products) },
        { id: "categories", name: "Categories", total: categories.length },
        { id: "deities", name: "Deities", total: deities.length },
        { id: "materials", name: "Materials", total: materials.length },
        { id: "reviews", name: "Reviews", total: getListTotal(reviews) },
        { id: "contacts", name: "Contact Requests", total: getListTotal(contacts) },
        { id: "customize", name: "Custom Requests", total: getListTotal(customize) },
        { id: "faqs", name: "FAQs", total: faqs.length },
        { id: "staff", name: "Staff", total: getListTotal(staff) },
      ],
      pagination: { page: 1, page_size: 9, total_items: 9, total_pages: 1 },
    } satisfies AdminList;
  }

  const endpoints: Record<Exclude<AdminSection, "overview">, string> = {
    category: "/api/admin/products/categories",
    deity: "/api/admin/products/deities",
    material: "/api/admin/products/materials",
    product: "/api/admin/products?page_size=5",
    review: "/api/admin/reviews?page_size=5",
    faqs: "/api/admin/faqs",
    staff: "/api/admin/staff?page_size=5",
  };

  const data = await apiRequest<AdminListResponse>(endpoints[section]);
  return normalizeAdminList(data);
}
