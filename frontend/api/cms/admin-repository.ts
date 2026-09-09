// @ts-nocheck
// drizzle removed
// schema removed
import { nextAvailableSlug, slugFromName } from "@/api/catalog/slug";

async function database() {
  const { getDb } = await import("@/db");
  return getDb();
}

async function savePageVersion(pageId: string, label: string, actorUserId: string) {
  const db = await database();
  const [[page], sections, [latest]] = await Promise.all([
    db.select().from(sitePages).where(eq(sitePages.id, pageId)).limit(1),
    db.select().from(siteSections).where(eq(siteSections.pageId, pageId)).orderBy(asc(siteSections.sortOrder)),
    db.select({ value: max(sitePageVersions.versionNumber) }).from(sitePageVersions).where(eq(sitePageVersions.pageId, pageId)),
  ]);
  if (!page) return;
  await db.insert(sitePageVersions).values({
    id: `version:${crypto.randomUUID()}`,
    pageId,
    versionNumber: (latest?.value ?? 0) + 1,
    label,
    snapshotJson: JSON.stringify({ page, sections }),
    createdByUserId: actorUserId,
  });
}

export async function listAdminSitePages() {
  const db = await database();
  const [pageRows, sectionRows, mediaRows] = await Promise.all([
    db.select().from(sitePages).orderBy(asc(sitePages.title)),
    db.select({
      id: siteSections.id,
      pageId: siteSections.pageId,
      sectionKey: siteSections.sectionKey,
      blockType: siteSections.blockType,
      eyebrow: siteSections.eyebrow,
      heading: siteSections.heading,
      body: siteSections.body,
      ctaLabel: siteSections.ctaLabel,
      ctaHref: siteSections.ctaHref,
      secondaryCtaLabel: siteSections.secondaryCtaLabel,
      secondaryCtaHref: siteSections.secondaryCtaHref,
      mediaAssetId: siteSections.mediaAssetId,
      mediaPath: mediaAssets.publicPath,
      mediaAltText: mediaAssets.altText,
      mediaPosition: siteSections.mediaPosition,
      contentJson: siteSections.contentJson,
      styleVariant: siteSections.styleVariant,
      sortOrder: siteSections.sortOrder,
      isVisible: siteSections.isVisible,
      createdAt: siteSections.createdAt,
      updatedAt: siteSections.updatedAt,
    }).from(siteSections)
      .leftJoin(mediaAssets, eq(siteSections.mediaAssetId, mediaAssets.id))
      .orderBy(asc(siteSections.pageId), asc(siteSections.sortOrder)),
    db.select({ id: mediaAssets.id, publicPath: mediaAssets.publicPath, altText: mediaAssets.altText, originalFilename: mediaAssets.originalFilename }).from(mediaAssets)
      .where(eq(mediaAssets.status, "ready")).orderBy(asc(mediaAssets.originalFilename)),
  ]);
  return {
    pages: pageRows.map((page) => ({ ...page, sections: sectionRows.filter((section) => section.pageId === page.id) })),
    media: mediaRows.filter((item) => item.publicPath),
  };
}

export type NewSitePage = {
  title: string;
  navigationTitle: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export async function createAdminSitePage(input: NewSitePage, actorUserId: string) {
  const db = await database();
  const id = `page:${crypto.randomUUID()}`;
  const baseSlug = slugFromName(input.title, "page");
  const existingSlugs = (await db.select({ slug: sitePages.slug }).from(sitePages).where(or(eq(sitePages.slug, baseSlug), like(sitePages.slug, `${baseSlug}-%`)))).map((item) => item.slug);
  const slug = nextAvailableSlug(baseSlug, existingSlugs);
  const pageInput = { ...input, slug };
  await db.batch([
    db.insert(sitePages).values({ id, ...pageInput, status: "draft", isSystem: false }),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "site_page.created", entityType: "site_page", entityId: id, changesJson: JSON.stringify(pageInput) }),
  ]);
  return listAdminSitePages();
}

export type SitePagePatch = Partial<NewSitePage & {
  status: "draft" | "published" | "archived";
}>;

export async function updateAdminSitePage(id: string, patch: SitePagePatch, actorUserId: string) {
  const db = await database();
  await savePageVersion(id, patch.status === "published" ? "Before publishing" : "Before page update", actorUserId);
  await db.batch([
    db.update(sitePages).set({
      ...patch,
      ...(patch.status === "published" ? { publishedAt: sql`coalesce(${sitePages.publishedAt}, extract(epoch from now())::integer)` } : {}),
      updatedAt: sql`(extract(epoch from now())::integer)`,
    }).where(eq(sitePages.id, id)),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "site_page.updated", entityType: "site_page", entityId: id, changesJson: JSON.stringify(patch) }),
  ]);
  return listAdminSitePages();
}

