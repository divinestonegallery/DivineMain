// @ts-nocheck
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, CheckCircle2, ExternalLink, PackageX, RefreshCw, Save, Search } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import styles from "./commerce-admin.module.css";

type StockState = "in_stock" | "low_stock" | "out_of_stock" | "inactive";
type InventoryItem = {
  id: string;
  productName: string;
  productSlug: string;
  productStatus: "draft" | "active" | "archived";
  sku: string;
  variantName: string;
  inventoryKind: "unique" | "repeatable";
  stockQuantity: number;
  lowStockThreshold: number;
  reservedQuantity: number;
  availableQuantity: number;
  isActive: boolean;
  stockState: StockState;
};
type InventoryPayload = {
  data: InventoryItem[];
  summary: { totalVariants: number; inStock: number; lowStock: number; outOfStock: number; reserved: number };
};

const labels: Record<StockState, string> = { in_stock: "In stock", low_stock: "Low stock", out_of_stock: "Out of stock", inactive: "Inactive" };

function InventoryRow({ item, onSaved }: { item: InventoryItem; onSaved: (payload: InventoryPayload) => void }) {
  const { showToast } = useToast();
  const [stock, setStock] = useState(String(item.stockQuantity));
  const [threshold, setThreshold] = useState(String(item.lowStockThreshold));
  const [isActive, setIsActive] = useState(item.isActive);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/v1/admin/inventory", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id, stockQuantity: Number(stock), lowStockThreshold: Number(threshold), isActive }),
      });
      if (!response.ok) throw new Error();
      onSaved(await response.json() as InventoryPayload);
      showToast(`${item.sku} inventory updated.`);
    } catch {
      showToast(`Could not update ${item.sku}. Stock values must be zero or greater.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={styles.inventoryRow}>
      <div className={styles.inventoryIdentity}><strong>{item.productName}</strong><span>{item.variantName} · {item.sku}</span><small>{item.inventoryKind === "unique" ? "One-of-a-kind piece" : "Repeatable variant"} · Product {item.productStatus}</small></div>
      <span className={`${styles.stockPill} ${styles[item.stockState]}`}>{labels[item.stockState]}</span>
      <div className={styles.stockMetric}><small>Reserved</small><strong>{item.reservedQuantity}</strong></div>
      <div className={styles.stockMetric}><small>Available</small><strong>{item.availableQuantity}</strong></div>
      <label><span>Total stock</span><input inputMode="numeric" value={stock} onChange={(event) => setStock(event.target.value)} /></label>
      <label><span>Low-stock alert at</span><input inputMode="numeric" value={threshold} onChange={(event) => setThreshold(event.target.value)} /></label>
      <label className={styles.switchField}><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /><span>Available for sale</span></label>
      <div className={styles.inventoryActions}><Link href={`/products/${item.productSlug}`} target="_blank" aria-label={`View ${item.productName}`}><ExternalLink size={15} /></Link><button className={styles.primaryButton} onClick={() => void save()} disabled={saving}><Save size={15} />{saving ? "Saving…" : "Save"}</button></div>
    </article>
  );
}

export function InventoryAdmin() {
  const { showToast } = useToast();
  const [payload, setPayload] = useState<InventoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | StockState>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/admin/inventory", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setPayload(await response.json() as InventoryPayload);
    } catch {
      showToast("Inventory could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/admin/inventory", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<InventoryPayload>;
      })
      .then((data) => { if (!cancelled) setPayload(data); })
      .catch(() => { if (!cancelled) showToast("Inventory could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showToast]);

  const items = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (payload?.data ?? []).filter((item) => (filter === "all" || item.stockState === filter) && (!normalized || `${item.productName} ${item.variantName} ${item.sku}`.toLowerCase().includes(normalized)));
  }, [payload, query, filter]);

  const cards = [
    { label: "Variants", value: payload?.summary.totalVariants ?? 0, icon: Boxes, tone: "neutral" },
    { label: "In stock", value: payload?.summary.inStock ?? 0, icon: CheckCircle2, tone: "success" },
    { label: "Low stock", value: payload?.summary.lowStock ?? 0, icon: AlertTriangle, tone: "warning" },
    { label: "Out of stock", value: payload?.summary.outOfStock ?? 0, icon: PackageX, tone: "danger" },
  ];

  return (
    <section className={styles.managementSection}>
      <div className={styles.summaryGrid}>{cards.map(({ label, value, icon: Icon, tone }) => <button key={label} className={styles[tone]} onClick={() => setFilter(label === "Variants" ? "all" : label === "In stock" ? "in_stock" : label === "Low stock" ? "low_stock" : "out_of_stock")}><Icon size={19} /><span><small>{label}</small><strong>{value}</strong></span></button>)}</div>
      <div className={styles.inventoryToolbar}>
        <label><Search size={17} /><input type="search" placeholder="Search product or SKU" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label="Filter inventory status"><option value="all">All stock states</option><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option><option value="inactive">Inactive</option></select>
        <button className={styles.secondaryButton} onClick={() => void load()} disabled={loading}><RefreshCw size={16} />{loading ? "Loading…" : "Refresh"}</button>
      </div>
      <div className={styles.inventoryList}>
        {items.map((item) => <InventoryRow key={item.id} item={item} onSaved={setPayload} />)}
        {!loading && !items.length ? <p className={styles.emptyMessage}>No inventory matches this view.</p> : null}
      </div>
    </section>
  );
}
