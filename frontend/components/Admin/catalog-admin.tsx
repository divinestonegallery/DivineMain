// @ts-nocheck
"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ExternalLink, PackagePlus, RefreshCw, Save, Search, Upload } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { prepareImageForUpload } from "@/components/Uploads/prepare-image";
import styles from "./catalog-admin.module.css";

type Variant = {
  id: string;
  sku: string;
  name: string;
  material: string;
  finish: string | null;
  heightMm: number;
  widthMm: number | null;
  depthMm: number | null;
  weightMinGrams: number | null;
  weightGrams: number | null;
  packageLengthMm: number | null;
  packageWidthMm: number | null;
  packageHeightMm: number | null;
  pricePaise: number | null;
  gstRateBps: number | null;
  inventoryKind: "unique" | "repeatable";
  stockQuantity: number;
  lowStockThreshold: number;
  codEligible: boolean;
  isActive: boolean;
};

type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  categoryId: string | null;
  category: string | null;
  deityId: string | null;
  deity: string | null;
  productType: "ready_made" | "made_to_order";
  salesMode: "direct" | "quote" | "both";
  status: "draft" | "active" | "archived";
  isFeatured: boolean;
  sortOrder: number;
  variants: Variant[];
  media: Array<{ id: string; publicPath: string | null; altText: string | null; isPrimary: boolean }>;
  collections: Array<{ id: string; name: string; slug: string }>;
};

type Lookup = { id: string; name: string };
type CatalogResponse = {
  data: AdminProduct[];
  lookups: { categories: Lookup[]; deities: Lookup[]; collections: Lookup[] };
};

function completion(product: AdminProduct) {
  const variant = product.variants[0];
  const checks = [
    Boolean(product.media.some((media) => media.publicPath)),
    Boolean(variant?.pricePaise),
    variant?.gstRateBps !== null && variant?.gstRateBps !== undefined,
    Boolean(variant?.weightGrams),
    Boolean(variant?.packageLengthMm && variant?.packageWidthMm && variant?.packageHeightMm),
    Boolean(variant && variant.stockQuantity > 0),
  ];
  return { complete: checks.filter(Boolean).length, total: checks.length };
}

function inchesFromMm(value: number | null | undefined) {
  return value ? String(Number((value / 25.4).toFixed(2))) : "";
}

function mmFromInches(value: string | FormDataEntryValue | null) {
  const inches = Number(value);
  return Number.isFinite(inches) && inches > 0 ? Math.round(inches * 25.4) : null;
}

