"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleUserRound,
  Heart,
  Home,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { AccountControl } from "@/components/Auth/account-control";
import { useEnquiryBag, useSavedWorks } from "@/components/Customer/device-collections";
import { getDeities, searchApplication } from "@/api/products";
import styles from "./site-shell.module.css";

const defaultDeityLinks = [
  ["Ganesha", "/shop?q=Ganesha"],
  ["Radha Krishna", "/shop?q=Radha%20Krishna"],
  ["Shiva", "/shop?q=Shiva"],
  ["Lakshmi", "/shop?q=Lakshmi"],
  ["Saraswati", "/shop?q=Saraswati"],
  ["View all deities", "/shop"],
] as const;

const materialLinks = [
  ["White Marble", "/shop?q=white%20marble"],
  ["Natural White Finish", "/shop?q=natural%20white"],
  ["Hand-painted Marble", "/shop?q=hand-painted"],
  ["Material Guide", "/guides/materials"],
] as const;

const featuredLinks = [
  ["All Moorties", "/shop"],
  ["Divine Families", "/shop?q=Divine%20Family"],
  ["Wall Sculptures", "/shop?q=Wall%20Sculpture"],
  ["Custom Commissions", "/custom-murti"],
  ["Sizing Guide", "/guides/sizing"],
] as const;

const mainLinks = [
  ["Custom Murti", "/custom-murti"],
  ["Artisans", "/artisans"],
  ["Our Story", "/our-story"],
  ["Guides", "/guides"],
] as const;

type SearchProductResult = {
  slug?: string;
  uid?: string | null;
  title?: string;
  name?: string;
  cover_photo?: string | null;
  image_url?: string | null;
  deity?: string | null;
  category?: string | null;
  material?: string | null;
};

function taxonomyHref(name: string) {
  return `/shop?q=${encodeURIComponent(name)}`;
}

function searchProductTitle(product: SearchProductResult) {
  return product.title?.trim() || product.name?.trim() || "Untitled work";
}

function searchProductImage(product: SearchProductResult) {
  return product.cover_photo?.trim() || product.image_url?.trim() || "";
}

function searchDeities(results: { deities?: Array<{ id?: number; name: string; slug: string }>; dieties?: Array<{ id?: number; name: string; slug: string }> } | null) {
  return results?.deities ?? results?.dieties ?? [];
}

