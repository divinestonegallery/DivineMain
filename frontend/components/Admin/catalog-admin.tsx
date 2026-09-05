// @ts-nocheck
"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Image as ImageIcon, Plus, RefreshCw, Search } from "lucide-react";
import { apiRequest } from "@/api/client";
import { useToast } from "@/components/ui/toast";
import styles from "./catalog-admin.module.css";

type Taxonomy = {
  id: number;
  name: string;
  slug?: string;
  is_active?: boolean;
};

type ProductImage = {
  id: number;
  image_url?: string;
  alt_text?: string;
  cover_photo?: boolean;
};

type AdminProduct = {
  id: number;
  category: number;
  material: number;
  deity: number;
  name: string;
  slug: string;
  uid?: string;
  short_description?: string;
  description?: string;
  keywords?: string;
  is_featured?: boolean;
  availability: "in_stock" | "made_to_order" | "out_of_stock";
  status: "draft" | "active" | "archived";
  sales_mode: "quote_only" | "buy_and_quote" | "direct_purchase";
  display_order?: number;
  images?: ProductImage[];
};

type ProductList = {
  items: AdminProduct[];
  pagination?: { total_items?: number };
};

type Lookups = {
  categories: Taxonomy[];
  materials: Taxonomy[];
  deities: Taxonomy[];
};

const emptyLookups: Lookups = { categories: [], materials: [], deities: [] };
const availabilityOptions = ["in_stock", "made_to_order", "out_of_stock"];
const statusOptions = ["draft", "active", "archived"];
const salesModeOptions = ["quote_only", "buy_and_quote", "direct_purchase"];

function label(value?: string) {
  return (value || "not set").replaceAll("_", " ");
}

function lookupName(items: Taxonomy[], id?: number) {
  return items.find((item) => item.id === id)?.name ?? "Not selected";
}

function coverImage(product: AdminProduct) {
  return product.images?.find((item) => item.cover_photo)?.image_url ?? product.images?.[0]?.image_url ?? "";
}

function completion(product: AdminProduct) {
  const hasImage = Boolean(product.images?.length);
  const hasTaxonomy = Boolean(product.category && product.material && product.deity);
  if (product.status === "active" && hasImage && hasTaxonomy) return "complete";
  return "incomplete";
}

