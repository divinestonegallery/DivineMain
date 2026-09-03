// @ts-nocheck
import { CatalogItem, catalogItems } from "@/components/Catalog/catalog-data";
import { getCategories, getDeities, getProduct, getProductListing } from "@/api/products";

export type PublicCatalogFacets = {
  categories: string[];
  deities: string[];
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
  try {
    const data = await getProductListing({ page_size: 100, sort: "display_order" });
    const items = data.items?.map(toCatalogItem) ?? [];
    return items.length ? items : catalogItems;
  } catch {
    return catalogItems;
  }
}

export async function getPublicCatalogFacets(): Promise<PublicCatalogFacets> {
  const fallback = {
    categories: [...new Set(catalogItems.map((item) => item.category))],
    deities: [...new Set(catalogItems.map((item) => item.deity))],
  };

  try {
    const [categories, deities] = await Promise.all([getCategories(), getDeities()]);
    return {
      categories: categories.map((item) => item.name),
      deities: deities.map((item) => item.name),
    };
  } catch {
    return fallback;
  }
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
