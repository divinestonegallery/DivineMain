import { apiRequest, type ApiEnvelope } from "./client";
import type { Product } from "@/src/types/product";
import homeDummyEnvelope from "./home-dummy.json";

export type ProductDetail = Product;

export interface ProductCard {
  slug: string;
  uid?: string | null;
  title: string;
  short_description?: string | null;
  category?: string | null;
  material?: string | null;
  deity?: string | null;
  size?: string | null;
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
  sort?: "price_asc" | "price_desc" | "newest" | "featured";
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
  };
}

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

function toQuery(filters: ProductFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getProductListing(filters?: ProductFilters) {
  return apiRequest<ProductListResult>(`/api/v1/products${toQuery(filters)}`);
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

function dummyHomeData(): HomeData {
  const envelope = homeDummyEnvelope as ApiEnvelope<HomeData>;
  return envelope.data;
}

export async function getHome() {
  try {
    return await apiRequest<HomeData>("/api/v1/application/home");
  } catch {
    // Django is often down during UI checks; keep the home page renderable.
    return dummyHomeData();
  }
}

export function searchApplication(query: string) {
  return apiRequest<SearchData>(`/api/v1/application/search?q=${encodeURIComponent(query)}`);
}
