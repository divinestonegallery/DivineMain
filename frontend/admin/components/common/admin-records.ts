import styles from "./commerce-operations.module.css";

export type AdminPagination = {
  page?: number;
  page_size?: number;
  total_items?: number;
  total_pages?: number;
};

export type AdminList<T> = {
  items?: T[];
  pagination?: AdminPagination;
};

export type NormalizedAdminList<T> = {
  items: T[];
  pagination: AdminPagination;
};

export type ReviewRecord = {
  id: number;
  product?: number;
  user?: number;
  product_name?: string;
  customer_name?: string;
  rating?: number;
  comment?: string;
  status: "pending" | "approved" | "rejected";
  is_approved?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type FAQRecord = {
  id: number;
  question?: string;
  answer?: string;
  category?: string | null;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CustomerRequestBase = {
  id: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  city?: string;
  pincode?: string | null;
  approximate_height?: string | null;
  preferred_material?: string | null;
  description?: string | null;
  reference_image?: string | null;
  reference_object_key?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ContactRequestRecord = CustomerRequestBase & {
  status: "new" | "contacted" | "closed";
  kind: "contact";
};

export type CustomizeRequestRecord = CustomerRequestBase & {
  status: "new" | "contacted" | "quoted" | "accepted" | "closed";
  kind: "customize";
};

export type CustomerRequestRecord = ContactRequestRecord | CustomizeRequestRecord;

export const reviewStatuses = ["pending", "approved", "rejected"] as const;
export const contactStatuses = ["new", "contacted", "closed"] as const;
export const customizeStatuses = ["new", "contacted", "quoted", "accepted", "closed"] as const;
export const contactTransitions = {
  new: ["new", "contacted", "closed"],
  contacted: ["contacted", "closed"],
  closed: ["closed"],
};
export const customizeTransitions = {
  new: ["new", "contacted", "closed"],
  contacted: ["contacted", "quoted", "closed"],
  quoted: ["quoted", "accepted", "closed"],
  accepted: ["accepted", "closed"],
  closed: ["closed"],
};
export const requestPageSize = 25;

export function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value);
}

export function label(value?: string | null) {
  return text(value).replaceAll("_", " ") || "not set";
}

export function when(value?: string) {
  if (!value) return "Recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function asItems<T>(payload: AdminList<T> | T[] | null | undefined) {
  if (!payload) return [];
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

export function asAdminList<T>(payload: AdminList<T> | T[] | null | undefined, page: number, pageSize = requestPageSize): NormalizedAdminList<T> {
  const items = asItems(payload);
  if (!payload || Array.isArray(payload)) {
    return {
      items,
      pagination: {
        page,
        page_size: pageSize,
        total_items: items.length,
        total_pages: items.length ? 1 : 0,
      },
    };
  }
  return {
    items,
    pagination: payload.pagination ?? {
      page,
      page_size: pageSize,
      total_items: items.length,
      total_pages: items.length ? 1 : 0,
    },
  };
}

export function hasAdminRole(user: unknown) {
  const record = user && typeof user === "object" ? user as Record<string, unknown> : {};
  const nested = record.user && typeof record.user === "object" ? record.user as Record<string, unknown> : {};
  const role = text(record.role ?? nested.role).toLowerCase();
  return role === "staff" || role === "admin";
}

export function statusTone(value?: string) {
  if (["approved", "accepted", "closed"].includes(text(value))) return styles.good;
  if (["contacted", "quoted", "pending"].includes(text(value))) return styles.pending;
  return styles.bad;
}

