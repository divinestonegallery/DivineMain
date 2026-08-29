// @ts-nocheck
"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Heart,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useSavedWorks } from "@/components/Customer/device-collections";
import { CatalogItem } from "./catalog-data";
import styles from "./shop-catalog.module.css";

type Filters = {
  category: string;
  deity: string;
  size: string;
};

const initialFilters: Filters = { category: "All", deity: "All", size: "All" };

function FilterControls({ filters, setFilters, categories, deities }: { filters: Filters; setFilters: (filters: Filters) => void; categories: string[]; deities: string[] }) {
  return (
    <div className={styles.filterControls}>
      <label>
        <span>Category</span>
        <select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
          {categories.map((category) => <option value={category} key={category}>{category}</option>)}
        </select>
      </label>
      <label>
        <span>Deity</span>
        <select value={filters.deity} onChange={(event) => setFilters({ ...filters, deity: event.target.value })}>
          {deities.map((deity) => <option value={deity} key={deity}>{deity}</option>)}
        </select>
      </label>
      <label>
        <span>Height</span>
        <select value={filters.size} onChange={(event) => setFilters({ ...filters, size: event.target.value })}>
          <option value="All">All sizes</option>
          <option value="compact">Up to 12 inches</option>
          <option value="medium">13–24 inches</option>
          <option value="large">Above 24 inches</option>
        </select>
      </label>
    </div>
  );
}

function ProductCard({ item, saved, toggleSaved }: { item: CatalogItem; saved: boolean; toggleSaved: () => void }) {
  const whatsappText = encodeURIComponent(`Namaste, I would like details about the ${item.name} (${item.height} inch).`);

  return (
    <article className={styles.productCard}>
      <div className={styles.productMedia}>
        <Link href={`/products/${item.slug}`} aria-label={`View ${item.name}`}>
          <Image src={item.image} alt={`${item.name}, ${item.height}-inch hand-carved marble work`} fill sizes="(max-width: 680px) 50vw, (max-width: 1050px) 33vw, 25vw" />
        </Link>
        <span className={styles.heightBadge}>{item.height}&quot;</span>
        <button className={`${styles.saveButton} ${saved ? styles.saved : ""}`} type="button" onClick={toggleSaved} aria-label={saved ? `Remove ${item.name} from wishlist` : `Save ${item.name} to wishlist`} aria-pressed={saved}>
          <Heart aria-hidden="true" size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className={styles.productInfo}>
        <span>{item.category} · {item.deity}</span>
        <h3 className="font-display"><Link href={`/products/${item.slug}`}>{item.name}</Link></h3>
        <p>{item.material} · {item.finish}</p>
        <div>
          <Link href={`/products/${item.slug}`}>View details <ArrowRight aria-hidden="true" size={15} /></Link>
          <a href={`https://wa.me/919166138566?text=${whatsappText}`} target="_blank" rel="noreferrer">Enquire</a>
        </div>
      </div>
    </article>
  );
}

