// @ts-nocheck
import { apiRequest } from "./client";
import type { ProductCard, ProductDetail } from "@/src/types/product";

export type { ProductCard, ProductDetail } from "@/src/types/product";

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
    deities?: Array<{
      deity_id: number;
      deity_name: string;
      deity_slug: string;
      products: ProductCard[];
    }>;
    reviews?: Array<Record<string, unknown>>;
  };
}

export interface HomeData {
  blocks: HomeBlock[];
}

export interface SearchData {
  products: ProductCard[];
  categories: TaxonomyItem[];
  deities: TaxonomyItem[];
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

export function getHome() {
  return apiRequest<HomeData>("/api/v1/application/home");
}

export function searchApplication(query: string) {
  return apiRequest<SearchData>(`/api/v1/application/search?q=${encodeURIComponent(query)}`);
}
