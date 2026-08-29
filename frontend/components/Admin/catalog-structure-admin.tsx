// @ts-nocheck
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArchiveRestore, Check, Layers3, Plus, RefreshCw, Save, Sparkles, Tags } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import styles from "./commerce-admin.module.css";

type Kind = "category" | "deity" | "collection";
type CatalogItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  isFeatured?: boolean;
  sortOrder: number;
  productCount: number;
};
type Payload = {
  categories: CatalogItem[];
  deities: CatalogItem[];
  collections: CatalogItem[];
};

const sections: Array<{ kind: Kind; key: keyof Payload; title: string; description: string; icon: typeof Tags }> = [
  { kind: "category", key: "categories", title: "Categories", description: "Main shopping groups used in filters and product URLs.", icon: Tags },
  { kind: "deity", key: "deities", title: "Deities", description: "Help visitors quickly find the sacred form they need.", icon: Sparkles },
  { kind: "collection", key: "collections", title: "Collections", description: "Curated groups for home-page stories, festivals and campaigns.", icon: Layers3 },
];

function CatalogRow({ item, kind, onSaved }: { item: CatalogItem; kind: Kind; onSaved: (data: Payload) => void }) {
  const { showToast } = useToast();
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(item.sortOrder));
  const [isFeatured, setIsFeatured] = useState(Boolean(item.isFeatured));
  const [saving, setSaving] = useState(false);

  async function save(patch?: Record<string, unknown>) {
    setSaving(true);
    try {
      const response = await fetch("/api/v1/admin/catalog", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          id: item.id,
          name,
          ...(kind !== "deity" ? { description } : {}),
          sortOrder: Number(sortOrder),
          ...(kind === "collection" ? { isFeatured } : {}),
          ...patch,
        }),
      });
      if (!response.ok) throw new Error();
      const payload = await response.json() as { data: Payload };
      onSaved(payload.data);
      showToast(`${name} updated.`);
    } catch {
      showToast(`Could not update ${item.name}. Check the details and try again.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className={styles.structureRow}>
      <summary>
        <span className={item.isActive ? styles.liveDot : styles.inactiveDot} />
        <span><strong>{item.name}</strong><small>{item.productCount} product{item.productCount === 1 ? "" : "s"}</small></span>
        {kind === "collection" && item.isFeatured ? <em>Featured</em> : null}
        <span>{item.isActive ? "Active" : "Hidden"}</span>
      </summary>
      <div className={styles.structureEditor}>
        <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label><span>Display order</span><input inputMode="numeric" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} /></label>
        {kind !== "deity" ? <label className={styles.wideField}><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></label> : null}
        {kind === "collection" ? <label className={styles.checkField}><input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} /><span>Feature this collection</span></label> : null}
        <div className={styles.rowActions}>
          <button className={styles.secondaryButton} type="button" disabled={saving} onClick={() => void save({ isActive: !item.isActive })}><ArchiveRestore size={15} />{item.isActive ? "Hide" : "Activate"}</button>
          <button className={styles.primaryButton} type="button" disabled={saving} onClick={() => void save()}><Save size={15} />{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </details>
  );
}

export function CatalogStructureAdmin() {
  const { showToast } = useToast();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<Kind | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/admin/catalog", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setData((await response.json() as { data: Payload }).data);
    } catch {
      showToast("Catalogue organization could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/admin/catalog", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ data: Payload }>;
      })
      .then((payload) => { if (!cancelled) setData(payload.data); })
      .catch(() => { if (!cancelled) showToast("Catalogue organization could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showToast]);

  const total = useMemo(() => data ? data.categories.length + data.deities.length + data.collections.length : 0, [data]);

  async function create(event: FormEvent<HTMLFormElement>, kind: Kind) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/admin/catalog", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, ...Object.fromEntries(form), isActive: true, isFeatured: form.get("isFeatured") === "on" }),
    });
    if (!response.ok) { showToast("This item could not be created. Check the details and try again."); return; }
    setData((await response.json() as { data: Payload }).data);
    setCreating(null);
    showToast(`${kind[0].toUpperCase()}${kind.slice(1)} created.`);
  }

  return (
    <section className={styles.managementSection}>
      <div className={styles.sectionToolbar}>
        <div><strong>{total}</strong><span>catalogue groups</span></div>
        <button className={styles.secondaryButton} onClick={() => void load()} disabled={loading}><RefreshCw size={16} />{loading ? "Loading…" : "Refresh"}</button>
      </div>
      <div className={styles.structureGrid}>
        {sections.map(({ kind, key, title, description, icon: Icon }) => (
          <section className={styles.structureCard} key={kind}>
            <header><span><Icon size={19} /></span><div><h2>{title}</h2><p>{description}</p></div><button aria-label={`Add ${kind}`} onClick={() => setCreating(creating === kind ? null : kind)}><Plus size={17} /></button></header>
            {creating === kind ? (
              <form className={styles.createStructure} onSubmit={(event) => void create(event, kind)}>
                <label><span>Name</span><input name="name" required maxLength={180} /></label>
                <label><span>Display order</span><input name="sortOrder" type="number" min="0" defaultValue="0" /></label>
                {kind !== "deity" ? <label><span>Description</span><textarea name="description" rows={2} maxLength={1000} /></label> : null}
                {kind === "collection" ? <label className={styles.checkField}><input type="checkbox" name="isFeatured" /><span>Feature this collection</span></label> : null}
                <button className={styles.primaryButton} type="submit"><Check size={15} />Create</button>
              </form>
            ) : null}
            <div className={styles.structureList}>
              {(data?.[key] ?? []).map((item) => <CatalogRow key={item.id} item={item} kind={kind} onSaved={setData} />)}
              {!loading && !(data?.[key].length) ? <p className={styles.emptyMessage}>No {title.toLowerCase()} yet.</p> : null}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
