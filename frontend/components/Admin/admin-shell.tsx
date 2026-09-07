"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  ChevronRight,
  CircleHelp,
  CircleUserRound,
  Gem,
  Hammer,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Star,
  Store,
  Tags,
  X,
} from "lucide-react";
import { AccountControl } from "@/components/Auth/account-control";
import { useAuth } from "@/components/Auth/auth-facade";
import { ToastProvider } from "@/components/ui/toast";
import styles from "./admin-shell.module.css";

type NavItem = {
  label: string;
  href?: string;
  icon: typeof LayoutDashboard;
  description: string;
};

const groups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard, description: "Store health and quick actions" },
      { label: "Category", href: "/admin/category", icon: Tags, description: "Manage product categories" },
      { label: "Deity", href: "/admin/deity", icon: Gem, description: "Manage product deities" },
      { label: "Material", href: "/admin/material", icon: Gem, description: "Manage product materials" },
      { label: "Product", href: "/admin/product", icon: Boxes, description: "Manage products and images" },
      { label: "Review", href: "/admin/review", icon: Star, description: "Moderate customer reviews" },
      { label: "FAQs", href: "/admin/faqs", icon: CircleHelp, description: "Manage frequently asked questions" },
      { label: "Customer Requests", href: "/admin/customer-requests", icon: Hammer, description: "Review customization requests" },
      { label: "Staff", href: "/admin/staff", icon: ShieldCheck, description: "Manage staff and administrators" },
    ],
  },
];

function currentLabel(pathname: string) {
  if (pathname === "/admin/overview") return "Overview";
  return groups.flatMap((group) => group.items).find((item) => item.href === pathname)?.label
    ?? (pathname.split("/")[2] ? pathname.split("/")[2].replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase()) : "Administration");
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isSignedIn, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return groups.flatMap((group) => group.items).filter((item) => item.href);
    return groups.flatMap((group) => group.items).filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(normalized));
  }, [query]);

  const closeNavigation = useCallback(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setQuery("");
  }, []);

  const handleSignOut = useCallback(async () => {
    closeNavigation();
    await signOut();
  }, [closeNavigation, signOut]);

  useEffect(() => {
    if (!searchOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNavigation();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeNavigation, searchOpen]);

  return (
    <ToastProvider><div className={styles.root}>
      <button className={`${styles.backdrop} ${menuOpen ? styles.backdropVisible : ""}`} aria-label="Close admin menu" onClick={() => setMenuOpen(false)} />
      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brandRow}>
          <Link href="/admin" aria-label="Divine Stone Gallery admin overview" onClick={closeNavigation}>
            <Image src="/brand/logo.png" alt="Divine Stone Gallery" width={1600} height={900} priority />
          </Link>
          <button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        <div className={styles.adminIdentity}><ShieldCheck size={16} /><span><strong>Gallery administration</strong><small>Full access</small></span></div>
        <nav aria-label="Administration navigation">
          {groups.map((group) => (
            <div className={styles.navGroup} key={group.label}>
              <p>{group.label}</p>
              {group.items.map(({ label, href, icon: Icon }) => {
                const active = href ? (label === "Overview" ? pathname === "/admin" || pathname === "/admin/overview" : pathname === href || (href !== "/admin" && pathname.startsWith(href))) : false;
                return href ? (
                <Link className={active ? styles.active : undefined} href={href} key={label} onClick={closeNavigation}>
                  <Icon aria-hidden="true" size={18} /><span>{label}</span>
                </Link>
              ) : (
                <span className={styles.upcoming} key={label} title="Scheduled for a later admin build step">
                  <Icon aria-hidden="true" size={18} /><span>{label}</span><small>Soon</small>
                </span>
              );
              })}
            </div>
          ))}
        </nav>
        <Link className={styles.storeLink} href="/" target="_blank"><Store size={17} /><span>View storefront</span><ChevronRight size={15} /></Link>
        {isSignedIn ? (
          <div className={styles.sidebarAccount}>
            <Link href="/account" onClick={closeNavigation}><CircleUserRound size={17} /><span>Profile</span></Link>
            <button type="button" onClick={() => void handleSignOut()}><LogOut size={17} /><span>Logout</span></button>
          </div>
        ) : null}
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.topbarStart}>
            <button className={styles.menuButton} type="button" aria-label="Open admin menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
            <div><small>Divine Stone Gallery</small><strong>{currentLabel(pathname)}</strong></div>
          </div>
          <div className={styles.topbarActions}>
            <button className={styles.searchButton} type="button" aria-expanded={searchOpen} onClick={() => setSearchOpen((open) => !open)}><Search size={18} /><span>Search admin</span><kbd>⌘ K</kbd></button>
            <Link className={styles.viewStore} href="/" target="_blank"><Store size={17} /><span>View store</span></Link>
            <AccountControl className={styles.accountControl} />
          </div>
        </header>

        {searchOpen ? (
          <section className={styles.commandPanel} role="dialog" aria-label="Search administration">
            <div className={styles.commandInput}><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, commissions or admin tools…" aria-label="Search administration" /><button onClick={closeNavigation} aria-label="Close search"><X size={18} /></button></div>
            <div className={styles.commandResults}>
              {results.map(({ label, href, description, icon: Icon }) => href ? (
                <Link href={href} key={label} onClick={closeNavigation}><Icon size={18} /><span><strong>{label}</strong><small>{description}</small></span><ChevronRight size={16} /></Link>
              ) : (
                <div className={styles.commandUpcoming} key={label}><Icon size={18} /><span><strong>{label}</strong><small>{description}</small></span><em>Coming soon</em></div>
              ))}
              {!results.length ? <p className={styles.emptySearch}>No admin tool matches “{query}”.</p> : null}
            </div>
          </section>
        ) : null}

        <main className={styles.main} id="admin-main" tabIndex={-1}>{children}</main>
      </div>
    </div></ToastProvider>
  );
}
