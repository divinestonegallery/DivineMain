// @ts-nocheck
import type { Metadata } from "next";
import { ReactNode, Suspense } from "react";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { WhatsAppAssistance } from "@/components/common/whatsapp-assistance";
import { ToastProvider } from "@/components/ui/toast";
import { getPublicCatalogFacets, getPublicCatalogListing } from "@/api/catalog/repository";
import type { PublicCatalogFacets } from "@/api/catalog/repository";
import type { ProductFilters, ProductListResult } from "@/api/products";
import { ShopCatalog } from "@/components/Catalog/shop-catalog";

export const metadata: Metadata = {
  title: "Shop Marble Moorties",
  description:
    "Explore hand-carved marble moorties for home mandirs, temples and custom sacred spaces from Divine Stone Gallery.",
  alternates: { canonical: "/shop" },
};

// Catalogue changes made in Admin must be visible on the next storefront request.
export const dynamic = "force-dynamic";

type ShopSearchParams = Promise<Record<string, string | string[] | undefined>>;

const supportedSorts = new Set(["featured", "display_order", "newest", "oldest"]);
const emptyFacets: PublicCatalogFacets = { categories: [], deities: [], materials: [] };
const emptyPagination: ProductListResult["pagination"] = {
  page: 1,
  page_size: 24,
  total_items: 0,
  total_pages: 0,
  has_next_page: false,
  has_previous_page: false,
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0]?.trim() ?? "" : value?.trim() ?? "";
}

function positivePage(value: string) {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function shopFiltersFromSearchParams(params: Record<string, string | string[] | undefined>) {
  const query = firstParam(params.q) || firstParam(params.search);
  const sort = firstParam(params.sort);
  const page = positivePage(firstParam(params.page));
  const category = firstParam(params.category);
  const deity = firstParam(params.deity);
  const material = firstParam(params.material);

  const apiFilters: ProductFilters = {
    page,
    search: query || undefined,
    category: category || undefined,
    deity: deity || undefined,
    material: material || undefined,
    sort: supportedSorts.has(sort) ? sort as ProductFilters["sort"] : "featured",
  };

  return {
    apiFilters,
    currentFilters: { category, deity, material },
    currentQuery: query,
    currentSort: apiFilters.sort ?? "featured",
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The shop data could not be loaded.";
}

async function ShopCatalogData({ searchParams, breadcrumbs }: { searchParams: ShopSearchParams; breadcrumbs: ReactNode }) {
  const params = await searchParams;
  const { apiFilters, currentFilters, currentQuery, currentSort } = shopFiltersFromSearchParams(params);

  const [catalogResult, facetsResult] = await Promise.allSettled([
    getPublicCatalogListing(apiFilters),
    getPublicCatalogFacets(),
  ]);

  if (catalogResult.status === "rejected") {
    console.error("Shop product API request failed:", catalogResult.reason);
  }

  if (facetsResult.status === "rejected") {
    console.error("Shop taxonomy API request failed:", facetsResult.reason);
  }

  const catalog = catalogResult.status === "fulfilled" ? catalogResult.value : { items: [], pagination: emptyPagination };
  const facets = facetsResult.status === "fulfilled" ? facetsResult.value : emptyFacets;
  const error = catalogResult.status === "rejected" ? errorMessage(catalogResult.reason) : null;

  return (
    <ShopCatalog
      products={catalog.items}
      pagination={catalog.pagination}
      availableCategories={facets.categories}
      availableDeities={facets.deities}
      availableMaterials={facets.materials}
      currentFilters={currentFilters}
      currentQuery={currentQuery}
      currentSort={currentSort}
      errorMessage={error}
      breadcrumbs={breadcrumbs}
    />
  );
}

export default async function ShopPage({ searchParams }: { searchParams: ShopSearchParams }) {
  return (
    <ToastProvider>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <Suspense fallback={<div className="site-container" aria-live="polite">Preparing the marble collection…</div>}>
          <ShopCatalogData searchParams={searchParams} breadcrumbs={<Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />} />
        </Suspense>
      </main>
      <SiteFooter />
      
      <CookieConsent />
    </ToastProvider>
  );
}
