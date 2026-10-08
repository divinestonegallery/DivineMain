// @ts-nocheck
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/site";
import { getPublicCatalogListing } from "@/api/catalog/repository";
import { guides } from "@/components/guides/guide-data";
import { listPublishedPages } from "@/api/cms/public-repository";

async function listIndexableProducts() {
  const pageSize = 100;
  const items = [];
  const seen = new Set();
  let page = 1;

  while (page <= 100) {
    const catalog = await getPublicCatalogListing({ page, page_size: pageSize, sort: "display_order" });
    const batch = catalog.items ?? [];
    if (!batch.length) break;

    for (const item of batch) {
      if (!item?.slug || seen.has(item.slug)) continue;
      seen.add(item.slug);
      items.push(item);
    }

    const totalPages = catalog.pagination?.total_pages ?? page;
    const hasNext = catalog.pagination?.has_next_page ?? page < totalPages;
    if (!hasNext || page >= totalPages) break;
    page += 1;
  }

  return items;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const staticRoutes = ["", "/shop", "/custom-murti", "/our-story", "/artisans", "/guides", "/contact", "/faq", "/shipping", "/privacy", "/terms", "/returns"];
  const managed = await listPublishedPages();
  const products = await listIndexableProducts().catch(() => []);
  const existing = new Set(staticRoutes.map((route) => route.replace(/^\//, "") || "home"));

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      changeFrequency: route === "" || route === "/shop" ? "weekly" as const : "monthly" as const,
      priority: route === "" ? 1 : route === "/shop" ? 0.9 : 0.7,
    })),
    ...products.map((item) => ({ url: `${siteUrl}/products/${item.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...guides.map((guide) => ({ url: `${siteUrl}/guides/${guide.slug}`, changeFrequency: "monthly" as const, priority: 0.65 })),
    ...managed.filter((page) => !existing.has(page.slug)).map((page) => ({ url: `${siteUrl}/${page.slug}`, lastModified: new Date(page.updatedAt * 1000), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
