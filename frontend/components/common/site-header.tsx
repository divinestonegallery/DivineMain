"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  Sparkles,
  X,
  ChevronRight,
  MessageCircle
} from "lucide-react";
import { FormEvent, MouseEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { AccountControl, MobileAccountControl } from "@/components/Auth/account-control";
import { AuthModal } from "@/components/Auth/auth-modal";
import { useAuth, useUser } from "@/components/Auth/auth-facade";
import { useEnquiryBag } from "@/components/Customer/device-collections";
import { getDeities, searchApplication } from "@/api/products";
import type { BackendProductImage } from "@/api/products";
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

type SearchProductResult = {
  slug?: string | null;
  uid?: string | null;
  title?: string | null;
  name?: string | null;
  images?: BackendProductImage[];
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
  const images = Array.isArray(product.images)
    ? [...product.images]
        .filter((item) => item.image_url?.trim())
        .sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0))
    : [];
  const image = images.find((item) => item.cover_photo) ?? images[0];
  return image?.image_url?.trim() || product.cover_photo?.trim() || product.image_url?.trim() || "";
}

function searchDeities(results: { deities?: Array<{ id?: number; name: string; slug: string }>; dieties?: Array<{ id?: number; name: string; slug: string }> } | null) {
  return results?.deities ?? results?.dieties ?? [];
}

type ProfileRecord = Record<string, unknown>;

function profileData(user: unknown): ProfileRecord {
  if (!user || typeof user !== "object") return {};
  const record = user as ProfileRecord;
  return record.user && typeof record.user === "object" ? record.user as ProfileRecord : record;
}

function profileName(user: unknown) {
  const profile = profileData(user);
  const name = typeof profile.name === "string" ? profile.name.trim() : "";
  const firstName = typeof profile.first_name === "string" ? profile.first_name : "";
  const lastName = typeof profile.last_name === "string" ? profile.last_name : "";
  const username = typeof profile.username === "string" ? profile.username.trim() : "";
  return name
    || [firstName, lastName].filter(Boolean).join(" ").trim()
    || username
    || "Account";
}

function profileInitial(user: unknown) {
  return profileName(user).slice(0, 1).toUpperCase();
}

function profileImage(user: unknown) {
  const profile = profileData(user);
  const profileImageUrl = typeof profile.profile_image === "string" ? profile.profile_image.trim() : "";
  const avatarUrl = typeof profile.avatar === "string" ? profile.avatar.trim() : "";
  return profileImageUrl || avatarUrl;
}

function profileEmail(user: unknown) {
  const email = profileData(user).email;
  return typeof email === "string" ? email : "";
}

function profileRole(user: unknown) {
  const role = profileData(user).role;
  return typeof role === "string" ? role.toLowerCase() : "";
}

function MobileCustomizedMoortiLink({ onClick }: { onClick: () => void }) {
  return (
    <Link href="/custom-murti" className={`${styles.mobileSectionLink} ${styles.mobileCustomMoortiLink}`} onClick={onClick}>
      <span className={styles.mobileCustomMoortiText}>
        <strong>Customized Moorti</strong>
        <small>Create your own personalized moorti</small>
      </span>
      <Sparkles aria-hidden="true" size={19} strokeWidth={1.6} />
    </Link>
  );
}

