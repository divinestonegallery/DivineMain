// @ts-nocheck
import { fetchApi } from "@/api/services/api";

export type PublishedSection = {
  id: string; sectionKey: string; blockType: "hero" | "rich_text" | "image_text" | "collection" | "feature_grid" | "callout" | "faq";
  eyebrow: string | null; heading: string | null; body: string | null; ctaLabel: string | null; ctaHref: string | null;
  secondaryCtaLabel: string | null; secondaryCtaHref: string | null; mediaPath: string | null; mediaAltText: string | null;
  mediaPosition: "left" | "right" | "background"; contentJson: string; styleVariant: string; sortOrder: number;
};

export type PublishedPage = { id: string; slug: string; title: string; navigationTitle: string | null; seoTitle: string | null; seoDescription: string | null; updatedAt: number; sections: PublishedSection[] };

export async function getPublishedPage(slug: string): Promise<PublishedPage | null> {
  try {
    const data = await fetchApi<any>(`/application/${slug}`);
    // Assume data matches the structure or map it accordingly.
    // If not found, return null to fall back to static rendering.
    return data?.page || null;
  } catch {
    return null;
  }
}

export async function listPublishedPages() {
  return [];
}

export async function getPublishedBusinessSettings() {
  return {};
}