function ProductEditor({ product, lookups, refresh }: { product: AdminProduct; lookups: Lookups; refresh: () => Promise<void> }) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const imageUrl = coverImage(product);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);

    try {
      await apiRequest<AdminProduct>(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.get("name"),
          category: Number(form.get("category")),
          material: Number(form.get("material")),
          deity: Number(form.get("deity")),
          short_description: form.get("short_description"),
          description: form.get("description"),
          keywords: form.get("keywords"),
          is_featured: form.get("is_featured") === "on",
          availability: form.get("availability"),
          status: form.get("status"),
          sales_mode: form.get("sales_mode"),
          display_order: Number(form.get("display_order") || 999),
        }),
      });
      showToast("Product saved.");
      await refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Product could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function attachImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const objectKey = form.get("object_key")?.toString().trim();
    if (!objectKey) return;
    setSaving(true);

    try {
      await apiRequest<ProductImage>(`/api/admin/products/${product.id}/images`, {
        method: "POST",
        body: JSON.stringify({
          object_key: objectKey,
          alt_text: form.get("alt_text")?.toString().trim() || product.name,
          cover_photo: form.get("cover_photo") === "on",
          display_order: Number(form.get("display_order") || 0),
        }),
      });
      showToast("Image attached.");
      event.currentTarget.reset();
      await refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Image could not be attached.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form className={styles.editorGrid} onSubmit={save}>
        <label><span>Name</span><input name="name" defaultValue={product.name} required /></label>
        <label><span>Category</span><select name="category" defaultValue={product.category} required>{lookups.categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label><span>Material</span><select name="material" defaultValue={product.material} required>{lookups.materials.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label><span>Deity</span><select name="deity" defaultValue={product.deity} required>{lookups.deities.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label><span>Status</span><select name="status" defaultValue={product.status}>{statusOptions.map((item) => <option value={item} key={item}>{label(item)}</option>)}</select></label>
        <label><span>Availability</span><select name="availability" defaultValue={product.availability}>{availabilityOptions.map((item) => <option value={item} key={item}>{label(item)}</option>)}</select></label>
        <label><span>Sales mode</span><select name="sales_mode" defaultValue={product.sales_mode}>{salesModeOptions.map((item) => <option value={item} key={item}>{label(item)}</option>)}</select></label>
        <label><span>Display order</span><input name="display_order" type="number" min="0" defaultValue={product.display_order ?? 999} /></label>
        <label className={styles.checkbox}><input name="is_featured" type="checkbox" defaultChecked={Boolean(product.is_featured)} /><span>Featured on home</span></label>
        <label><span>Short description</span><textarea name="short_description" defaultValue={product.short_description || ""} maxLength={500} /></label>
        <label><span>Keywords</span><textarea name="keywords" defaultValue={product.keywords || ""} /></label>
        <label><span>Description</span><textarea name="description" defaultValue={product.description || ""} /></label>
        <div className={styles.editorActions}>
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save product"}</button>
          {product.slug ? <Link href={`/products/${product.slug}`} target="_blank">Open product <ExternalLink size={14} /></Link> : null}
        </div>
      </form>
      <form className={styles.editorGrid} onSubmit={attachImage}>
        <label><span>Presigned object key</span><input name="object_key" placeholder="product-images/..." /></label>
        <label><span>Alt text</span><input name="alt_text" defaultValue={product.name} /></label>
        <label><span>Image order</span><input name="display_order" type="number" min="0" defaultValue={product.images?.length ?? 0} /></label>
        <label className={styles.checkbox}><input name="cover_photo" type="checkbox" defaultChecked={!product.images?.length} /><span>Use as cover</span></label>
        <div className={styles.editorActions}>
          <button type="submit" disabled={saving}>Attach uploaded image</button>
          <small>Upload files through the backend presigned upload flow, then paste the returned object key here.</small>
        </div>
      </form>
      {product.images?.length ? (
        <div className={styles.editorActions}>
          <small>{product.images.length} image{product.images.length === 1 ? "" : "s"} attached. Cover: {imageUrl ? "ready" : "not selected"}.</small>
        </div>
      ) : null}
    </>
  );
}

export function CatalogAdmin() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [lookups, setLookups] = useState<Lookups>(emptyLookups);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [productList, categories, materials, deities] = await Promise.all([
        apiRequest<ProductList>("/api/admin/products?page_size=100"),
        apiRequest<Taxonomy[]>("/api/admin/products/categories"),
        apiRequest<Taxonomy[]>("/api/admin/products/materials"),
        apiRequest<Taxonomy[]>("/api/admin/products/deities"),
      ]);
      setProducts(productList.items ?? []);
      setLookups({ categories, materials, deities });
    } catch {
      showToast("Catalogue could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) => `${product.name} ${product.slug} ${product.uid}`.toLowerCase().includes(needle));
  }, [products, query]);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiRequest<AdminProduct>("/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          category: Number(form.get("category")),
          material: Number(form.get("material")),
          deity: Number(form.get("deity")),
          short_description: form.get("short_description"),
          availability: "made_to_order",
          status: "draft",
          sales_mode: "quote_only",
          display_order: Number(form.get("display_order") || 999),
        }),
      });
      event.currentTarget.reset();
      setShowCreate(false);
      showToast("Draft product created.");
      await load();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Draft product could not be created.");
    }
  }

  return (
    <section className={styles.adminSection}>
      <div className={styles.toolbar}>
        <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" /></label>
        <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button>
        <button className={styles.primaryAction} type="button" onClick={() => setShowCreate((value) => !value)}><Plus size={15} /> New draft</button>
      </div>

      {showCreate ? (
        <form className={styles.createForm} onSubmit={createProduct}>
          <h2 className="font-display">Create draft product</h2>
          <label><span>Name</span><input name="name" required /></label>
          <label><span>Category</span><select name="category" required><option value="">Choose</option>{lookups.categories.filter((item) => item.is_active !== false).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label><span>Material</span><select name="material" required><option value="">Choose</option>{lookups.materials.filter((item) => item.is_active !== false).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label><span>Deity</span><select name="deity" required><option value="">Choose</option>{lookups.deities.filter((item) => item.is_active !== false).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label><span>Order</span><input name="display_order" type="number" min="0" defaultValue="999" /></label>
          <label><span>Short description</span><input name="short_description" maxLength={500} /></label>
          <button type="submit">Create</button>
        </form>
      ) : null}

      <div className={styles.summary}>
        <strong>{filteredProducts.length}</strong>
        <span>{loading ? "Loading catalogue..." : "products connected to Django"}</span>
        <small>{products.filter((product) => product.status === "active").length} active</small>
      </div>

      <div className={styles.productList}>
        {filteredProducts.map((product) => {
          const imageUrl = coverImage(product);
          return (
            <details className={styles.productRow} key={product.id}>
              <summary>
                <span className={styles.productThumb}>
                  {imageUrl ? <Image unoptimized src={imageUrl} alt={product.name} fill sizes="64px" /> : <ImageIcon size={20} />}
                </span>
                <span className={styles.productIdentity}>
                  <strong>{product.name}</strong>
                  <small>{lookupName(lookups.categories, product.category)} - {lookupName(lookups.materials, product.material)} - {lookupName(lookups.deities, product.deity)}</small>
                </span>
                <span className={`${styles.statusPill} ${styles[product.status]}`}>{label(product.status)}</span>
                <span className={styles[completion(product)]}>{label(completion(product))}</span>
                <ChevronDown className={styles.chevron} size={18} />
              </summary>
              <ProductEditor product={product} lookups={lookups} refresh={load} />
            </details>
          );
        })}
        {!loading && !filteredProducts.length ? <div className={styles.stateCard}><h2 className="font-display">No products found.</h2><p>Create a draft product after adding active category, material and deity records.</p></div> : null}
      </div>
    </section>
  );
}
