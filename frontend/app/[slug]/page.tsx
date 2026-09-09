import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPage } from "@/api/cms/public-repository";
import { PublishedPageView } from "@/components/CMS/published-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const page = await getPublishedPage(slug);
  if (!page) return {};
  return { title: page.seoTitle ?? page.title, description: page.seoDescription ?? undefined, alternates: { canonical: `/${page.slug}` } };
}

export default async function ManagedPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const page = await getPublishedPage(slug);
  if (!page || !page.sections.length) notFound();
  return <PublishedPageView page={page} />;
}