export type NewSiteSection = {
  pageId: string;
  sectionKey: string;
  blockType: "hero" | "rich_text" | "image_text" | "collection" | "feature_grid" | "callout" | "faq";
  eyebrow: string | null;
  heading: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaHref: string | null;
  mediaAssetId: string | null;
  mediaPosition: "left" | "right" | "background";
  contentJson: string;
  styleVariant: string;
  sortOrder: number;
  isVisible: boolean;
};

export async function createAdminSiteSection(input: NewSiteSection, actorUserId: string) {
  const db = await database();
  const id = `section:${crypto.randomUUID()}`;
  await savePageVersion(input.pageId, "Before adding section", actorUserId);
  await db.batch([
    db.insert(siteSections).values({ id, ...input }),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "site_section.created", entityType: "site_section", entityId: id, changesJson: JSON.stringify(input) }),
  ]);
  return listAdminSitePages();
}

export type SiteSectionPatch = Partial<Omit<NewSiteSection, "pageId">>;

export async function updateAdminSiteSection(id: string, patch: SiteSectionPatch, actorUserId: string) {
  const db = await database();
  const [section] = await db.select({ pageId: siteSections.pageId }).from(siteSections).where(eq(siteSections.id, id)).limit(1);
  if (section) await savePageVersion(section.pageId, "Before section update", actorUserId);
  await db.batch([
    db.update(siteSections).set({ ...patch, updatedAt: sql`(extract(epoch from now())::integer)` }).where(eq(siteSections.id, id)),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "site_section.updated", entityType: "site_section", entityId: id, changesJson: JSON.stringify(patch) }),
  ]);
  return listAdminSitePages();
}

export async function duplicateAdminSiteSection(id: string, actorUserId: string) {
  const db = await database();
  const [source] = await db.select().from(siteSections).where(eq(siteSections.id, id)).limit(1);
  if (!source) throw new Error("SECTION_NOT_FOUND");
  await savePageVersion(source.pageId, "Before section duplication", actorUserId);
  const copyId = `section:${crypto.randomUUID()}`;
  const copyKey = `${source.sectionKey}-copy-${crypto.randomUUID().slice(0, 5)}`;
  await db.batch([
    db.insert(siteSections).values({
      ...source,
      id: copyId,
      sectionKey: copyKey,
      heading: source.heading ? `${source.heading} (copy)` : null,
      sortOrder: source.sortOrder + 1,
      isVisible: false,
      createdAt: sql`(extract(epoch from now())::integer)`,
      updatedAt: sql`(extract(epoch from now())::integer)`,
    }),
    db.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "site_section.duplicated", entityType: "site_section", entityId: copyId, changesJson: JSON.stringify({ sourceId: id }) }),
  ]);
  return listAdminSitePages();
}

export async function listPageVersions(pageId: string) {
  const db = await database();
  return db.select({ id: sitePageVersions.id, pageId: sitePageVersions.pageId, versionNumber: sitePageVersions.versionNumber, label: sitePageVersions.label, createdAt: sitePageVersions.createdAt })
    .from(sitePageVersions).where(eq(sitePageVersions.pageId, pageId)).orderBy(desc(sitePageVersions.versionNumber)).limit(30);
}

export async function restorePageVersion(versionId: string, actorUserId: string) {
  const db = await database();
  const [version] = await db.select().from(sitePageVersions).where(eq(sitePageVersions.id, versionId)).limit(1);
  if (!version) throw new Error("VERSION_NOT_FOUND");
  const snapshot = JSON.parse(version.snapshotJson) as { page: typeof sitePages.$inferSelect; sections: Array<typeof siteSections.$inferSelect> };
  await savePageVersion(version.pageId, `Before restoring version ${version.versionNumber}`, actorUserId);
  await db.transaction(async (tx) => {
    await tx.update(sitePages).set({
      title: snapshot.page.title, slug: snapshot.page.slug, navigationTitle: snapshot.page.navigationTitle,
      status: snapshot.page.status, seoTitle: snapshot.page.seoTitle, seoDescription: snapshot.page.seoDescription,
      publishedAt: snapshot.page.publishedAt, updatedAt: sql`(extract(epoch from now())::integer)`,
    }).where(eq(sitePages.id, version.pageId));
    await tx.delete(siteSections).where(eq(siteSections.pageId, version.pageId));
    if (snapshot.sections.length) await tx.insert(siteSections).values(snapshot.sections.map((section) => ({ ...section, updatedAt: sql`(extract(epoch from now())::integer)` })));
    await tx.insert(auditLogs).values({ id: crypto.randomUUID(), actorUserId, action: "site_page.version_restored", entityType: "site_page", entityId: version.pageId, changesJson: JSON.stringify({ versionId, versionNumber: version.versionNumber }) });
  });
  return listAdminSitePages();
}

export async function pagePreviewData(pageId: string) {
  const data = await listAdminSitePages();
  return data.pages.find((page) => page.id === pageId) ?? null;
}
