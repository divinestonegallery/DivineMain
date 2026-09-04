// @ts-nocheck
export type CatalogCategory = string;

export type CatalogItem = {
  id: string;
  backendId?: string | number | null;
  slug: string;
  uid?: string | null;
  name: string;
  deity: string;
  category: CatalogCategory;
  height: number;
  material: string;
  finish: string;
  image: string;
  imageAlt: string;
  gallery?: Array<{ src: string; alt: string }>;
  featured: number;
  description: string;
  availability?: string | null;
  status?: string | null;
  variantId?: string;
  sku?: string;
  pricePaise?: number | null;
  gstRateBps?: number | null;
  stockQuantity?: number;
  inventoryKind?: "unique" | "repeatable";
  salesMode?: "direct" | "quote" | "both";
  weightMinGrams?: number | null;
  weightGrams?: number | null;
};
