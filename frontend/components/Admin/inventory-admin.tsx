// @ts-nocheck
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, CheckCircle2, ExternalLink, PackageX, RefreshCw, Save, Search } from "lucide-react";
import { apiRequest } from "@/api/client";
import { useToast } from "@/components/ui/toast";
import styles from "./commerce-admin.module.css";

type AdminProduct = {
  id: number;
  name: string;
  slug: string;
  status: "draft" | "active" | "archived";
  availability: "in_stock" | "made_to_order" | "out_of_stock";
  sales_mode: "quote_only" | "buy_and_quote" | "direct_purchase";
  display_order?: number;
};

type ProductList = {
  items: AdminProduct[];
};

const availabilityLabels = {
  in_stock: "In stock",
  made_to_order: "Made to order",
  out_of_stock: "Out of stock",
};

function InventoryRow({ item, refresh }: { item: AdminProduct; refresh: () => Promise<void> }) {
  const { showToast } = useToast();
  const [availability, setAvailability] = useState(item.availability);
  const [status, setStatus] = useState(item.status);
  const [salesMode, setSalesMode] = useState(item.sales_mode);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await apiRequest<AdminProduct>(`/api/admin/products/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ availability, status, sales_mode: salesMode }),
      });
      showToast(`${item.name} availability updated.`);
      await refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Availability could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={styles.inventoryRow}>
      <div className={styles.inventoryIdentity}>
        <strong>{item.name}</strong>
        <span>{item.slug || "slug pending"}</span>
        <small>Product status: {item.status}</small>
      </div>
      <span className={`${styles.stockPill} ${styles[item.availability === "out_of_stock" ? "out_of_stock" : item.status === "archived" ? "inactive" : "in_stock"]}`}>{availabilityLabels[item.availability]}</span>
      <div className={styles.stockMetric}><small>ID</small><strong>{item.id}</strong></div>
      <div className={styles.stockMetric}><small>Order</small><strong>{item.display_order ?? 999}</strong></div>
      <label><span>Availability</span><select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="in_stock">In stock</option><option value="made_to_order">Made to order</option><option value="out_of_stock">Out of stock</option></select></label>
      <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
      <label><span>Sales mode</span><select value={salesMode} onChange={(event) => setSalesMode(event.target.value)}><option value="quote_only">Quote only</option><option value="buy_and_quote">Buy and quote</option><option value="direct_purchase">Direct purchase</option></select></label>
      <div className={styles.inventoryActions}>
        {item.slug ? <Link href={`/products/${item.slug}`} target="_blank" aria-label={`View ${item.name}`}><ExternalLink size={15} /></Link> : null}
        <button className={styles.primaryButton} onClick={() => void save()} disabled={saving}><Save size={15} />{saving ? "Saving..." : "Save"}</button>
      </div>
    </article>
  );
}

export function InventoryAdmin() {
  const { showToast } = useToast();
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "in_stock" | "made_to_order" | "out_of_stock" | "draft" | "active" | "archived">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiRequest<ProductList>("/api/admin/products?page_size=100");
      setItems(payload.items ?? []);
    } catch {
      showToast("Product availability could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter = filter === "all" || item.availability === filter || item.status === filter;
      const matchesQuery = !normalized || `${item.name} ${item.slug}`.toLowerCase().includes(normalized);
      return matchesFilter && matchesQuery;
    });
  }, [filter, items, query]);

  const cards = [
    { label: "Products", value: items.length, icon: Boxes, tone: "neutral", filter: "all" },
    { label: "Active", value: items.filter((item) => item.status === "active").length, icon: CheckCircle2, tone: "success", filter: "active" },
    { label: "Draft", value: items.filter((item) => item.status === "draft").length, icon: AlertTriangle, tone: "warning", filter: "draft" },
    { label: "Out of stock", value: items.filter((item) => item.availability === "out_of_stock").length, icon: PackageX, tone: "danger", filter: "out_of_stock" },
  ];

  return (
    <section className={styles.managementSection}>
      <div className={styles.summaryGrid}>
        {cards.map(({ label, value, icon: Icon, tone, filter: cardFilter }) => (
          <button key={label} className={styles[tone]} onClick={() => setFilter(cardFilter)}>
            <Icon size={19} />
            <span><small>{label}</small><strong>{value}</strong></span>
          </button>
        ))}
      </div>
      <div className={styles.inventoryToolbar}>
        <label><Search size={17} /><input type="search" placeholder="Search product" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label="Filter product availability">
          <option value="all">All products</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
          <option value="in_stock">In stock</option>
          <option value="made_to_order">Made to order</option>
          <option value="out_of_stock">Out of stock</option>
        </select>
        <button className={styles.secondaryButton} onClick={() => void load()} disabled={loading}><RefreshCw size={16} />{loading ? "Loading..." : "Refresh"}</button>
      </div>
      <div className={styles.inventoryList}>
        {filteredItems.map((item) => <InventoryRow key={item.id} item={item} refresh={load} />)}
        {!loading && !filteredItems.length ? <p className={styles.emptyMessage}>No products match this view.</p> : null}
      </div>
    </section>
  );
}
