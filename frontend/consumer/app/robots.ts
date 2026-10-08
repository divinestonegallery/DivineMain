// @ts-nocheck
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account",
        "/api",
        "/cart",
        "/checkout",
        "/reset-password",
        "/track-order",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
