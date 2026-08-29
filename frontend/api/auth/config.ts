// @ts-nocheck
export type ClerkConfiguration = {
  publishableKey: string;
  secretKey: string;
  jwtKey?: string;
};

export function getClerkConfiguration(): ClerkConfiguration | null {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  const jwtKey = process.env.CLERK_JWT_KEY?.trim();

  if (!publishableKey || !secretKey) return null;

  return { publishableKey, secretKey, jwtKey: jwtKey || undefined };
}

export function getClerkPublishableKey() {
  return getClerkConfiguration()?.publishableKey ?? null;
}

export function getAllowedAuthOrigins() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return [
    "http://localhost:3000",
    "https://divinestonegallery.com",
    ...(configuredSiteUrl ? [configuredSiteUrl] : []),
  ].filter((origin, index, origins) => origins.indexOf(origin) === index);
}
