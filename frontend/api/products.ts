import { apiRequest } from "./client";

export interface BackendProductImage {
  image_url?: string | null;
  alt_text?: string | null;
  display_order?: number | null;
  cover_photo?: boolean | null;
  width?: number | null;
  height?: number | null;
}

export interface ProductDetail {
  id: number | string;
  category?: string | null;
  material?: string | null;
  deity?: string | null;
  images?: BackendProductImage[];
  availability?: "in_stock" | "made_to_order" | "out_of_stock" | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  name?: string | null;
  title?: string | null;
  slug: string;
  uid?: string | null;
  short_description?: string | null;
  description?: string | null;
  keywords?: string | null;
  is_featured?: boolean;
  status?: string | null;
  sales_mode?: "quote_only" | "buy_and_quote" | "direct_purchase" | string | null;
  display_order?: number | null;
  size?: string | number | null;
  height?: string | number | null;
  cover_photo?: string | null;
  image_url?: string | null;
  selling_price?: string | number | null;
  original_price?: string | number | null;
}

export interface ProductCard {
  slug: string;
  uid?: string | null;
  name?: string | null;
  title?: string | null;
  short_description?: string | null;
  category?: string | null;
  material?: string | null;
  deity?: string | null;
  size?: string | null;
  images?: BackendProductImage[];
  cover_photo?: string | null;
  selling_price?: string | number | null;
  original_price?: string | number | null;
  sales_mode?: "quote_only" | "buy_and_quote" | "direct_purchase" | string | null;
  availability?: "in_stock" | "made_to_order" | "out_of_stock" | string | null;
  is_featured?: boolean;
}

export interface ProductFilters {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  material?: string;
  deity?: string;
  availability?: "in_stock" | "made_to_order" | "out_of_stock";
  min_price?: number | string;
  max_price?: number | string;
  sort?: "newest" | "oldest" | "featured" | "price_asc" | "price_desc" | "display_order";
}

export interface TaxonomyItem {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
}

export interface HomeDeityGroup {
  deity_id?: number;
  diety_id?: number;
  deity_name?: string;
  diety_name?: string;
  deity_slug?: string;
  diety_slug?: string;
  products: ProductCard[];
}

export interface ReviewCard {
  id: number;
  product?: number | string | null;
  rating?: number | null;
  comment?: string | null;
  created_at?: string | null;
}

export interface ProductListResult {
  items: ProductCard[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next_page?: boolean;
    has_previous_page?: boolean;
  };
}

type ProductListPayload = {
  items?: ProductCard[];
  products?: ProductCard[];
  results?: ProductCard[];
  pagination?: Partial<ProductListResult["pagination"]>;
  page?: number | string;
  page_size?: number | string;
  total?: number | string;
  count?: number | string;
  total_items?: number | string;
  total_pages?: number | string;
  has_next_page?: boolean;
  has_previous_page?: boolean;
};

export interface HomeBlock {
  type: string;
  data: {
    title?: string;
    products?: ProductCard[];
    categories?: TaxonomyItem[];
    deities?: HomeDeityGroup[];
    dieties?: HomeDeityGroup[];
    reviews?: ReviewCard[];
  };
}

export interface HomeData {
  blocks: HomeBlock[];
}

export interface SearchData {
  products: ProductCard[];
  categories: TaxonomyItem[];
  deities: TaxonomyItem[];
  dieties?: TaxonomyItem[];
}

function toProductRequestBody(filters: ProductFilters = {}) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ) as ProductFilters;
}

function numberValue(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeProductListResult(payload: ProductListPayload, filters: ProductFilters = {}): ProductListResult {
  const items = payload.items ?? payload.products ?? payload.results ?? [];
  const pagination = payload.pagination ?? {};
  const page = numberValue(pagination.page ?? payload.page, filters.page ?? 1);
  const pageSize = numberValue(pagination.page_size ?? payload.page_size, filters.page_size ?? 24);
  const totalItems = numberValue(
    pagination.total_items ?? payload.total_items ?? payload.total ?? payload.count,
    items.length,
  );
  const totalPages = numberValue(
    pagination.total_pages ?? payload.total_pages,
    totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0,
  );

  return {
    items,
    pagination: {
      page,
      page_size: pageSize,
      total_items: totalItems,
      total_pages: totalPages,
      has_next_page: pagination.has_next_page ?? payload.has_next_page ?? page < totalPages,
      has_previous_page: pagination.has_previous_page ?? payload.has_previous_page ?? page > 1,
    },
  };
}

export async function getProductListing(filters?: ProductFilters) {
  const requestBody = toProductRequestBody(filters);
  const data = await apiRequest<ProductListPayload>("/api/v1/products", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });
  return normalizeProductListResult(data, requestBody);
}

export function getProducts(filters?: ProductFilters) {
  return getProductListing(filters).then((result) => result.items);
}

export function getProduct(slug: string) {
  return apiRequest<ProductDetail>(`/api/v1/products/${encodeURIComponent(slug)}`);
}

export function getCategories() {
  return apiRequest<TaxonomyItem[]>("/api/v1/products/categories");
}

export function getMaterials() {
  return apiRequest<TaxonomyItem[]>("/api/v1/products/materials");
}

export function getDeities() {
  return apiRequest<TaxonomyItem[]>("/api/v1/products/deities");
}

export async function getHome() {
  return apiRequest<HomeData>("/api/v1/application/home");
}

export function searchApplication(query: string) {
  return apiRequest<SearchData>(`/api/v1/application/search?q=${encodeURIComponent(query)}`);
}
