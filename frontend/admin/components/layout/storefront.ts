export function storefrontHref(path: string) {
  const base = (process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "").trim().replace(/\/+$/, "");
  if (!base) return null;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
