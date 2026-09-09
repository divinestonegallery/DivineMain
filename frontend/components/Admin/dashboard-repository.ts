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

type Taxonomy = {
  id: number;
  name: string;
  is_active?: boolean;
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

type Review = {
  id: number;
  product_name?: string;
  customer_name?: string;
  rating?: number;
  status: string;
  created_at?: string;
};

type StaffMember = {
  id: number;
  email?: string;
  name?: string;
  role?: string;
  is_active?: boolean;
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
  const [products, categories, deities, materials, messages, newMessages, customRequests, reviews, pendingReviews, faqs, staff] = await Promise.all([
    apiRequest<AdminList<Product> | Product[]>("/api/admin/products?page_size=5"),
    apiRequest<Taxonomy[]>("/api/admin/products/categories"),
    apiRequest<Taxonomy[]>("/api/admin/products/deities"),
    apiRequest<Taxonomy[]>("/api/admin/products/materials"),
    apiRequest<AdminList<ContactMessage> | ContactMessage[]>("/api/admin/contact/message?page_size=5"),
    apiRequest<AdminList<ContactMessage> | ContactMessage[]>("/api/admin/contact/message?page_size=5&status=new"),
    apiRequest<AdminList<CustomRequest> | CustomRequest[]>("/api/admin/contact/customize?page_size=5"),
    apiRequest<AdminList<Review> | Review[]>("/api/admin/reviews?page_size=5"),
    apiRequest<AdminList<Review> | Review[]>("/api/admin/reviews?page_size=5&status=pending"),
    apiRequest<FAQ[] | { items?: FAQ[] }>("/api/admin/faqs"),
    apiRequest<AdminList<StaffMember> | StaffMember[]>("/api/admin/staff?page_size=5"),
  ]);

  return {
    products: asAdminList(products),
    categories,
    deities,
    materials,
    messages: asAdminList(messages),
    newMessages: asAdminList(newMessages),
    customRequests: asAdminList(customRequests),
    reviews: asAdminList(reviews),
    pendingReviews: asAdminList(pendingReviews),
    faqs: Array.isArray(faqs) ? faqs : faqs.items ?? [],
    staff: asAdminList(staff),
  };
}
