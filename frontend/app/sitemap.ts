// @ts-nocheck
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/src/config/site";
import { getPublicCatalogListing } from "@/api/catalog/repository";
import { guides } from "@/components/Guides/guide-data";
import { listPublishedPages } from "@/api/cms/public-repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const staticRoutes = ["", "/shop", "/custom-murti", "/our-story", "/artisans", "/guides", "/contact", "/faq", "/shipping", "/privacy", "/terms", "/returns"];
  const managed = await listPublishedPages();
  const catalog = await getPublicCatalogListing({ page_size: 100, sort: "display_order" }).catch(() => ({ items: [] }));
  const existing = new Set(staticRoutes.map((route) => route.replace(/^\//, "") || "home"));

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      changeFrequency: route === "" || route === "/shop" ? "weekly" as const : "monthly" as const,
      priority: route === "" ? 1 : route === "/shop" ? 0.9 : 0.7,
    })),
    ...catalog.items.map((item) => ({ url: `${siteUrl}/products/${item.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...guides.map((guide) => ({ url: `${siteUrl}/guides/${guide.slug}`, changeFrequency: "monthly" as const, priority: 0.65 })),
    ...managed.filter((page) => !existing.has(page.slug)).map((page) => ({ url: `${siteUrl}/${page.slug}`, lastModified: new Date(page.updatedAt * 1000), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