export function ShopCatalog({ breadcrumbs, products: catalogProducts, availableCategories = [], availableDeities = [] }: { breadcrumbs: ReactNode; products: CatalogItem[]; availableCategories?: string[]; availableDeities?: string[] }) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [sort, setSort] = useState("featured");
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [filterOpen, setFilterOpen] = useState(false);
  const savedWorks = useSavedWorks();
  const { showToast } = useToast();
  const categories = useMemo(() => ["All", ...Array.from(new Set([...availableCategories, ...catalogProducts.map((item) => item.category)]))], [availableCategories, catalogProducts]);
  const deities = useMemo(() => ["All", ...Array.from(new Set([...availableDeities, ...catalogProducts.map((item) => item.deity)]))], [availableDeities, catalogProducts]);

  const products = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = catalogProducts.filter((item) => {
      const matchesCategory = filters.category === "All" || item.category === filters.category;
      const matchesDeity = filters.deity === "All" || item.deity === filters.deity;
      const matchesSize = filters.size === "All"
        || (filters.size === "compact" && item.height <= 12)
        || (filters.size === "medium" && item.height >= 13 && item.height <= 24)
        || (filters.size === "large" && item.height > 24);
      const matchesQuery = !normalizedQuery || [item.name, item.deity, item.category, item.material, item.finish]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);

      return matchesCategory && matchesDeity && matchesSize && matchesQuery;
    });

    return [...result].sort((a, b) => {
      if (sort === "height-low") return a.height - b.height;
      if (sort === "height-high") return b.height - a.height;
      if (sort === "name") return a.name.localeCompare(b.name);
      return a.featured - b.featured;
    });
  }, [catalogProducts, filters, query, sort]);

  const activeFilterCount = Object.values(filters).filter((value) => value !== "All").length;

  function resetFilters() {
    setFilters(initialFilters);
    setQuery("");
  }

  function toggleSaved(item: CatalogItem) {
    const willSave = savedWorks.toggle(item.id);
    showToast(willSave ? `${item.name} added to your wishlist.` : `${item.name} removed from your wishlist.`);
  }

  return (
    <>
      <section className={styles.shopHero}>
        <div className="site-container">
          {breadcrumbs}
          <div className={styles.heroGrid}>
            <div>
              <p className={styles.eyebrow}>The marble collection</p>
              <h1 className="font-display">Sacred works for every space.</h1>
              <p>Explore hand-carved forms for home mandirs, temples, gifting and personal commissions. Each work can be discussed directly with our gallery.</p>
            </div>
            <div className={styles.heroNote}>
              <Sparkles aria-hidden="true" size={22} />
              <span><strong className="font-display">Need help choosing?</strong><small>We can guide you on deity, size, stone and placement.</small></span>
              <a href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20help%20choosing%20a%20moorti." target="_blank" rel="noreferrer">Ask our gallery <ArrowRight aria-hidden="true" size={15} /></a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.catalogSection}>
        <div className="site-container">
          <div className={styles.categoryChips} aria-label="Shop by category">
            {categories.map((category) => (
              <button type="button" key={category} aria-pressed={filters.category === category} onClick={() => setFilters({ ...filters, category })}>
                {category}
              </button>
            ))}
          </div>

          <div className={styles.catalogToolbar}>
            <label className={styles.catalogSearch}>
              <Search aria-hidden="true" size={18} />
              <span className="sr-only">Search collection</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search the collection" />
              {query ? <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X aria-hidden="true" size={17} /></button> : null}
            </label>

            <div className={styles.toolbarActions}>
              <button className={styles.mobileFilterButton} type="button" onClick={() => setFilterOpen(true)}>
                <SlidersHorizontal aria-hidden="true" size={17} /> Filters {activeFilterCount ? <span>{activeFilterCount}</span> : null}
              </button>
              <label className={styles.sortControl}>
                <span>Sort</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="featured">Featured</option>
                  <option value="height-low">Height: low to high</option>
                  <option value="height-high">Height: high to low</option>
                  <option value="name">Name: A–Z</option>
                </select>
                <ChevronDown aria-hidden="true" size={16} />
              </label>
            </div>
          </div>

          <div className={styles.catalogLayout}>
            <aside className={styles.filterSidebar} aria-label="Collection filters">
              <div className={styles.filterHeading}>
                <strong>Refine</strong>
                {activeFilterCount || query ? <button type="button" onClick={resetFilters}>Clear all</button> : null}
              </div>
              <FilterControls filters={filters} setFilters={setFilters} categories={categories} deities={deities} />
              <div className={styles.advisorCard}>
                <Sparkles aria-hidden="true" size={20} />
                <strong className="font-display">Made around your vision</strong>
                <p>Can&apos;t find the exact form or size? Commission a custom murti.</p>
                <Link href="/custom-murti">Explore custom work <ArrowRight aria-hidden="true" size={15} /></Link>
              </div>
            </aside>

            <div className={styles.resultsArea}>
              <div className={styles.resultsCount} role="status">
                <span>{products.length} {products.length === 1 ? "work" : "works"}</span>
                {(activeFilterCount || query) ? <button type="button" onClick={resetFilters}>Reset filters</button> : null}
              </div>

              {products.length ? (
                <div className={styles.productGrid}>
                  {products.map((item) => (
                    <ProductCard item={item} key={item.id} saved={savedWorks.ids.has(item.id)} toggleSaved={() => toggleSaved(item)} />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <Search aria-hidden="true" size={28} />
                  <h2 className="font-display">No works match these filters.</h2>
                  <p>Try a different deity, size or search term—or speak with us about a custom creation.</p>
                  <button type="button" onClick={resetFilters}>Show the full collection</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Modal open={filterOpen} title="Refine collection" onClose={() => setFilterOpen(false)}>
        <FilterControls filters={filters} setFilters={setFilters} categories={categories} deities={deities} />
        <div className={styles.modalActions}>
          <button type="button" onClick={resetFilters}>Clear all</button>
          <button type="button" onClick={() => setFilterOpen(false)}>Show {products.length} {products.length === 1 ? "work" : "works"}</button>
        </div>
      </Modal>
    </>
  );
}
