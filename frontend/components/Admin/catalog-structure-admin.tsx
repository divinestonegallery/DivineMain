// @ts-nocheck
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FolderTree, Gem, Plus, RefreshCw, Sparkles } from "lucide-react";
import { apiRequest } from "@/api/client";
import { useToast } from "@/components/ui/toast";
import styles from "./commerce-admin.module.css";

type Kind = "category" | "material" | "deity";

type TaxonomyItem = {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
};

type TaxonomyState = Record<Kind, TaxonomyItem[]>;

const specs = {
  category: { title: "Categories", description: "Customer-facing product groupings", endpoint: "/api/admin/products/categories", icon: FolderTree },
  material: { title: "Materials", description: "Stone and finish families", endpoint: "/api/admin/products/materials", icon: Gem },
  deity: { title: "Deities", description: "Subjects used for filtering and product identity", endpoint: "/api/admin/products/deities", icon: Sparkles },
};

const initialState: TaxonomyState = { category: [], material: [], deity: [] };

function payloadFor(kind: Kind, form: FormData) {
  const base = {
    name: form.get("name")?.toString().trim(),
    is_active: form.get("is_active") === "on",
  };
  if (kind === "category") {
    return {
      ...base,
      description: form.get("description")?.toString().trim() || "",
      image_url: form.get("image_url")?.toString().trim() || "",
    };
  }
  if (kind === "deity") return { ...base };
  return base;
}

function TaxonomyColumn({ kind, items, refresh }: { kind: Kind; items: TaxonomyItem[]; refresh: () => Promise<void> }) {
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const spec = specs[kind];
  const Icon = spec.icon;

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await apiRequest<TaxonomyItem>(spec.endpoint, {
        method: "POST",
        body: JSON.stringify(payloadFor(kind, new FormData(event.currentTarget))),
      });
      event.currentTarget.reset();
      setCreating(false);
      showToast(`${spec.title.slice(0, -1)} created.`);
      await refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Record could not be created.");
    }
  }

  async function save(event: FormEvent<HTMLFormElement>, item: TaxonomyItem) {
    event.preventDefault();
    try {
      await apiRequest<TaxonomyItem>(`${spec.endpoint}/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify(payloadFor(kind, new FormData(event.currentTarget))),
      });
      showToast(`${item.name} saved.`);
      await refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Record could not be saved.");
    }
  }

  return (
    <article className={styles.structureCard}>
      <header>
        <span><Icon size={18} /></span>
        <div><h2>{spec.title}</h2><p>{spec.description}</p></div>
        <button type="button" onClick={() => setCreating((value) => !value)} aria-label={`Create ${kind}`}><Plus size={16} /></button>
      </header>
      {creating ? (
        <form className={styles.createStructure} onSubmit={create}>
          <label><span>Name</span><input name="name" required /></label>
          {kind === "category" ? (
            <>
              <label><span>Description</span><textarea name="description" /></label>
              <label><span>Image URL</span><input name="image_url" type="url" /></label>
            </>
          ) : null}
          <label className={styles.checkField}><input name="is_active" type="checkbox" defaultChecked /><span>Active</span></label>
          <button className={styles.primaryButton} type="submit">Create</button>
        </form>
      ) : null}
      <div className={styles.structureList}>
        {items.map((item) => (
          <details className={styles.structureRow} key={item.id}>
            <summary>
              <span className={item.is_active === false ? styles.inactiveDot : styles.liveDot} />
              <span><strong>{item.name}</strong><small>{item.slug || "slug pending"}</small></span>
              <span>{item.is_active === false ? "Inactive" : "Active"}</span>
            </summary>
            <form className={styles.structureEditor} onSubmit={(event) => void save(event, item)}>
              <label><span>Name</span><input name="name" defaultValue={item.name} required /></label>
              {kind === "category" ? (
                <>
                  <label><span>Image URL</span><input name="image_url" type="url" defaultValue={item.image_url || ""} /></label>
                  <label className={styles.wideField}><span>Description</span><textarea name="description" defaultValue={item.description || ""} /></label>
                </>
              ) : null}
              <label className={styles.checkField}><input name="is_active" type="checkbox" defaultChecked={item.is_active !== false} /><span>Active</span></label>
              <div className={styles.rowActions}><button className={styles.primaryButton} type="submit">Save</button></div>
            </form>
          </details>
        ))}
        {!items.length ? <p className={styles.emptyMessage}>No {spec.title.toLowerCase()} yet.</p> : null}
      </div>
    </article>
  );
}

export function CatalogStructureAdmin() {
  const { showToast } = useToast();
  const [state, setState] = useState<TaxonomyState>(initialState);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [categories, materials, deities] = await Promise.all([
        apiRequest<TaxonomyItem[]>(specs.category.endpoint),
        apiRequest<TaxonomyItem[]>(specs.material.endpoint),
        apiRequest<TaxonomyItem[]>(specs.deity.endpoint),
      ]);
      setState({ category: categories, material: materials, deity: deities });
    } catch {
      showToast("Catalogue structure could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const total = useMemo(() => Object.values(state).reduce((sum, items) => sum + items.length, 0), [state]);

  return (
    <section className={styles.managementSection}>
      <div className={styles.sectionToolbar}>
        <div><strong>{total}</strong><span>{loading ? "Loading taxonomy..." : "taxonomy records connected"}</span></div>
        <button className={styles.secondaryButton} type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} /> Refresh</button>
      </div>
      <div className={styles.structureGrid}>
        <TaxonomyColumn kind="category" items={state.category} refresh={refresh} />
        <TaxonomyColumn kind="material" items={state.material} refresh={refresh} />
        <TaxonomyColumn kind="deity" items={state.deity} refresh={refresh} />
      </div>
    </section>
  );
}
