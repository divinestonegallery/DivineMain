import { apiRequest } from "@/api/client";

type AdminPagination = {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
};

type AdminList<T> = {
  items: T[];
  pagination: AdminPagination;
};

type Product = {
  id: number;
  name: string;
  status: string;
  updated_at?: string;
};

type ContactMessage = {
  id: number;
  name: string;
  status: string;
  created_at?: string;
};

type CustomRequest = ContactMessage & {
  customer_name?: string;
};

type FAQ = Record<string, unknown>;

function asAdminList<T>(payload: AdminList<T> | T[]): AdminList<T> {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      pagination: { page: 1, page_size: payload.length, total_items: payload.length, total_pages: 1 },
    };
  }
  return payload;
}

export async function getAdminDashboardSummary() {
  const [products, messages, customRequests, faqs] = await Promise.all([
    apiRequest<AdminList<Product> | Product[]>("/api/admin/products?page_size=5&sort=-updated_at"),
    apiRequest<AdminList<ContactMessage> | ContactMessage[]>("/api/admin/contact/message?page_size=5"),
    apiRequest<AdminList<CustomRequest> | CustomRequest[]>("/api/admin/contact/customize?page_size=5"),
    apiRequest<FAQ[] | { items?: FAQ[] }>("/api/admin/faqs"),
  ]);

  return {
    products: asAdminList(products),
    messages: asAdminList(messages),
    customRequests: asAdminList(customRequests),
    faqs: Array.isArray(faqs) ? faqs : faqs.items ?? [],
  };
}