export function SiteHeader({ animateLogo = false }: { animateLogo?: boolean }) {
  const pathname = usePathname();
  const savedWorks = useSavedWorks();
  const enquiryBag = useEnquiryBag();
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [megaMenuClosing, setMegaMenuClosing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dockedSearchVisible, setDockedSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<null | {
    products: SearchProductResult[];
    categories: Array<{ id?: number; name: string; slug: string }>;
    deities?: Array<{ id?: number; name: string; slug: string }>;
    dieties?: Array<{ id?: number; name: string; slug: string }>;
  }>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [logoAnimationFinished, setLogoAnimationFinished] = useState(false);
  const [deityLinks, setDeityLinks] = useState<ReadonlyArray<readonly [string, string]>>(defaultDeityLinks);
  const [isScrolled, setIsScrolled] = useState(false);
  const logoVideoRef = useRef<HTMLVideoElement>(null);
  const shopTriggerRef = useRef<HTMLButtonElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const searchPanelRef = useRef<HTMLElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const searchTitleId = useId();
  const shopMenuId = useId();
  const showDockedSearch = pathname === "/" ? dockedSearchVisible : true;

  function updateSearchQuery(value: string) {
    setSearchQuery(value);
    if (value.trim().length < 2) {
      setSearchResults(null);
      setSearchError(null);
      setSearchLoading(false);
    }
  }

  const closeMegaMenu = useCallback(() => {
    if (megaMenuOpen && !megaMenuClosing) setMegaMenuClosing(true);
  }, [megaMenuClosing, megaMenuOpen]);

  const openMegaMenu = useCallback(() => {
    setMegaMenuClosing(false);
    setMegaMenuOpen(true);
  }, []);

  useEffect(() => {
    if (animateLogo && logoVideoRef.current) logoVideoRef.current.playbackRate = 2.5;
  }, [animateLogo]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDeities()
      .then((items) => {
        if (cancelled) return;
        const names = items.map((item) => item.name?.trim()).filter((name): name is string => Boolean(name));
        if (names.length) {
          setDeityLinks([
            ...names.slice(0, 8).map((name) => [name, `/shop?q=${encodeURIComponent(name)}`] as const),
            ["View all deities", "/shop"],
          ]);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (pathname !== "/") {
      setDockedSearchVisible(true);
      return;
    }

    const heroSearch = document.querySelector<HTMLElement>("[data-hero-search]");
    if (!heroSearch) {
      setDockedSearchVisible(true);
      return;
    }

    const headerOffset = 84;
    const updateDockedSearch = () => {
      const rect = heroSearch.getBoundingClientRect();
      setDockedSearchVisible(rect.bottom <= headerOffset || rect.top >= window.innerHeight);
    };

    if (typeof window.IntersectionObserver === "undefined") {
      updateDockedSearch();
      window.addEventListener("scroll", updateDockedSearch, { passive: true });
      window.addEventListener("resize", updateDockedSearch);
      return () => {
        window.removeEventListener("scroll", updateDockedSearch);
        window.removeEventListener("resize", updateDockedSearch);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => setDockedSearchVisible(!entry.isIntersecting),
      { rootMargin: `-${headerOffset}px 0px 0px 0px`, threshold: 0.1 },
    );

    observer.observe(heroSearch);
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!searchOpen || query.length < 2) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      searchApplication(query)
        .then((results) => {
          if (cancelled) return;
          setSearchResults({
            products: results.products ?? [],
            categories: results.categories ?? [],
            deities: results.deities ?? results.dieties ?? [],
          });
          setSearchError(null);
        })
        .catch((error) => {
          if (cancelled) return;
          setSearchResults(null);
          setSearchError(error instanceof Error ? error.message : "Search is unavailable right now.");
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 240);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchOpen, searchQuery]);

  useEffect(() => {
    const overlayOpen = mobileMenuOpen || searchOpen;
    document.body.style.overflow = overlayOpen ? "hidden" : "";
    const previouslyFocused = overlayOpen && document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = searchOpen ? searchPanelRef.current : mobileMenuOpen ? mobilePanelRef.current : null;
    const focusableSelector = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
    const focusable = panel ? Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)) : [];
    const preferredFocus = searchOpen ? panel?.querySelector<HTMLElement>("input[type='search']") : focusable[0];
    preferredFocus?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        setSearchOpen(false);
        closeMegaMenu();
        return;
      }
      if (!overlayOpen || event.key !== "Tab" || !focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
      if (overlayOpen) previouslyFocused?.focus();
    };
  }, [closeMegaMenu, mobileMenuOpen, searchOpen]);

  useEffect(() => {
    if (!megaMenuOpen) return;

    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (megaMenuRef.current?.contains(target) || shopTriggerRef.current?.contains(target)) return;
      closeMegaMenu();
    };

    document.addEventListener("pointerdown", handleOutsidePointer, true);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer, true);
  }, [closeMegaMenu, megaMenuOpen]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const query = new FormData(form).get("q")?.toString().trim();

    if (!query) {
      event.preventDefault();
    }
  }

  return (
    <>
      <div className={styles.announcementBar}>
        <div className={styles.announcementInner}>
          <span>Fourth-generation master moortikars</span>
          <span aria-hidden="true">•</span>
          <span>Secure delivery across India</span>
          <span aria-hidden="true">•</span>
          <Link href="/custom-murti">Custom commissions</Link>
        </div>
      </div>

      <header
        className={`${styles.siteHeader} ${
          pathname === "/" ? styles.siteHeaderHome : ""
        } ${pathname === "/" && !isScrolled ? styles.siteHeaderTransparent : ""}`}
      >
        <div className={`${styles.headerMain} site-container`}>
          <Link className={styles.brandLink} href="/" aria-label="Divine Stone Gallery home">
            {animateLogo && !logoAnimationFinished ? (
              <>
                <video
                  ref={logoVideoRef}
                  className={styles.brandVideo}
                  autoPlay
                  muted
                  playsInline
                  preload="metadata"
                  poster="/brand/logo-horizontal.jpg"
                  aria-hidden="true"
                  onEnded={() => setLogoAnimationFinished(true)}
                  onError={() => setLogoAnimationFinished(true)}
                >
                  <source src="/brand/logo-animation-horizontal-web.m4v" type="video/mp4" />
                </video>
                <Image className={`${styles.brandLogo} ${styles.brandLogoMotionFallback}`} src="/brand/logo.png" alt="Divine Stone Gallery" width={1600} height={1600} priority />
              </>
            ) : (
              <Image className={styles.brandLogo} src="/brand/logo.png" alt="Divine Stone Gallery" width={1600} height={1600} priority />
            )}
          </Link>

          <div className={styles.headerCenter}>
            <nav className={styles.desktopNav} aria-label="Main navigation">
              {/* <button
                ref={shopTriggerRef}
                className={styles.navLink}
                type="button"
                aria-controls={shopMenuId}
                aria-expanded={megaMenuOpen}
                onClick={() => megaMenuOpen ? closeMegaMenu() : openMegaMenu()}
              >
                <Sparkles aria-hidden="true" size={18} strokeWidth={1.6} />
                <span>Shop Moorti</span>
                <small>New</small>
                <span aria-hidden="true" className={`${styles.chevron} ${megaMenuOpen && !megaMenuClosing ? styles.chevronOpen : ""}`}>⌄</span>
              </button> */}
            </nav>

            <button
              className={`${styles.headerSearchPill} ${showDockedSearch ? styles.headerSearchPillVisible : ""}`.trim()}
              type="button"
              aria-label="Search Divine Stone Gallery"
              aria-expanded={searchOpen}
              aria-hidden={!showDockedSearch}
              tabIndex={showDockedSearch ? 0 : -1}
              onClick={() => setSearchOpen(true)}
            >
              <Search aria-hidden="true" size={19} strokeWidth={1.6} />
              <span>Search for Moorti</span>
              <span className={styles.headerSearchSubmit} aria-hidden="true">
                <Search size={20} strokeWidth={1.8} />
              </span>
            </button>
          </div>

          <div className={styles.headerActions}>
            <a
              className={styles.planButton}
              href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20assistance%20from%20Divine%20Stone%20Gallery."
              target="_blank"
              rel="noreferrer"
              aria-label="Plan with Divine Stone Gallery on WhatsApp"
            >
              <MessageCircle aria-hidden="true" size={18} strokeWidth={1.7} />
              <span className={styles.planTextDesktop}>Plan with Gallery</span>
              <span className={styles.planTextMobile}>Plan</span>
            </a>
            {/* <Link className={`${styles.bookingButton} ${styles.desktopOnlyAction}`} href="/cart" aria-label={`Enquiry bag with ${enquiryBag.count} ${enquiryBag.count === 1 ? "work" : "works"}`}>
              <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.6} />
              <span>Enquiry Bag</span>
              {enquiryBag.count ? <strong>{enquiryBag.count}</strong> : null}
            </Link> */}
            <AccountControl className={`${styles.headerAction} ${styles.desktopOnlyAction}`} />
            <Link className={`${styles.headerAction} ${styles.desktopOnlyAction}`} href="/wishlist" aria-label={`Wishlist with ${savedWorks.count} saved ${savedWorks.count === 1 ? "work" : "works"}`}>
              <Heart aria-hidden="true" size={21} strokeWidth={1.6} />
              {savedWorks.count ? <span className={styles.actionBadge}>{savedWorks.count}</span> : null}
            </Link>
            <button
              className={styles.headerAction}
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu aria-hidden="true" size={23} strokeWidth={1.7} />
            </button>
          </div>
        </div>

        {megaMenuOpen ? (
          <div className={`${styles.megaMenuWrap} ${megaMenuClosing ? styles.megaMenuClosing : ""}`} id={shopMenuId}>
            <button
              className={styles.megaBackdrop}
              type="button"
              aria-label="Close Shop menu"
              onClick={closeMegaMenu}
            />
            <div
              className={`${styles.megaMenu} site-container`}
              ref={megaMenuRef}
              onAnimationEnd={(event) => {
                if (!megaMenuClosing || event.currentTarget !== event.target) return;
                setMegaMenuOpen(false);
                setMegaMenuClosing(false);
              }}
            >
              <div className={styles.megaColumn}>
                <p>Shop by deity</p>
                {deityLinks.map(([label, href]) => (
                  <Link href={href} key={href} onClick={closeMegaMenu}>
                    {label}
                  </Link>
                ))}
              </div>
              <div className={styles.megaColumn}>
                <p>Shop by material</p>
                {materialLinks.map(([label, href]) => (
                  <Link href={href} key={href} onClick={closeMegaMenu}>
                    {label}
                  </Link>
                ))}
              </div>
              <div className={styles.megaColumn}>
                <p>Featured</p>
                {featuredLinks.map(([label, href]) => (
                  <Link href={href} key={href} onClick={closeMegaMenu}>
                    {label}
                  </Link>
                ))}
              </div>
              <Link
                className={styles.megaFeature}
                href="/custom-murti"
                onClick={closeMegaMenu}
              >
                <Sparkles aria-hidden="true" size={24} strokeWidth={1.4} />
                <span>Commission a sacred work</span>
                <small>Created to your measurements by our master moortikars.</small>
                <strong>Begin consultation →</strong>
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      {searchOpen ? (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby={searchTitleId}>
          <button
            className={styles.overlayBackdrop}
            type="button"
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
          />
          <section className={styles.searchPanel} ref={searchPanelRef} tabIndex={-1}>
            <div className="site-container">
              <div className={styles.overlayHeading}>
                <div>
                  <p>Find your moorti</p>
                  <h2 id={searchTitleId}>Search Divine Stone Gallery</h2>
                </div>
                <button
                  className={styles.closeButton}
                  type="button"
                  aria-label="Close search"
                  onClick={() => setSearchOpen(false)}
                >
                  <X aria-hidden="true" size={24} strokeWidth={1.5} />
                </button>
              </div>
              <form className={styles.searchForm} action="/shop" onSubmit={handleSearchSubmit}>
                <Search aria-hidden="true" size={22} strokeWidth={1.5} />
                <input
                  name="q"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => updateSearchQuery(event.target.value)}
                  placeholder="Search by deity, material, size or style"
                  aria-label="Search products"
                />
                <button type="submit">Search</button>
              </form>
              <div className={styles.quickSearches}>
                <span>Popular:</span>
                <Link href="/shop?q=Ganesha">Ganesha</Link>
                <Link href="/shop?q=Radha%20Krishna">Radha Krishna</Link>
                <Link href="/shop?q=Lakshmi">Lakshmi</Link>
              </div>
              <div className={styles.searchResults} aria-live="polite">
                {searchQuery.trim().length < 2 ? (
                  <p className={styles.searchHint}>Type at least 2 characters to search the live catalogue.</p>
                ) : searchLoading ? (
                  <p className={styles.searchHint}>Searching the gallery...</p>
                ) : searchError ? (
                  <p className={styles.searchError}>{searchError}</p>
                ) : searchResults ? (
                  <>
                    <div className={styles.searchResultGroup}>
                      <div className={styles.searchResultHeading}>
                        <strong>Products</strong>
                        <span>{searchResults.products.length}</span>
                      </div>
                      {searchResults.products.length ? (
                        <div className={styles.searchProductGrid}>
                          {searchResults.products.map((product) => {
                            const title = searchProductTitle(product);
                            const image = searchProductImage(product);
                            return (
                              <Link
                                className={styles.searchProduct}
                                href={product.slug ? `/products/${product.slug}` : taxonomyHref(title)}
                                key={product.uid ?? product.slug ?? title}
                                onClick={() => setSearchOpen(false)}
                              >
                                <span className={styles.searchProductImage}>
                                  {image ? <Image src={image} alt={title} fill sizes="56px" unoptimized={/^https?:\/\//i.test(image)} /> : <Search aria-hidden="true" size={17} />}
                                </span>
                                <span>
                                  <strong>{title}</strong>
                                  <small>{[product.deity, product.category, product.material].filter(Boolean).join(" · ")}</small>
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <p className={styles.searchHint}>No matching products returned.</p>
                      )}
                    </div>

                    <div className={styles.searchResultColumns}>
                      <div className={styles.searchResultGroup}>
                        <div className={styles.searchResultHeading}>
                          <strong>Categories</strong>
                          <span>{searchResults.categories.length}</span>
                        </div>
                        {searchResults.categories.length ? (
                          <div className={styles.searchPills}>
                            {searchResults.categories.map((category) => (
                              <Link href={taxonomyHref(category.name)} key={category.id ?? category.slug} onClick={() => setSearchOpen(false)}>
                                {category.name}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className={styles.searchHint}>No matching categories returned.</p>
                        )}
                      </div>

                      <div className={styles.searchResultGroup}>
                        <div className={styles.searchResultHeading}>
                          <strong>Deities</strong>
                          <span>{searchDeities(searchResults).length}</span>
                        </div>
                        {searchDeities(searchResults).length ? (
                          <div className={styles.searchPills}>
                            {searchDeities(searchResults).map((deity) => (
                              <Link href={taxonomyHref(deity.name)} key={deity.id ?? deity.slug} onClick={() => setSearchOpen(false)}>
                                {deity.name}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className={styles.searchHint}>No matching deities returned.</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {mobileMenuOpen ? (
        <div className={styles.mobileDrawer} role="dialog" aria-modal="true" aria-label="Website menu">
          <button
            className={styles.overlayBackdrop}
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className={styles.mobileDrawerPanel} ref={mobilePanelRef} tabIndex={-1}>
            <div className={styles.mobileDrawerHeader}>
              <Image src="/brand/logo-horizontal.jpg" alt="Divine Stone Gallery" width={280} height={150} />
              <button
                className={styles.closeButton}
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X aria-hidden="true" size={24} strokeWidth={1.5} />
              </button>
            </div>
            <nav className={styles.mobileNav} aria-label="Mobile navigation">
              <Link href="/shop" onClick={() => setMobileMenuOpen(false)}>Shop all moorties</Link>
              <Link href="/cart" onClick={() => setMobileMenuOpen(false)}>Enquiry bag</Link>
              <Link href="/wishlist" onClick={() => setMobileMenuOpen(false)}>Wishlist</Link>
              {mainLinks.map(([label, href]) => (
                <Link href={href} key={href} onClick={() => setMobileMenuOpen(false)}>
                  {label}
                </Link>
              ))}
            </nav>
            <div className={styles.mobileShopGroups}>
              <p>Popular deities</p>
              <div>
                {deityLinks.slice(0, 5).map(([label, href]) => (
                  <Link href={href} key={href} onClick={() => setMobileMenuOpen(false)}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <Link className={styles.mobileConsultation} href="/contact" onClick={() => setMobileMenuOpen(false)}>
              Book a private consultation
            </Link>
          </div>
        </div>
      ) : null}

      <nav className={styles.mobileBottomNav} aria-label="Quick navigation">
        <Link className={pathname === "/" ? styles.mobileNavActive : undefined} href="/" aria-current={pathname === "/" ? "page" : undefined}><Home aria-hidden="true" size={20} /><span>Home</span></Link>
        <Link className={pathname.startsWith("/shop") || pathname.startsWith("/products/") ? styles.mobileNavActive : undefined} href="/shop" aria-current={pathname.startsWith("/shop") || pathname.startsWith("/products/") ? "page" : undefined}><ShoppingBag aria-hidden="true" size={20} /><span>Shop</span></Link>
        <Link className={pathname.startsWith("/custom-murti") ? styles.mobileNavActive : undefined} href="/custom-murti" aria-current={pathname.startsWith("/custom-murti") ? "page" : undefined}><Sparkles aria-hidden="true" size={20} /><span>Custom</span></Link>
        <Link className={pathname.startsWith("/cart") ? styles.mobileNavActive : undefined} href="/cart" aria-current={pathname.startsWith("/cart") ? "page" : undefined}><ShoppingBag aria-hidden="true" size={20} /><span>Bag{enquiryBag.count ? ` (${enquiryBag.count})` : ""}</span></Link>
        <Link className={pathname.startsWith("/account") ? styles.mobileNavActive : undefined} href="/account" aria-current={pathname.startsWith("/account") ? "page" : undefined}><CircleUserRound aria-hidden="true" size={20} /><span>Account</span></Link>
      </nav>
    </>
  );
}