export function SiteHeader({ animateLogo = false }: { animateLogo?: boolean }) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
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
  const [deityLinks, setDeityLinks] = useState<ReadonlyArray<readonly [string, string]>>(defaultDeityLinks);
  const [isScrolled, setIsScrolled] = useState(false);
  const shopTriggerRef = useRef<HTMLButtonElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const searchPanelRef = useRef<HTMLElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const searchTitleId = useId();
  const shopMenuId = useId();
  const showDockedSearch = pathname === "/" ? dockedSearchVisible : true;
  const isStaffUser = ["staff", "admin"].includes(profileRole(user));

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
    if (pathname !== "/") return;

    const heroSearch = document.querySelector<HTMLElement>("[data-hero-search]");
    if (!heroSearch) {
      const frame = window.requestAnimationFrame(() => setDockedSearchVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    let frame = 0;
    const scheduleDockedSearchUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const headerOffset = 84;
        const rect = heroSearch.getBoundingClientRect();
        setDockedSearchVisible(rect.bottom <= headerOffset || rect.top >= window.innerHeight);
      });
    };

    scheduleDockedSearchUpdate();

    if (typeof window.IntersectionObserver === "undefined") {
      window.addEventListener("scroll", scheduleDockedSearchUpdate, { passive: true });
      window.addEventListener("resize", scheduleDockedSearchUpdate);
      return () => {
        window.cancelAnimationFrame(frame);
        window.removeEventListener("scroll", scheduleDockedSearchUpdate);
        window.removeEventListener("resize", scheduleDockedSearchUpdate);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => setDockedSearchVisible(!entry.isIntersecting));
      },
      { rootMargin: "-84px 0px 0px 0px", threshold: 0.1 },
    );

    observer.observe(heroSearch);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
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

  function handleMyProfileClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setMobileMenuOpen(false);
    window.dispatchEvent(new CustomEvent("dsg:open-auth"));
  }

  async function handleLogout() {
    setMobileMenuOpen(false);
    await signOut();
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
            <Image className={`${styles.brandLogo} ${animateLogo ? styles.brandLogoAnimated : ""}`.trim()} src="/brand/logo.png" alt="Divine Stone Gallery" width={1600} height={1600} priority />
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
            <Link href="/custom-murti" className={`${styles.navLink} ${styles.desktopOnlyAction}`}>
              <Sparkles aria-hidden="true" size={18} strokeWidth={1.6} />
              <span>Customize Your Moorti</span>
            </Link>
            {/* <Link className={`${styles.bookingButton} ${styles.desktopOnlyAction}`} href="/cart" aria-label={`Enquiry bag with ${enquiryBag.count} ${enquiryBag.count === 1 ? "work" : "works"}`}>
              <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.6} />
              <span>Enquiry Bag</span>
              {enquiryBag.count ? <strong>{enquiryBag.count}</strong> : null}
            </Link> */}
            <AccountControl className={`${styles.headerAction} ${styles.desktopOnlyAction}`} />

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
              <Link className={styles.brandLink} href="/" aria-label="Divine Stone Gallery home" onClick={() => setMobileMenuOpen(false)}>
                <Image className={`${styles.brandLogo} ${animateLogo ? styles.brandLogoAnimated : ""}`.trim()} src="/brand/logo.png" alt="Divine Stone Gallery" width={1600} height={1600} priority />
              </Link>
              <button
                className={styles.closeButton}
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X aria-hidden="true" size={24} strokeWidth={1.5} />
              </button>
            </div>
            <div className={styles.mobileDrawerSections}>
              <div className={styles.mobileSection}>
                <p className={styles.mobileSectionHeader}>Account</p>
                {isLoaded && isSignedIn ? (
                  <>
                    <Link href="/account" className={styles.mobileProfile} onClick={() => setMobileMenuOpen(false)} aria-label="Open your account">
                      <span className={styles.mobileProfileAvatar} aria-hidden="true">
                        {profileImage(user) ? (
                          <Image src={profileImage(user)} alt="" width={48} height={48} unoptimized />
                        ) : profileInitial(user)}
                      </span>
                      <span className={styles.mobileProfileDetails}>
                        <strong>{profileName(user)}</strong>
                        <small>{profileEmail(user)}</small>
                      </span>
                    </Link>
                    <div className={styles.mobileSectionList}>
                      {isStaffUser ? (
                        <Link href="/admin" className={styles.mobileSectionLink} onClick={() => setMobileMenuOpen(false)}>
                          <span>Admin Dashboard</span>
                          <LayoutDashboard size={18} strokeWidth={1.5} />
                        </Link>
                      ) : null}
                      <MobileCustomizedMoortiLink onClick={() => setMobileMenuOpen(false)} />
                    </div>
                  </>
                ) : isLoaded ? (
                  <div className={styles.mobileSectionList}>
                    <Link href="/account" className={styles.mobileSectionLink} onClick={handleMyProfileClick}>
                      <span>My Profile</span>
                      <ChevronRight size={18} strokeWidth={1.5} />
                    </Link>
                    <MobileCustomizedMoortiLink onClick={() => setMobileMenuOpen(false)} />
                  </div>
                ) : (
                  <div className={styles.mobileProfileLoading} aria-busy="true">Loading account...</div>
                )}
              </div>

              <div className={styles.mobileSection}>
                <p className={styles.mobileSectionHeader}>Other</p>
                <div className={styles.mobileSectionList}>
                  <Link href="/our-story" className={styles.mobileSectionLink} onClick={() => setMobileMenuOpen(false)}>
                    <span>About Us</span>
                    <ChevronRight size={18} strokeWidth={1.5} />
                  </Link>
                  <Link href="/contact" className={styles.mobileSectionLink} onClick={() => setMobileMenuOpen(false)}>
                    <span>Contact Us</span>
                    <ChevronRight size={18} strokeWidth={1.5} />
                  </Link>
                  <Link href="/faq" className={styles.mobileSectionLink} onClick={() => setMobileMenuOpen(false)}>
                    <span>FAQ</span>
                    <ChevronRight size={18} strokeWidth={1.5} />
                  </Link>
                </div>
              </div>

              <div className={styles.mobileSection}>
                <p className={styles.mobileSectionHeader}>Social Media</p>
                <div className={styles.mobileSocials}>
                  <a href="#" className={styles.mobileSocialLinkText}>
                    <span className={styles.mobileSocialIcon} aria-hidden="true"><Image src="/brand/facebook.svg" alt="" width={22} height={22} /></span>
                    <span>Facebook</span>
                  </a>
                  <a href="https://www.instagram.com/divinestone_gallery?igsi=MWZwN3U4NnF0cWUwNQ==" target="_blank" rel="noreferrer" className={styles.mobileSocialLinkText}>
                    <span className={styles.mobileSocialIcon} aria-hidden="true"><Image src="/brand/instagram.svg" alt="" width={22} height={22} /></span>
                    <span>Instagram</span>
                  </a>
                  <a href="https://youtube.com/@divinestonegallery?si=GGX9Xu-UidKMfvBl" target="_blank" rel="noreferrer" className={styles.mobileSocialLinkText}>
                    <span className={styles.mobileSocialIcon} aria-hidden="true"><Image src="/brand/youtube.svg" alt="" width={22} height={22} /></span>
                    <span>YouTube</span>
                  </a>
                  <a href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20help%20choosing%20a%20moorti." target="_blank" rel="noreferrer" className={styles.mobileSocialLinkText}>
                    <span className={styles.mobileSocialIcon} aria-hidden="true"><MessageCircle size={22} strokeWidth={1.7} /></span>
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              {isLoaded && isSignedIn ? (
                <div className={styles.mobileLogoutSection}>
                  <button className={styles.mobileLogout} type="button" onClick={() => void handleLogout()}>
                    <span>Logout</span>
                    <LogOut aria-hidden="true" size={18} strokeWidth={1.6} />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <nav className={styles.mobileBottomNav} aria-label="Quick navigation">
        <Link className={pathname === "/" ? styles.mobileNavActive : undefined} href="/" aria-current={pathname === "/" ? "page" : undefined}><Home aria-hidden="true" size={20} /><span>Home</span></Link>
        <Link className={pathname.startsWith("/shop") || pathname.startsWith("/products/") ? styles.mobileNavActive : undefined} href="/shop" aria-current={pathname.startsWith("/shop") || pathname.startsWith("/products/") ? "page" : undefined}><ShoppingBag aria-hidden="true" size={20} /><span>Shop</span></Link>
        <Link className={pathname.startsWith("/custom-murti") ? styles.mobileNavActive : undefined} href="/custom-murti" aria-current={pathname.startsWith("/custom-murti") ? "page" : undefined}><Sparkles aria-hidden="true" size={20} /><span>Custom</span></Link>
        <Link className={pathname.startsWith("/cart") ? styles.mobileNavActive : undefined} href="/cart" aria-current={pathname.startsWith("/cart") ? "page" : undefined}><ShoppingBag aria-hidden="true" size={20} /><span>Bag{enquiryBag.count ? ` (${enquiryBag.count})` : ""}</span></Link>
        <MobileAccountControl 
          activeClassName={pathname.startsWith("/account") ? styles.mobileNavActive : undefined} 
          defaultClassName={undefined} 
        />
      </nav>
      
      <AuthModal />
    </>
  );
}
