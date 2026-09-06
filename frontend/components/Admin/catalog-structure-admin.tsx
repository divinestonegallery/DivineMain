"use client";

import { FormEvent, useCallback, useEffect, useId, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { FolderTree, Gem, Plus, RefreshCw, Sparkles } from "lucide-react";
import { apiRequest } from "@/api/client";
import {
  AdminCategoryPicker,
  AdminCheckboxField,
  AdminEntityModal,
  AdminFieldGrid,
  type AdminFieldErrors,
  AdminModalField,
  AdminModalForm,
  adminEntityModalStyles,
  getFieldError,
  parseAdminFormError,
  type AdminEntityMode,
} from "@/components/Admin/admin-entity-modal";
import { AdminImageUpload, uploadPendingAdminImages, type AdminSelectedImage } from "@/components/Admin/admin-image-upload";
import { useToast } from "@/components/ui/toast";
import styles from "./commerce-admin.module.css";

export type CatalogStructureKind = "category" | "material" | "deity";

type TaxonomyItem = {
  id: number;
  name: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  categories?: number[];
  is_active?: boolean;
};

type TaxonomyPayload = {
  name: string;
  is_active: boolean;
  description?: string;
  image_url?: string;
  categories?: number[];
};

type TaxonomyState = Record<CatalogStructureKind, TaxonomyItem[]>;
type TaxonomyModalState = { mode: AdminEntityMode; item?: TaxonomyItem };

const specs: Record<CatalogStructureKind, { title: string; singular: string; description: string; endpoint: string; icon: LucideIcon }> = {
  category: { title: "Categories", singular: "Category", description: "Customer-facing product groupings", endpoint: "/api/admin/products/categories", icon: FolderTree },
  material: { title: "Materials", singular: "Material", description: "Stone and finish families", endpoint: "/api/admin/products/materials", icon: Gem },
  deity: { title: "Deities", singular: "Deity", description: "Subjects used for filtering and product identity", endpoint: "/api/admin/products/deities", icon: Sparkles },
};

const initialState: TaxonomyState = { category: [], material: [], deity: [] };

function text(value: FormDataEntryValue | null | undefined) {
  return value?.toString().trim() ?? "";
}

function sortTaxonomy(items: TaxonomyItem[]) {
  return [...items].sort((first, second) => first.name.localeCompare(second.name));
}

function upsertTaxonomyItem(items: TaxonomyItem[], saved: TaxonomyItem) {
  const exists = items.some((item) => item.id === saved.id);
  return sortTaxonomy(exists ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]);
}

function payloadFor(kind: CatalogStructureKind, form: FormData, imageUrl?: string): TaxonomyPayload {
  const base: TaxonomyPayload = {
    name: text(form.get("name")),
    is_active: form.get("is_active") === "on",
  };

  if (kind === "category") {
    const payload: TaxonomyPayload = {
      ...base,
      description: text(form.get("description")),
    };
    if (imageUrl) payload.image_url = imageUrl;
    return payload;
  }

  if (kind === "deity") {
    return {
      ...base,
      categories: form.getAll("categories").map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0),
    };
  }

  return base;
}

function validateTaxonomy(kind: CatalogStructureKind, form: FormData) {
  const fieldErrors: AdminFieldErrors = {};
  if (!text(form.get("name"))) {
    fieldErrors.name = `${specs[kind].singular} name is required.`;
  }
  return fieldErrors;
}

function TaxonomyModal({
  kind,
  state,
  categories,
  onClose,
  onSaved,
}: {
  kind: CatalogStructureKind;
  state: TaxonomyModalState;
  categories: TaxonomyItem[];
  onClose: () => void;
  onSaved: (kind: CatalogStructureKind, saved: TaxonomyItem) => void;
}) {
  const { showToast } = useToast();
  const formId = useId();
  const spec = specs[kind];
  const selectedCategories = new Set((state.item?.categories ?? []).map(Number));
  const [selectedImages, setSelectedImages] = useState<AdminSelectedImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AdminFieldErrors>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const validation = validateTaxonomy(kind, form);
    setError(null);
    setFieldErrors(validation);
    if (Object.keys(validation).length) return;

    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (kind === "category" && selectedImages.length) {
        const [upload] = await uploadPendingAdminImages(selectedImages, setSelectedImages);
        if (!upload.upload.public_url) throw new Error("Upload completed, but the API did not return an image URL.");
        imageUrl = upload.upload.public_url;
      }

      const saved = await apiRequest<TaxonomyItem>(
        state.mode === "create" ? spec.endpoint : `${spec.endpoint}/${state.item?.id}`,
        {
          method: state.mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify(payloadFor(kind, form, imageUrl)),
        },
      );
      onSaved(kind, saved);
      showToast(`${spec.singular} ${state.mode === "create" ? "created" : "updated"}.`);
      onClose();
    } catch (reason) {
      const nextError = parseAdminFormError(reason, `${spec.singular} could not be saved.`);
      setError(nextError.message);
      setFieldErrors(nextError.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminEntityModal
      open
      mode={state.mode}
      entityLabel={spec.singular}
      formId={formId}
      onClose={onClose}
      submitting={submitting}
      error={error}
    >
      <AdminModalForm id={formId} onSubmit={submit}>
        <AdminFieldGrid>
          <AdminModalField label="Name" required error={getFieldError(fieldErrors, "name")}>
            <input name="name" defaultValue={state.item?.name ?? ""} aria-invalid={Boolean(getFieldError(fieldErrors, "name"))} />
          </AdminModalField>

          {kind === "category" ? (
            <>
              <AdminModalField label="Description" wide error={getFieldError(fieldErrors, "description")}>
                <textarea name="description" defaultValue={state.item?.description ?? ""} aria-invalid={Boolean(getFieldError(fieldErrors, "description"))} />
              </AdminModalField>
              <AdminImageUpload
                label="Category Image"
                description="Upload or drag & drop a JPG, PNG, or WEBP image."
                selectedImages={selectedImages}
                onSelectedImagesChange={setSelectedImages}
                existingImages={state.item?.image_url ? [{ id: state.item.id, image_url: state.item.image_url, alt_text: state.item.name }] : []}
                maxFiles={1}
                disabled={submitting}
              />
            </>
          ) : null}

          {kind === "deity" ? (
            <AdminCategoryPicker
              label="Linked categories"
              error={getFieldError(fieldErrors, "categories")}
              hint="Optional: choose the categories where this deity should appear."
            >
              {categories.length ? categories.map((category) => (
                <label className={adminEntityModalStyles.choicePill} key={category.id}>
                  <input name="categories" type="checkbox" value={category.id} defaultChecked={selectedCategories.has(category.id)} />
                  <span>{category.name}</span>
                </label>
              )) : <p className={adminEntityModalStyles.hint}>No categories are available yet.</p>}
            </AdminCategoryPicker>
          ) : null}

          <AdminCheckboxField label="Active" error={getFieldError(fieldErrors, "is_active")}>
            <input name="is_active" type="checkbox" defaultChecked={state.item?.is_active !== false} />
          </AdminCheckboxField>
        </AdminFieldGrid>
      </AdminModalForm>
    </AdminEntityModal>
  );
}

