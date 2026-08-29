// @ts-nocheck
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/src/config/site";
import { catalogItems } from "@/components/Catalog/catalog-data";
import { guides } from "@/components/Guides/guide-data";
import { listPublishedPages } from "@/api/cms/public-repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const staticRoutes = ["", "/shop", "/custom-murti", "/our-story", "/artisans", "/guides", "/contact", "/faq", "/shipping", "/privacy", "/terms", "/returns"];
  const managed = await listPublishedPages();
  const existing = new Set(staticRoutes.map((route) => route.replace(/^\//, "") || "home"));

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      changeFrequency: route === "" || route === "/shop" ? "weekly" as const : "monthly" as const,
      priority: route === "" ? 1 : route === "/shop" ? 0.9 : 0.7,
    })),
    ...catalogItems.map((item) => ({ url: `${siteUrl}/products/${item.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...guides.map((guide) => ({ url: `${siteUrl}/guides/${guide.slug}`, changeFrequency: "monthly" as const, priority: 0.65 })),
    ...managed.filter((page) => !existing.has(page.slug)).map((page) => ({ url: `${siteUrl}/${page.slug}`, lastModified: new Date(page.updatedAt * 1000), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
