// @ts-nocheck
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  BellRing,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  FileText,
  GalleryVerticalEnd,
  Hammer,
  Images,
  LayoutDashboard,
  Menu,
  PackageSearch,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tags,
  Truck,
  UsersRound,
  X,
} from "lucide-react";
import { AccountControl } from "@/components/Auth/account-control";
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
      { label: "Products", href: "/admin/products", icon: Boxes, description: "Catalogue, pricing and inventory" },
      { label: "Catalogue", href: "/admin/catalog", icon: Tags, description: "Categories, deities and collections" },
      { label: "Inventory", href: "/admin/inventory", icon: PackageSearch, description: "Stock, reservations and low-stock alerts" },
      { label: "Commissions", href: "/admin/commissions", icon: Hammer, description: "Quotes, milestones and approvals" },
      { label: "Notifications", href: "/admin/notifications", icon: BellRing, description: "Email, SMS and WhatsApp queue" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingBag, description: "Orders, payments and fulfilment" },
      { label: "Customers", href: "/admin/customers", icon: UsersRound, description: "Customer accounts and activity" },
      { label: "Shipping", href: "/admin/shipping", icon: Truck, description: "Shiprocket rates and tracking" },
      { label: "Payments", href: "/admin/payments", icon: CircleDollarSign, description: "Online, bank transfer and COD" },
      { label: "Returns", href: "/admin/returns", icon: PackageSearch, description: "Damage reports and resolutions" },
    ],
  },
  {
    label: "Website",
    items: [
      { label: "Pages & sections", href: "/admin/pages", icon: GalleryVerticalEnd, description: "Block-based website builder" },
      { label: "Media library", href: "/admin/media", icon: Images, description: "ImageKit assets and folders" },
      { label: "Navigation", icon: Tags, description: "Menus, collections and links" },
      { label: "Content & SEO", icon: FileText, description: "Copy, metadata and redirects" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/admin/settings", icon: Settings, description: "Business and integration settings" },
      { label: "Staff & security", href: "/admin/staff", icon: ShieldCheck, description: "Permissions and audit history" },
    ],
  },
];

function currentLabel(pathname: string) {
  return groups.flatMap((group) => group.items).find((item) => item.href === pathname)?.label
    ?? (pathname.split("/")[2] ? pathname.split("/")[2].replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase()) : "Administration");
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return groups.flatMap((group) => group.items).filter((item) => item.href);
    return groups.flatMap((group) => group.items).filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(normalized));
  }, [query]);

  function closeNavigation() {
    setMenuOpen(false);
    setSearchOpen(false);
    setQuery("");
  }

  return (
    <ToastProvider><div className={styles.root}>
      <button className={`${styles.backdrop} ${menuOpen ? styles.backdropVisible : ""}`} aria-label="Close admin menu" onClick={() => setMenuOpen(false)} />
      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brandRow}>
          <Link href="/admin" aria-label="Divine Stone Gallery admin overview" onClick={closeNavigation}>
            <Image src="/brand/logo-square-warm.jpg" alt="Divine Stone Gallery" width={1600} height={1600} priority />
          </Link>
          <button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        <div className={styles.adminIdentity}><ShieldCheck size={16} /><span><strong>Gallery administration</strong><small>Full access</small></span></div>
        <nav aria-label="Administration navigation">
          {groups.map((group) => (
            <div className={styles.navGroup} key={group.label}>
              <p>{group.label}</p>
              {group.items.map(({ label, href, icon: Icon }) => href ? (
                <Link className={pathname === href || (href !== "/admin" && pathname.startsWith(href)) ? styles.active : undefined} href={href} key={label} onClick={closeNavigation}>
                  <Icon aria-hidden="true" size={18} /><span>{label}</span>
                </Link>
              ) : (
                <span className={styles.upcoming} key={label} title="Scheduled for a later admin build step">
                  <Icon aria-hidden="true" size={18} /><span>{label}</span><small>Soon</small>
                </span>
              ))}
            </div>
          ))}
        </nav>
        <Link className={styles.storeLink} href="/" target="_blank"><Store size={17} /><span>View storefront</span><ChevronRight size={15} /></Link>
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
          <section className={styles.commandPanel} aria-label="Search administration">
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
