"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Search, Sparkles } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { AccountControl } from "@/components/auth/account-control";
import styles from "../layout/site-shell.module.css";

export type NavbarProps = {
  animateLogo: boolean;
  searchOpen: boolean;
  mobileMenuOpen: boolean;
  onSearchOpen: () => void;
  onMenuOpen: () => void;
  children?: ReactNode;
};

type NavbarBarProps = NavbarProps & {
  home?: boolean;
  transparent?: boolean;
  compact?: boolean;
  showSearchPill?: boolean;
  showSearchIcon?: boolean;
  headerRef?: Ref<HTMLElement>;
};

export function NavbarBar({
  animateLogo, searchOpen, mobileMenuOpen, onSearchOpen, onMenuOpen, children,
  home = false, transparent = false, compact = false,
  showSearchPill = false, showSearchIcon = false, headerRef,
}: NavbarBarProps) {
  return (
    <header
      ref={headerRef}
      data-navbar={home ? "home" : "inner"}
      className={`${styles.siteHeader} ${home ? styles.siteHeaderHome : ""} ${transparent ? styles.siteHeaderTransparent : ""} ${compact ? styles.siteHeaderCompact : ""}`.trim()}
    >
      <div className={`${styles.headerMain} site-container`}>
        <Link className={styles.brandLink} href="/" aria-label="Divine Stone Gallery home">
          <Image className={`${styles.brandLogo} ${animateLogo ? styles.brandLogoAnimated : ""}`.trim()} src={transparent ? "/brand/DSG-White.png" : "/brand/DSG-New.png"} alt="Divine Stone Gallery" width={1600} height={1600} priority />
        </Link>

        <div className={styles.headerCenter}>
          <button
            className={`${styles.headerSearchPill} ${showSearchPill ? styles.headerSearchPillVisible : ""}`.trim()}
            type="button"
            aria-label="Search Divine Stone Gallery"
            aria-expanded={searchOpen}
            aria-hidden={!showSearchPill}
            tabIndex={showSearchPill ? 0 : -1}
            onClick={onSearchOpen}
          >
            <Search aria-hidden="true" size={19} strokeWidth={1.6} />
            <span>Search for Moorti</span>
            <span className={styles.headerSearchSubmit} aria-hidden="true">
              <Search size={20} strokeWidth={1.8} />
            </span>
          </button>
        </div>

        <div className={styles.headerActions}>
          {showSearchIcon ? (
            <button
              className={styles.headerCompactSearchButton}
              type="button"
              aria-label="Search"
              aria-expanded={searchOpen}
              title="Search"
              onClick={onSearchOpen}
            >
              <Search aria-hidden="true" size={20} strokeWidth={1.8} />
            </button>
          ) : null}
          <Link href="/custom-murti" className={`${styles.navLink} ${styles.desktopOnlyAction}`}>
            <Sparkles aria-hidden="true" size={18} strokeWidth={1.6} />
            <span>Customize Your Moorti</span>
          </Link>

          <AccountControl className={`${styles.headerAction} ${styles.desktopOnlyAction}`} />

          <button
            className={styles.headerAction}
            type="button"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            onClick={onMenuOpen}
          >
            <Menu aria-hidden="true" size={23} strokeWidth={1.7} />
          </button>
        </div>
      </div>

      {children}
    </header>
  );
}
