// @ts-nocheck
const PRODUCTION_SITE_URL = "https://divinestonegallery.com";

function normalizeSiteUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function isUnsafeProductionOrigin(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "dev.divinestonegallery.com";
  } catch {
    return true;
  }
}

export function getSiteUrl() {
  const configured = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  // Vercel production must always emit the public origin. Preview and local
  // development keep NEXT_PUBLIC_SITE_URL, including the dev domain.
  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }

  // A local production build has no VERCEL_ENV. Refuse localhost and the dev
  // domain so those hosts cannot become canonical, sitemap, or JSON-LD URLs.
  // Preview deployments set VERCEL_ENV and keep NEXT_PUBLIC_SITE_URL.
  if (!process.env.VERCEL_ENV && process.env.NODE_ENV === "production" && (!configured || isUnsafeProductionOrigin(configured))) {
    return PRODUCTION_SITE_URL;
  }

  return configured || "http://localhost:3000";
}
