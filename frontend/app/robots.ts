// @ts-nocheck
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/src/config/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account",
        "/admin",
        "/api",
        "/cart",
        "/checkout",
        "/sign-in",
        "/sign-up",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
