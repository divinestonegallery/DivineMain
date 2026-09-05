// @ts-nocheck
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type { PublicCatalogOption } from "@/api/catalog/repository";
import type { ProductListResult } from "@/api/products";
import type { CatalogItem } from "./catalog-data";
import styles from "./shop-catalog.module.css";

type Filters = {
  category: string;
  deity: string;
  material: string;
  availability: string;
  min_price: string;
  max_price: string;
};

type SortValue = "featured" | "display_order" | "newest" | "oldest" | "price_asc" | "price_desc";

const emptyFilters: Filters = { category: "", deity: "", material: "", availability: "", min_price: "", max_price: "" };
const allOption: PublicCatalogOption = { label: "All", value: "" };
const availabilityOptions: PublicCatalogOption[] = [
  allOption,
  { label: "In stock", value: "in_stock" },
  { label: "Made to order", value: "made_to_order" },
  { label: "Out of stock", value: "out_of_stock" },
];
const sortOptions: Array<{ label: string; value: SortValue }> = [
  { label: "Featured", value: "featured" },
  { label: "Gallery order", value: "display_order" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Price: low to high", value: "price_asc" },
  { label: "Price: high to low", value: "price_desc" },
];

function mergeOptions(options: PublicCatalogOption[], currentValue: string) {
  const seen = new Set<string>();
  const merged = [allOption, ...options]
    .filter((option) => option.label && option.value !== undefined)
    .filter((option) => {
      const key = option.value || "__all";
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (currentValue && !seen.has(currentValue)) {
    merged.push({ label: currentValue, value: currentValue });
  }

  return merged;
}

function FilterControls({
  filters,
  onFilterChange,
  categories,
  deities,
  materials,
}: {
  filters: Filters;
  onFilterChange: (name: keyof Filters, value: string) => void;
  categories: PublicCatalogOption[];
  deities: PublicCatalogOption[];
  materials: PublicCatalogOption[];
}) {
  return (
    <div className={styles.filterControls}>
      <div className={styles.filterGroup}>
        <span>Category</span>
        <CatalogDropdown label="Category" value={filters.category} options={categories} onChange={(value) => onFilterChange("category", value)} controlClassName={styles.filterDropdown} />
      </div>
      <div className={styles.filterGroup}>
        <span>Deity</span>
        <CatalogDropdown label="Deity" value={filters.deity} options={deities} onChange={(value) => onFilterChange("deity", value)} controlClassName={styles.filterDropdown} />
      </div>
      <div className={styles.filterGroup}>
        <span>Material</span>
        <CatalogDropdown label="Material" value={filters.material} options={materials} onChange={(value) => onFilterChange("material", value)} controlClassName={styles.filterDropdown} />
      </div>
      <div className={styles.filterGroup}>
        <span>Availability</span>
        <CatalogDropdown label="Availability" value={filters.availability} options={availabilityOptions} onChange={(value) => onFilterChange("availability", value)} controlClassName={styles.filterDropdown} />
      </div>
      <label>
        <span>Minimum price</span>
        <input value={filters.min_price} onChange={(event) => onFilterChange("min_price", event.target.value)} min="0" inputMode="decimal" type="number" placeholder="100" />
      </label>
      <label>
        <span>Maximum price</span>
        <input value={filters.max_price} onChange={(event) => onFilterChange("max_price", event.target.value)} min="0" inputMode="decimal" type="number" placeholder="5000" />
      </label>
    </div>
  );
}

function ProductCard({ item }: { item: CatalogItem }) {
  const heightDetail = item.height > 0 ? ` (${item.height} inch)` : "";
  const whatsappText = encodeURIComponent(`Namaste, I would like details about the ${item.name}${heightDetail}.`);

  return (
    <article className={styles.productCard}>
      <div className={styles.productMedia}>
        <Link href={`/products/${item.slug}`} aria-label={`View ${item.name}`}>
          <Image src={item.image} alt={`${item.name}, hand-carved marble work`} fill sizes="(max-width: 680px) 50vw, (max-width: 1050px) 33vw, 25vw" unoptimized={/^https?:\/\//i.test(item.image)} />
        </Link>
        {item.height > 0 ? <span className={styles.heightBadge}>{item.height}&quot;</span> : null}

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

function CatalogDropdown({
  label,
  value,
  options,
  onChange,
  disabled,
  inlineLabel,
  controlClassName = "",
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  inlineLabel?: string;
  controlClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const currentIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const currentOption = options[currentIndex] ?? options[0] ?? { label: "Choose", value: "" };

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function focusOption(index: number) {
    if (!options.length) return;
    window.requestAnimationFrame(() => optionRefs.current[index]?.focus());
  }

  function openMenu(index = currentIndex) {
    if (disabled) return;
    setOpen(true);
    focusOption(index);
  }

  function selectOption(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(currentIndex);
    }
  }

  function handleOptionKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!options.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption((index + 1) % options.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption((index - 1 + options.length) % options.length);
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusOption(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      focusOption(options.length - 1);
    }
  }

  return (
    <div className={`${styles.sortControl} ${controlClassName} ${open ? styles.sortControlOpen : ""}`} ref={rootRef}>
      {inlineLabel ? <span>{inlineLabel}</span> : null}
      <button
        type="button"
        className={styles.sortTrigger}
        aria-label={`${label}: ${currentOption.label}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
      >
        <span>{currentOption.label}</span>
        <ChevronDown className={styles.sortChevron} aria-hidden="true" size={18} />
      </button>
      {open ? (
        <div className={styles.sortMenu} id={listboxId} role="listbox" aria-label={label}>
          {options.map((option, index) => {
            const selected = option.value === value;

            return (
              <button
                type="button"
                className={`${styles.sortOption} ${selected ? styles.sortOptionActive : ""}`}
                role="option"
                aria-selected={selected}
                key={option.value}
                onClick={() => selectOption(option.value)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                ref={(node) => { optionRefs.current[index] = node; }}
              >
                <span>{option.label}</span>
                {selected ? <Check aria-hidden="true" size={16} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ShopCatalog({
  breadcrumbs,
  products,
  pagination,
  availableCategories = [],
  availableDeities = [],
  availableMaterials = [],
  currentFilters = emptyFilters,
  currentQuery = "",
  currentSort = "featured",
  errorMessage = null,
}: {
  breadcrumbs: ReactNode;
  products: CatalogItem[];
  pagination: ProductListResult["pagination"];
  availableCategories?: PublicCatalogOption[];
  availableDeities?: PublicCatalogOption[];
  availableMaterials?: PublicCatalogOption[];
  currentFilters?: Filters;
  currentQuery?: string;
  currentSort?: SortValue;
  errorMessage?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [filterOpen, setFilterOpen] = useState(false);
  const categories = useMemo(() => mergeOptions(availableCategories, currentFilters.category), [availableCategories, currentFilters.category]);
  const deities = useMemo(() => mergeOptions(availableDeities, currentFilters.deity), [availableDeities, currentFilters.deity]);
  const materials = useMemo(() => mergeOptions(availableMaterials, currentFilters.material), [availableMaterials, currentFilters.material]);
  const activeFilterCount = Object.values(currentFilters).filter(Boolean).length;
  const totalItems = pagination.total_items ?? products.length;
  const page = pagination.page ?? 1;
  const totalPages = pagination.total_pages ?? 0;
  const hasPreviousPage = Boolean(pagination.has_previous_page ?? page > 1);
  const hasNextPage = Boolean(pagination.has_next_page ?? (totalPages ? page < totalPages : false));

  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    params.delete("search");

    const nextQuery = params.toString();
    startTransition(() => {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    });
  }, [pathname, router, searchParams]);

  function updateFilter(name: keyof Filters, value: string) {
    updateUrl({ [name]: value || null, page: null });
  }

  function updateSort(value: SortValue) {
    updateUrl({ sort: value === "featured" ? null : value, page: null });
  }

  function goToPage(nextPage: number) {
    updateUrl({ page: nextPage > 1 ? String(nextPage) : null });
  }

  function resetFilters() {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  return (
    <>
      {/* <section className={styles.shopHero}>
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
      </section> */}

      <section className={styles.catalogSection}>
        <div className="site-container">
          <div className={styles.unifiedToolbar}>
            <div className={styles.categoryChips} aria-label="Shop by category">
              {categories.map((category) => (
                <button type="button" key={category.value || "all-categories-chip"} aria-pressed={currentFilters.category === category.value} onClick={() => updateFilter("category", category.value)} disabled={isPending}>
                  {category.label}
                </button>
              ))}
            </div>

            <div className={styles.toolbarActions}>
              <button className={styles.mobileFilterButton} type="button" onClick={() => setFilterOpen(true)}>
                <SlidersHorizontal aria-hidden="true" size={17} /> Filters {activeFilterCount ? <span>{activeFilterCount}</span> : null}
              </button>
              <CatalogDropdown label="Sort collection" inlineLabel="Sort" value={currentSort} options={sortOptions} onChange={(value) => updateSort(value as SortValue)} disabled={isPending} />
            </div>
          </div>

          <div className={styles.catalogLayout}>
            <aside className={styles.filterSidebar} aria-label="Collection filters">
              <div className={styles.filterHeading}>
                <strong>Refine</strong>
                {activeFilterCount ? <button type="button" onClick={resetFilters}>Clear all</button> : null}
              </div>
              <FilterControls filters={currentFilters} onFilterChange={updateFilter} categories={categories} deities={deities} materials={materials} />
              <div className={styles.advisorCard}>
                <Sparkles aria-hidden="true" size={20} />
                <strong className="font-display">Made around your vision</strong>
                <p>Can&apos;t find the exact form or size? Commission a custom murti.</p>
                <Link href="/custom-murti">Explore custom work <ArrowRight aria-hidden="true" size={15} /></Link>
              </div>
            </aside>

            <div className={styles.resultsArea}>
              <div className={styles.resultsCount} role="status" aria-busy={isPending}>
                <span>{isPending ? "Updating collection..." : `${totalItems} ${totalItems === 1 ? "Result" : "Results"}`}</span>
              </div>

              {errorMessage ? (
                <div className={styles.emptyState} role="alert">
                  <Search aria-hidden="true" size={28} />
                  <h2 className="font-display">The collection could not be loaded.</h2>
                  <p>{errorMessage}</p>
                  <button type="button" onClick={() => router.refresh()}>Try again</button>
                </div>
              ) : products.length ? (
                <>
                  <div className={styles.productGrid}>
                    {products.map((item) => (
                      <ProductCard item={item} key={item.id} />
                    ))}
                  </div>
                  {totalPages > 1 ? (
                    <div className={styles.paginationControls} aria-label="Catalogue pagination">
                      <button type="button" onClick={() => goToPage(page - 1)} disabled={!hasPreviousPage || isPending}>Previous</button>
                      <span>Page {page} of {totalPages}</span>
                      <button type="button" onClick={() => goToPage(page + 1)} disabled={!hasNextPage || isPending}>Next</button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className={styles.emptyState}>
                  <Search aria-hidden="true" size={28} />
                  <h2 className="font-display">No results match these filters.</h2>
                  <p>Try a different deity, material or search term—or speak with us about a custom creation.</p>
                  <button type="button" onClick={resetFilters}>Show the full collection</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Modal open={filterOpen} title="Refine collection" onClose={() => setFilterOpen(false)}>
        <FilterControls filters={currentFilters} onFilterChange={updateFilter} categories={categories} deities={deities} materials={materials} />
        <div className={styles.modalActions}>
          <button type="button" onClick={resetFilters}>Clear all</button>
          <button type="button" onClick={() => setFilterOpen(false)}>Show {totalItems} {totalItems === 1 ? "Result" : "Results"}</button>
        </div>
      </Modal>
    </>
  );
}
