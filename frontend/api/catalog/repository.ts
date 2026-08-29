// @ts-nocheck
import { CatalogItem, catalogItems } from "@/components/Catalog/catalog-data";
import { fetchApi } from "@/api/services/api";

export type PublicCatalogFacets = {
  categories: string[];
  deities: string[];
};

export async function getPublicCatalog(): Promise<CatalogItem[]> {
  try {
    const data = await fetchApi<{ data: CatalogItem[] }>("/products");
    return data.data || catalogItems;
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
    // Assuming backend provides facets or we can extract them
    const data = await fetchApi<any>("/products/facets");
    return data.data || fallback;
  } catch {
    return fallback;
  }
}

export async function getPublicCatalogItem(slug: string) {
  try {
    const data = await fetchApi<{ data: CatalogItem }>(`/products/${slug}`);
    return data.data;
  } catch {
    const items = await getPublicCatalog();
    return items.find((item) => item.slug === slug);
  }
}

export async function getRelatedPublicCatalogItems(item: CatalogItem, count = 3) {
  try {
    const data = await fetchApi<{ data: CatalogItem[] }>(`/products/${item.slug}/related`);
    return data.data.slice(0, count);
  } catch {
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
}

export async function getProductGallery(productId: string, fallbackImage: string, fallbackAlt: string) {
  try {
    const data = await fetchApi<any>(`/products/${productId}/gallery`);
    return data.data || [{ src: fallbackImage, alt: fallbackAlt }];
  } catch {
    return [{ src: fallbackImage, alt: fallbackAlt }];
  }
}
