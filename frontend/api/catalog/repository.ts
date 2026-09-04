// @ts-nocheck
import type { CatalogItem } from "@/components/Catalog/catalog-data";
import { getCategories, getDeities, getMaterials, getProduct, getProductListing } from "@/api/products";
import type { ProductFilters, ProductListResult, TaxonomyItem } from "@/api/products";

export type PublicCatalogFacets = {
  categories: PublicCatalogOption[];
  deities: PublicCatalogOption[];
  materials: PublicCatalogOption[];
};

export type PublicCatalogOption = {
  label: string;
  value: string;
};

export type PublicCatalogListing = {
  items: CatalogItem[];
  pagination: ProductListResult["pagination"];
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function parseHeight(product: any) {
  const direct = product.height ?? product.size;
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) return direct;
  if (typeof direct === "string" && Number.isFinite(Number(direct)) && Number(direct) > 0) return Number(direct);

  const source = [direct, product.name, product.title].find((value) => typeof value === "string" && value.trim());
  const match = typeof source === "string" ? source.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|inches|")\b/i) : null;
  return match ? Number(match[1]) : 0;
}

function salesMode(value: string | null | undefined): CatalogItem["salesMode"] {
  if (value === "direct_purchase") return "direct";
  if (value === "buy_and_quote") return "both";
  return "quote";
}

function moneyToPaise(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : null;
}

function integerValue(value: unknown, fallback: number | null = null) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function fallbackPagination(page = 1, pageSize = 24): ProductListResult["pagination"] {
  return {
    page,
    page_size: pageSize,
    total_items: 0,
    total_pages: 0,
    has_next_page: false,
    has_previous_page: page > 1,
  };
}

function toCatalogOption(item: TaxonomyItem): PublicCatalogOption {
  return {
    label: text(item.name, item.slug),
    value: text(item.slug, item.name),
  };
}

function productGallery(product: any, fallbackAlt: string) {
  const images = Array.isArray(product.images) ? product.images : [];
  return images
    .filter((item: any) => text(item.image_url))
    .sort((a: any, b: any) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0))
    .map((item: any) => ({
      src: text(item.image_url),
      alt: text(item.alt_text, fallbackAlt),
    }));
}

function toCatalogItem(product: any, index = 0): CatalogItem {
  const slug = text(product.slug, text(product.uid, `product-${index + 1}`));
  const name = text(product.name, text(product.title, "Marble moorti"));
  const imageAlt = `${name} from Divine Stone Gallery`;
  const rawImages = Array.isArray(product.images) ? product.images : [];
  const gallery = productGallery(product, imageAlt);
  const coverImage = rawImages.find((item: any) => item.cover_photo)?.image_url;
  const image = text(product.cover_photo, text(coverImage, gallery[0]?.src ?? "/brand/lotus-mark.jpg"));
  const stockQuantity = integerValue(product.stock_quantity ?? product.stockQuantity, product.availability === "out_of_stock" ? 0 : 1);

  return {
    id: slug,
    backendId: product.id ?? null,
    slug,
    uid: product.uid ?? null,
    name,
    deity: text(product.deity, "Divine form"),
    category: text(product.category, "Marble murti"),
    height: parseHeight(product),
    material: text(product.material, "Marble"),
    finish: "Hand-finished",
    image,
    imageAlt,
    gallery: gallery.length ? gallery : [{ src: image, alt: imageAlt }],
    featured: product.is_featured ? index : index + 10,
    description: text(product.description, text(product.short_description, "A hand-carved marble work from Divine Stone Gallery.")),
    availability: product.availability ?? null,
    status: product.status ?? null,
    pricePaise: integerValue(product.pricePaise ?? product.price_paise, moneyToPaise(product.selling_price)),
    gstRateBps: integerValue(product.gstRateBps ?? product.gst_rate_bps),
    stockQuantity,
    salesMode: salesMode(product.sales_mode),
  };
}

export async function getPublicCatalog(): Promise<CatalogItem[]> {
  const data = await getPublicCatalogListing({ page_size: 100, sort: "display_order" });
  return data.items;
}

export async function getPublicCatalogListing(filters: ProductFilters = {}): Promise<PublicCatalogListing> {
  const data = await getProductListing(filters);
  return {
    items: data.items?.map(toCatalogItem) ?? [],
    pagination: data.pagination ?? fallbackPagination(filters.page, filters.page_size),
  };
}

export async function getPublicCatalogFacets(): Promise<PublicCatalogFacets> {
  const [categories, deities, materials] = await Promise.all([getCategories(), getDeities(), getMaterials()]);
  return {
    categories: categories.map(toCatalogOption),
    deities: deities.map(toCatalogOption),
    materials: materials.map(toCatalogOption),
  };
}

export async function getPublicCatalogItem(slug: string) {
  const product = await getProduct(slug);
  return product ? toCatalogItem(product) : null;
}

export async function getRelatedPublicCatalogItems(item: CatalogItem, count = 3) {
  const items = await getPublicCatalog();
  return items
    .filter((candidate) => candidate.id !== item.id)
    .sort((a, b) => {
      const aMatch = Number(a.category === item.category || a.deity === item.deity);
      const bMatch = Number(b.category === item.category || b.deity === item.deity);
      return bMatch - aMatch || a.featured - b.featured;
    })
    .slice(0, count);
}
