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
  const source = `${product.height || product.size || product.title || product.name || ""}`;
  const match = source.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function salesMode(value: string | null | undefined): CatalogItem["salesMode"] {
  if (value === "direct_purchase") return "direct";
  if (value === "buy_and_quote") return "both";
  return "quote";
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

function toCatalogItem(product: any, index = 0): CatalogItem {
  const slug = text(product.slug, text(product.uid, `product-${index + 1}`));
  const name = text(product.title, text(product.name, "Marble moorti"));
  const image = text(product.cover_photo, product.images?.find((item: any) => item.cover_photo)?.image_url ?? product.images?.[0]?.image_url ?? "/brand/lotus-mark.jpg");

  return {
    id: slug,
    slug,
    name,
    deity: text(product.deity, "Divine form"),
    category: text(product.category, "Marble murti"),
    height: parseHeight(product),
    material: text(product.material, "Marble"),
    finish: "Hand-finished",
    image,
    imageAlt: `${name} from Divine Stone Gallery`,
    featured: product.is_featured ? index : index + 10,
    description: text(product.short_description, text(product.description, "A hand-carved marble work from Divine Stone Gallery.")),
    stockQuantity: product.availability === "out_of_stock" ? 0 : 1,
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
  try {
    return toCatalogItem(await getProduct(slug));
  } catch {
    const items = await getPublicCatalog();
    return items.find((item) => item.slug === slug);
  }
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

export async function getProductGallery(productId: string, fallbackImage: string, fallbackAlt: string) {
  try {
    const product = await getProduct(productId);
    const images = product.images
      ?.filter((item: any) => item.image_url)
      .map((item: any) => ({ src: item.image_url, alt: item.alt_text || fallbackAlt })) ?? [];
    return images.length ? images : [{ src: fallbackImage, alt: fallbackAlt }];
  } catch {
    return [{ src: fallbackImage, alt: fallbackAlt }];
  }
}
