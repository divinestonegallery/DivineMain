// @ts-nocheck
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

export function SiteHeader({ animateLogo = false }: { animateLogo?: boolean }) {
  const pathname = usePathname();
  const savedWorks = useSavedWorks();
  const enquiryBag = useEnquiryBag();
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [megaMenuClosing, setMegaMenuClosing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoAnimationFinished, setLogoAnimationFinished] = useState(false);
  const [deityLinks, setDeityLinks] = useState<ReadonlyArray<readonly [string, string]>>(defaultDeityLinks);
  const logoVideoRef = useRef<HTMLVideoElement>(null);
  const shopTriggerRef = useRef<HTMLButtonElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const searchPanelRef = useRef<HTMLElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const searchTitleId = useId();
  const shopMenuId = useId();

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
    let cancelled = false;
    void fetch("/api/v1/products?limit=100", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { data?: Array<{ deity?: string }>; meta?: { deities?: string[] } }) => {
        if (cancelled) return;
        const names = [...new Set([
          ...(payload.meta?.deities ?? []),
          ...(payload.data ?? []).map((item) => item.deity?.trim()).filter((name): name is string => Boolean(name)),
        ])];
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

      <header className={styles.siteHeader}>
        <div className={`${styles.headerMain} site-container`}>
          <button
            className={`${styles.headerAction} ${styles.mobileMenuButton}`}
            type="button"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu aria-hidden="true" size={22} strokeWidth={1.6} />
          </button>

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
                <Image className={`${styles.brandLogo} ${styles.brandLogoMotionFallback}`} src="/brand/logo-square-warm.jpg" alt="Divine Stone Gallery" width={1600} height={1600} priority />
              </>
            ) : (
              <Image className={styles.brandLogo} src="/brand/logo-square-warm.jpg" alt="Divine Stone Gallery" width={1600} height={1600} priority />
            )}
          </Link>

          <nav className={styles.desktopNav} aria-label="Main navigation">
            <button
              ref={shopTriggerRef}
              className={styles.navLink}
              type="button"
              aria-controls={shopMenuId}
              aria-expanded={megaMenuOpen}
              onClick={() => megaMenuOpen ? closeMegaMenu() : openMegaMenu()}
            >
              Shop
              <span aria-hidden="true" className={`${styles.chevron} ${megaMenuOpen && !megaMenuClosing ? styles.chevronOpen : ""}`}>⌄</span>
            </button>
            {mainLinks.map(([label, href]) => (
              <Link className={styles.navLink} href={href} key={href}>
                {label}
              </Link>
            ))}
          </nav>

          <div className={styles.headerActions}>
            <button
              className={styles.headerAction}
              type="button"
              aria-label="Search"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(true)}
            >
              <Search aria-hidden="true" size={21} strokeWidth={1.6} />
            </button>
            <a
              className={`${styles.headerAction} ${styles.desktopOnlyAction}`}
              href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20assistance%20from%20Divine%20Stone%20Gallery."
              target="_blank"
              rel="noreferrer"
              aria-label="Chat with Divine Stone Gallery on WhatsApp"
            >
              <MessageCircle aria-hidden="true" size={21} strokeWidth={1.6} />
            </a>
            <AccountControl className={`${styles.headerAction} ${styles.desktopOnlyAction}`} />
            <Link className={`${styles.headerAction} ${styles.desktopOnlyAction}`} href="/wishlist" aria-label={`Wishlist with ${savedWorks.count} saved ${savedWorks.count === 1 ? "work" : "works"}`}>
              <Heart aria-hidden="true" size={21} strokeWidth={1.6} />
              {savedWorks.count ? <span className={styles.actionBadge}>{savedWorks.count}</span> : null}
            </Link>
            <Link className={styles.headerAction} href="/cart" aria-label={`Enquiry bag with ${enquiryBag.count} ${enquiryBag.count === 1 ? "work" : "works"}`}>
              <ShoppingBag aria-hidden="true" size={21} strokeWidth={1.6} />
              {enquiryBag.count ? <span className={styles.actionBadge}>{enquiryBag.count}</span> : null}
            </Link>
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
        <Link className={pathname.startsWith("/wishlist") ? styles.mobileNavActive : undefined} href="/wishlist" aria-current={pathname.startsWith("/wishlist") ? "page" : undefined}><Heart aria-hidden="true" size={20} /><span>Wishlist{savedWorks.count ? ` (${savedWorks.count})` : ""}</span></Link>
        <Link className={pathname.startsWith("/account") ? styles.mobileNavActive : undefined} href="/account" aria-current={pathname.startsWith("/account") ? "page" : undefined}><CircleUserRound aria-hidden="true" size={20} /><span>Account</span></Link>
      </nav>
    </>
  );
}