function ProductEditor({ product, lookups, refresh }: { product: AdminProduct; lookups: CatalogResponse["lookups"]; refresh: () => Promise<void> }) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(product.status);
  const [salesMode, setSalesMode] = useState(product.salesMode);
  const [featured, setFeatured] = useState(product.isFeatured);
  const [sortOrder, setSortOrder] = useState(String(product.sortOrder));
  const [categoryId, setCategoryId] = useState(product.categoryId ?? "");
  const [deityId, setDeityId] = useState(product.deityId ?? "");
  const [collectionIds, setCollectionIds] = useState(product.collections.map((collection) => collection.id));
  const variant = product.variants[0];
  const [heightInches, setHeightInches] = useState(inchesFromMm(variant?.heightMm));
  const [priceRupees, setPriceRupees] = useState(variant?.pricePaise ? String(variant.pricePaise / 100) : "");
  const [gstPercent, setGstPercent] = useState(variant?.gstRateBps !== null && variant?.gstRateBps !== undefined ? String(variant.gstRateBps / 100) : "");
  const [weightMode, setWeightMode] = useState<"exact" | "range">(variant?.weightMinGrams ? "range" : "exact");
  const [weightMinKg, setWeightMinKg] = useState(variant?.weightMinGrams ? String(variant.weightMinGrams / 1000) : "");
  const [weightKg, setWeightKg] = useState(variant?.weightGrams ? String(variant.weightGrams / 1000) : "");
  const [widthInches, setWidthInches] = useState(inchesFromMm(variant?.widthMm));
  const [depthInches, setDepthInches] = useState(inchesFromMm(variant?.depthMm));
  const [packageLengthInches, setPackageLengthInches] = useState(inchesFromMm(variant?.packageLengthMm));
  const [packageWidthInches, setPackageWidthInches] = useState(inchesFromMm(variant?.packageWidthMm));
  const [packageHeightInches, setPackageHeightInches] = useState(inchesFromMm(variant?.packageHeightMm));
  const [stock, setStock] = useState(variant ? String(variant.stockQuantity) : "0");
  const readiness = completion(product);
  const primaryMedia = product.media.find((media) => media.isPrimary) ?? product.media[0];

  async function createFirstVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const heightMm = mmFromInches(form.get("heightInches"));
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/admin/products/${encodeURIComponent(product.id)}/variants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sku: form.get("sku"),
          name: form.get("variantName"),
          material: form.get("material"),
          finish: form.get("finish"),
          heightMm,
          inventoryKind: "unique",
          stockQuantity: 0,
          lowStockThreshold: 1,
          codEligible: true,
        }),
      });
      if (!response.ok) throw new Error();
      showToast(`Selling details added to ${product.name}.`);
      await refresh();
    } catch {
      showToast("Could not add selling details. Check that the SKU is unique and all required values are complete.");
    } finally {
      setSaving(false);
    }
  }

  async function saveProduct() {
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/admin/products/${encodeURIComponent(product.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, salesMode, isFeatured: featured, sortOrder: Number(sortOrder), categoryId: categoryId || null, deityId: deityId || null, collectionIds }),
      });
      if (!response.ok) throw new Error();

      if (variant) {
        const variantResponse = await fetch(`/api/v1/admin/variants/${encodeURIComponent(variant.id)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            pricePaise: priceRupees ? Math.round(Number(priceRupees) * 100) : null,
            gstRateBps: gstPercent ? Math.round(Number(gstPercent) * 100) : null,
            heightMm: mmFromInches(heightInches),
            weightMinGrams: weightMode === "range" && weightMinKg ? Math.round(Number(weightMinKg) * 1000) : null,
            weightGrams: weightKg ? Math.round(Number(weightKg) * 1000) : null,
            widthMm: mmFromInches(widthInches),
            depthMm: mmFromInches(depthInches),
            packageLengthMm: mmFromInches(packageLengthInches),
            packageWidthMm: mmFromInches(packageWidthInches),
            packageHeightMm: mmFromInches(packageHeightInches),
            stockQuantity: Number(stock),
          }),
        });
        if (!variantResponse.ok) throw new Error();
      }

      showToast(`${product.name} updated.`);
      await refresh();
    } catch {
      showToast(`Could not update ${product.name}. Check the values and try again.`);
    } finally {
      setSaving(false);
    }
  }

  async function uploadImages(files: File[]) {
    if (!files.length) return;
    setSaving(true);
    let uploaded = 0;
    try {
      for (const file of files) {
        const form = new FormData();
        form.set("altText", `${product.name} hand-carved marble work`);
        form.set("file", await prepareImageForUpload(file));
        const response = await fetch(`/api/v1/admin/products/${encodeURIComponent(product.id)}/media`, { method: "POST", body: form });
        if (!response.ok) throw new Error();
        uploaded += 1;
      }
      showToast(`${uploaded} ${uploaded === 1 ? "image" : "images"} added to ${product.name}.`);
      await refresh();
    } catch {
      showToast(uploaded
        ? `${uploaded} ${uploaded === 1 ? "image was" : "images were"} added, but a later upload failed. Use JPEG, PNG or WebP files up to 12 MB each.`
        : "The images could not be uploaded. Use JPEG, PNG or WebP files up to 12 MB each.");
      if (uploaded) await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className={styles.productRow}>
      <summary>
        <span className={styles.productThumb}>
          {primaryMedia?.publicPath ? <Image src={primaryMedia.publicPath} alt="" fill sizes="64px" /> : <PackagePlus aria-hidden="true" size={20} />}
        </span>
        <span className={styles.productIdentity}>
          <strong>{product.name}</strong>
          <small>{product.category ?? "Uncategorised"} · {product.deity ?? "No deity"}</small>
        </span>
        <span className={`${styles.statusPill} ${styles[product.status]}`}>{product.status}</span>
        <span className={readiness.complete === readiness.total ? styles.complete : styles.incomplete}>
          {readiness.complete === readiness.total ? <Check aria-hidden="true" size={14} /> : <AlertTriangle aria-hidden="true" size={14} />}
          {readiness.complete}/{readiness.total} selling details
        </span>
        <ChevronDown className={styles.chevron} aria-hidden="true" size={18} />
      </summary>

      <div className={styles.editorGrid}>
        <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
        <label><span>Sales mode</span><select value={salesMode} onChange={(event) => setSalesMode(event.target.value as typeof salesMode)}><option value="both">Buy + quote</option><option value="direct">Direct purchase</option><option value="quote">Quote only</option></select></label>
        <label><span>Category</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Uncategorised</option>{lookups.categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label><span>Deity</span><select value={deityId} onChange={(event) => setDeityId(event.target.value)}><option value="">No deity</option>{lookups.deities.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label><span>Price before GST (₹)</span><input inputMode="decimal" value={priceRupees} onChange={(event) => setPriceRupees(event.target.value)} placeholder="Not entered" /></label>
        <label><span>GST rate (%)</span><input inputMode="decimal" value={gstPercent} onChange={(event) => setGstPercent(event.target.value)} placeholder="Add after GST registration" /></label>
        <label><span>Sculpture height (inches)</span><input inputMode="decimal" min="0.1" step="0.1" required value={heightInches} onChange={(event) => setHeightInches(event.target.value)} /></label>
        <label><span>Weight entry</span><select value={weightMode} onChange={(event) => setWeightMode(event.target.value as "exact" | "range")}><option value="exact">Exact weight</option><option value="range">Weight range</option></select></label>
        {weightMode === "range" ? <label><span>Minimum weight (kg)</span><input inputMode="decimal" min="0.1" step="0.1" value={weightMinKg} onChange={(event) => setWeightMinKg(event.target.value)} placeholder="For example, 40" /></label> : null}
        <label><span>{weightMode === "range" ? "Maximum weight (kg)" : "Exact weight (kg)"}</span><input inputMode="decimal" min="0.1" step="0.1" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} placeholder="Needed for shipping" /></label>
        <label><span>Sculpture width (inches)</span><input inputMode="decimal" value={widthInches} onChange={(event) => setWidthInches(event.target.value)} placeholder="Optional" /></label>
        <label><span>Sculpture depth (inches)</span><input inputMode="decimal" value={depthInches} onChange={(event) => setDepthInches(event.target.value)} placeholder="Optional" /></label>
        <label><span>Packed length (inches)</span><input inputMode="decimal" value={packageLengthInches} onChange={(event) => setPackageLengthInches(event.target.value)} placeholder="Required for rates" /></label>
        <label><span>Packed width (inches)</span><input inputMode="decimal" value={packageWidthInches} onChange={(event) => setPackageWidthInches(event.target.value)} placeholder="Required for rates" /></label>
        <label><span>Packed height (inches)</span><input inputMode="decimal" value={packageHeightInches} onChange={(event) => setPackageHeightInches(event.target.value)} placeholder="Required for rates" /></label>
        <label><span>Stock quantity</span><input inputMode="numeric" value={stock} onChange={(event) => setStock(event.target.value)} /></label>
        <label><span>Display order</span><input inputMode="numeric" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} /></label>
        <label className={styles.checkbox}><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} /><span>Featured product</span></label>
        <fieldset className={styles.collectionChooser}><legend>Curated collections</legend>{lookups.collections.length ? lookups.collections.map((item) => <label key={item.id}><input type="checkbox" checked={collectionIds.includes(item.id)} onChange={(event) => setCollectionIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} /><span>{item.name}</span></label>) : <small>Create a collection from Catalogue first.</small>}</fieldset>
      </div>
      <div className={styles.editorActions}>
        <Link href={`/products/${product.slug}`} target="_blank">View product <ExternalLink aria-hidden="true" size={14} /></Link>
        <span>{variant ? `${variant.sku} · ${inchesFromMm(variant.heightMm)} inches` : "Add the first selling details before publishing."}</span>
        <label className={styles.uploadButton}><Upload aria-hidden="true" size={15} /> Add photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={saving} onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.length) void uploadImages(files); event.currentTarget.value = ""; }} /></label>
        <button type="button" disabled={saving} onClick={saveProduct}><Save aria-hidden="true" size={16} /> {saving ? "Saving…" : "Save changes"}</button>
      </div>
      {!variant ? (
        <form className={styles.createForm} onSubmit={createFirstVariant}>
          <h3 className="font-display">Add selling details</h3>
          <label><span>SKU</span><input name="sku" required maxLength={100} placeholder="DSG-GANESHA-24" /></label>
          <label><span>Variant name</span><input name="variantName" required maxLength={160} placeholder="Standard" /></label>
          <label><span>Material</span><input name="material" required maxLength={160} placeholder="Makrana white marble" /></label>
          <label><span>Finish</span><input name="finish" maxLength={160} placeholder="Natural white or hand-painted" /></label>
          <label><span>Height (inches)</span><input name="heightInches" required inputMode="decimal" min="0.1" step="0.1" placeholder="24" /></label>
          <button type="submit" disabled={saving}>{saving ? "Adding…" : "Add selling details"}</button>
        </form>
      ) : null}
    </details>
  );
}

export function CatalogAdmin() {
  const { showToast } = useToast();
  const [payload, setPayload] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/admin/products", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setPayload(await response.json() as CatalogResponse);
    } catch {
      showToast("The staff catalogue could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/admin/products", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<CatalogResponse>;
      })
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch(() => {
        if (!cancelled) showToast("The staff catalogue could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [showToast]);

  const items = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (payload?.data ?? []).filter((product) => !normalized || [product.name, product.slug, product.category, product.deity].join(" ").toLowerCase().includes(normalized));
  }, [payload, query]);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const heightMm = mmFromInches(form.get("heightInches"));
    try {
      const response = await fetch("/api/v1/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      if (!response.ok) throw new Error("product");
      const created = await response.json() as { data: AdminProduct | null };
      if (!created.data?.id) throw new Error("product");

      const variantResponse = await fetch(`/api/v1/admin/products/${encodeURIComponent(created.data.id)}/variants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sku: form.get("sku"),
          name: form.get("variantName"),
          material: form.get("material"),
          finish: form.get("finish"),
          heightMm,
          inventoryKind: "unique",
          stockQuantity: 0,
          lowStockThreshold: 1,
          codEligible: true,
        }),
      });
      if (!variantResponse.ok) {
        showToast("The draft was created, but selling details failed. Open it below and add a unique SKU, material and height.");
        await load();
        return;
      }
      formElement.reset();
      setShowCreate(false);
      showToast("Draft product and sculpture details created.");
      await load();
    } catch {
      showToast("The draft product could not be created. Check the product details and try again.");
    }
  }

  return (
    <section className={styles.adminSection}>
      <div className="site-container">
        <div className={styles.toolbar}>
          <label><Search aria-hidden="true" size={17} /><span className="sr-only">Search products</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" /></label>
          <button type="button" onClick={() => void load()}><RefreshCw aria-hidden="true" size={16} /> Refresh</button>
          <button className={styles.primaryAction} type="button" onClick={() => setShowCreate((value) => !value)}><PackagePlus aria-hidden="true" size={16} /> Add product</button>
        </div>

        {showCreate ? (
          <form className={styles.createForm} onSubmit={createProduct}>
            <h2 className="font-display">Create a draft product</h2>
            <label><span>Name</span><input name="name" required maxLength={180} /></label>
            <label><span>Category</span><select name="categoryId" required><option value="">Choose category</option>{payload?.lookups.categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label><span>Deity</span><select name="deityId" required><option value="">Choose deity</option>{payload?.lookups.deities.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label><span>SKU</span><input name="sku" required maxLength={100} placeholder="DSG-HANUMAN-24" /></label>
            <label><span>Variant name</span><input name="variantName" required maxLength={160} placeholder="Standard" /></label>
            <label><span>Material</span><input name="material" required maxLength={160} placeholder="Makrana white marble" /></label>
            <label><span>Finish</span><input name="finish" maxLength={160} placeholder="Natural white or hand-painted" /></label>
            <label><span>Sculpture height (inches)</span><input name="heightInches" type="number" required min="0.1" step="0.1" placeholder="24" /></label>
            <input type="hidden" name="productType" value="ready_made" /><input type="hidden" name="salesMode" value="both" />
            <button type="submit">Create draft</button>
          </form>
        ) : null}

        <div className={styles.summary}><strong>{items.length}</strong><span>{loading ? "Loading catalogue…" : "catalogue products"}</span><small>Products stay quote-only until price, GST, stock, dimensions and weight are complete.</small></div>
        <div className={styles.productList}>{items.map((product) => <ProductEditor key={product.id} product={product} lookups={payload?.lookups ?? { categories: [], deities: [], collections: [] }} refresh={load} />)}</div>
      </div>
    </section>
  );
}
