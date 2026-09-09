// @ts-nocheck
export function slugFromName(name: string, fallback: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140) || fallback;
}

export function nextAvailableSlug(baseSlug: string, existingSlugs: Iterable<string>) {
  const existing = new Set(existingSlugs);
  let slug = baseSlug;
  for (let suffix = 2; existing.has(slug); suffix += 1) slug = `${baseSlug}-${suffix}`;
  return slug;
}