function TaxonomyColumn({
  kind,
  items,
  categories,
  onSaved,
}: {
  kind: CatalogStructureKind;
  items: TaxonomyItem[];
  categories: TaxonomyItem[];
  onSaved: (kind: CatalogStructureKind, saved: TaxonomyItem) => void;
}) {
  const [modal, setModal] = useState<TaxonomyModalState | null>(null);
  const spec = specs[kind];
  const Icon = spec.icon;

  return (
    <article className={styles.structureCard}>
      <header>
        <span><Icon size={18} /></span>
        <div><h2>{spec.title}</h2><p>{spec.description}</p></div>
        <button type="button" onClick={() => setModal({ mode: "create" })} aria-label={`Add ${spec.singular}`}>
          <Plus size={16} />
        </button>
      </header>
      <div className={styles.structureList}>
        {items.map((item) => (
          <div className={styles.structureItemRow} key={item.id}>
            <span className={item.is_active === false ? styles.inactiveDot : styles.liveDot} />
            <span className={styles.structureIdentity}>
              <strong>{item.name}</strong>
              <small>{item.slug || "slug pending"}</small>
            </span>
            <span className={styles.structureStatus}>{item.is_active === false ? "Inactive" : "Active"}</span>
            <button className={styles.secondaryButton} type="button" onClick={() => setModal({ mode: "edit", item })}>Edit</button>
          </div>
        ))}
        {!items.length ? <p className={styles.emptyMessage}>No {spec.title.toLowerCase()} yet.</p> : null}
      </div>
      {modal ? (
        <TaxonomyModal
          key={`${kind}-${modal.mode}-${modal.item?.id ?? "new"}`}
          kind={kind}
          state={modal}
          categories={categories}
          onSaved={onSaved}
          onClose={() => setModal(null)}
        />
      ) : null}
    </article>
  );
}

export function CatalogStructureAdmin({ kind }: { kind?: CatalogStructureKind } = {}) {
  const { showToast } = useToast();
  const [state, setState] = useState<TaxonomyState>(initialState);
  const [loading, setLoading] = useState(true);
  const visibleKinds = useMemo<CatalogStructureKind[]>(
    () => kind ? [kind] : ["category", "material", "deity"],
    [kind],
  );
  const fetchKinds = useMemo<CatalogStructureKind[]>(() => {
    const keys = new Set<CatalogStructureKind>(visibleKinds);
    if (kind === "deity") keys.add("category");
    return [...keys];
  }, [kind, visibleKinds]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await Promise.all(
        fetchKinds.map(async (key) => [key, await apiRequest<TaxonomyItem[]>(specs[key].endpoint)] as const),
      );
      setState((current) => {
        const nextState: TaxonomyState = { ...current };
        entries.forEach(([key, items]) => {
          nextState[key] = sortTaxonomy(items);
        });
        return nextState;
      });
    } catch {
      showToast("Catalogue structure could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [fetchKinds, showToast]);

  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  const saveTaxonomy = useCallback((savedKind: CatalogStructureKind, saved: TaxonomyItem) => {
    setState((current) => ({
      ...current,
      [savedKind]: upsertTaxonomyItem(current[savedKind], saved),
    }));
  }, []);

  const total = useMemo(() => visibleKinds.reduce((sum, key) => sum + state[key].length, 0), [state, visibleKinds]);

  return (
    <section className={styles.managementSection}>
      <div className={styles.sectionToolbar}>
        <div><strong>{total}</strong><span>{loading ? "Loading taxonomy..." : `${kind ? specs[kind].title.toLowerCase() : "taxonomy records"} connected`}</span></div>
        <button className={styles.secondaryButton} type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} /> Refresh</button>
      </div>
      <div className={`${styles.structureGrid} ${kind ? styles.structureGridSingle : ""}`}>
        {visibleKinds.map((visibleKind) => (
          <TaxonomyColumn
            kind={visibleKind}
            items={state[visibleKind]}
            categories={state.category}
            onSaved={saveTaxonomy}
            key={visibleKind}
          />
        ))}
      </div>
    </section>
  );
}
