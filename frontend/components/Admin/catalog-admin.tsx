"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ExternalLink, Image as ImageIcon, Plus, RefreshCw, Search } from "lucide-react";
import { ApiError, apiRequest } from "@/api/client";
import {
  AdminImageUpload,
  uploadPendingAdminImages,
  type AdminExistingImage,
  type AdminSelectedImage,
  type UploadedAdminSelection,
} from "@/components/Admin/admin-image-upload";
import {
  AdminCheckboxField,
  AdminEntityModal,
  AdminFieldGrid,
  type AdminFieldErrors,
  AdminModalField,
  AdminModalForm,
  AdminModalSection,
  getFieldError,
  parseAdminFormError,
} from "@/components/Admin/admin-entity-modal";
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
  object_key?: string;
  alt_text?: string;
  display_order?: number;
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
  short_description?: string | null;
  description?: string | null;
  keywords?: string[] | string | null;
  height?: string | number | null;
  min_weight?: string | number | null;
  max_weight?: string | number | null;
  original_price?: string | number | null;
  selling_price?: string | number | null;
  gst?: string | number | null;
  is_featured?: boolean;
  availability: "in_stock" | "made_to_order" | "out_of_stock";
  status: "draft" | "active" | "archived";
  sales_mode: "quote_only" | "buy_and_quote" | "direct_purchase";
  display_order?: number;
  images?: ProductImage[];
};

type ProductList = {
  items?: AdminProduct[];
  pagination?: { total_items?: number };
};

type Lookups = {
  categories: Taxonomy[];
  materials: Taxonomy[];
  deities: Taxonomy[];
};

type ProductModalState = { mode: "create" } | { mode: "edit"; product: AdminProduct };

const emptyLookups: Lookups = { categories: [], materials: [], deities: [] };
const availabilityOptions: AdminProduct["availability"][] = ["in_stock", "made_to_order", "out_of_stock"];
const statusOptions: AdminProduct["status"][] = ["draft", "active", "archived"];
const salesModeOptions: AdminProduct["sales_mode"][] = ["quote_only", "buy_and_quote", "direct_purchase"];
const maxProductImages = 12;

function text(value: FormDataEntryValue | null | undefined) {
  return value?.toString().trim() ?? "";
}

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

function productValue(product: AdminProduct | undefined, key: keyof AdminProduct) {
  const value = product?.[key];
  return value == null ? "" : String(value);
}

function numericId(form: FormData, key: string) {
  const value = Number(form.get(key));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function addOptionalText(payload: Record<string, unknown>, form: FormData, key: string) {
  const value = text(form.get(key));
  if (value) payload[key] = value;
}

function normalizeKeywords(value: AdminProduct["keywords"]): string[] {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\n,]/) : [];
  return Array.from(new Set(values.map((keyword) => keyword.trim()).filter(Boolean)));
}

function validateProduct(form: FormData) {
  const fieldErrors: AdminFieldErrors = {};
  if (!text(form.get("name"))) fieldErrors.name = "Product name is required.";
  if (!numericId(form, "category")) fieldErrors.category = "Choose a category.";
  if (!numericId(form, "material")) fieldErrors.material = "Choose a material.";
  if (!numericId(form, "deity")) fieldErrors.deity = "Choose a deity.";
  return fieldErrors;
}

function productPayload(form: FormData, keywords: string[]) {
  const payload: Record<string, unknown> = {
    name: text(form.get("name")),
    category: numericId(form, "category"),
    material: numericId(form, "material"),
    deity: numericId(form, "deity"),
    short_description: text(form.get("short_description")),
    description: text(form.get("description")),
    keywords,
    is_featured: form.get("is_featured") === "on",
    availability: text(form.get("availability")),
    status: text(form.get("status")),
    sales_mode: text(form.get("sales_mode")),
    display_order: Number(form.get("display_order") || 999),
  };

  ["height", "min_weight", "max_weight", "original_price", "selling_price", "gst"].forEach((key) => {
    addOptionalText(payload, form, key);
  });

  return payload;
}

function upsertProduct(items: AdminProduct[], saved: AdminProduct, mode: ProductModalState["mode"]) {
  if (mode === "create") return [saved, ...items.filter((item) => item.id !== saved.id)];
  return items.map((item) => item.id === saved.id ? saved : item);
}

function upsertImage(images: ProductImage[] | undefined, saved: ProductImage) {
  const nextImages = (images ?? [])
    .filter((image) => image.id !== saved.id)
    .map((image) => saved.cover_photo ? { ...image, cover_photo: false } : image);
  return [...nextImages, saved].sort((first, second) => Number(first.display_order ?? 0) - Number(second.display_order ?? 0));
}

function removeImage(images: ProductImage[] | undefined, imageId: number) {
  return (images ?? []).filter((image) => image.id !== imageId);
}

async function attachUploadedProductImages(product: AdminProduct, uploads: UploadedAdminSelection[]) {
  let nextProduct = product;

  for (const upload of uploads) {
    const currentImageCount = nextProduct.images?.length ?? 0;
    let image: ProductImage;
    try {
      image = await apiRequest<ProductImage>(`/api/admin/products/${product.id}/images`, {
        method: "POST",
        body: JSON.stringify({
          object_key: upload.upload.object_key,
          alt_text: upload.selection.file.name || product.name,
          cover_photo: currentImageCount === 0,
          display_order: currentImageCount,
        }),
      });
    } catch (reason) {
      if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) throw reason;
      throw new Error("Image uploaded, but it could not be attached to the product.");
    }
    nextProduct = { ...nextProduct, images: upsertImage(nextProduct.images, image) };
  }

  return nextProduct;
}

function TaxonomySelect({
  name,
  label: selectLabel,
  items,
  currentId,
  createMode,
  error,
}: {
  name: "category" | "material" | "deity";
  label: string;
  items: Taxonomy[];
  currentId?: number;
  createMode: boolean;
  error?: string;
}) {
  const options = createMode ? items.filter((item) => item.is_active !== false) : items;
  return (
    <AdminModalField label={selectLabel} required error={error}>
      <select name={name} defaultValue={currentId ?? ""} aria-invalid={Boolean(error)}>
        <option value="">Choose {selectLabel.toLowerCase()}</option>
        {options.map((item) => (
          <option value={item.id} key={item.id}>
            {item.name}{item.is_active === false ? " (inactive)" : ""}
          </option>
        ))}
      </select>
    </AdminModalField>
  );
}

function ProductModal({
  state,
  lookups,
  onClose,
  onSaved,
  onImageRemoved,
  onImageUpdated,
}: {
  state: ProductModalState;
  lookups: Lookups;
  onClose: () => void;
  onSaved: (product: AdminProduct, mode: ProductModalState["mode"]) => void;
  onImageRemoved: (productId: number, imageId: number) => void;
  onImageUpdated: (productId: number, image: ProductImage) => void;
}) {
  const { showToast } = useToast();
  const formId = useId();
  const [currentProduct, setCurrentProduct] = useState<AdminProduct | undefined>(state.mode === "edit" ? state.product : undefined);
  const product = state.mode === "edit" ? currentProduct : undefined;
  const [selectedImages, setSelectedImages] = useState<AdminSelectedImage[]>([]);
  const [keywords, setKeywords] = useState<string[]>(() => normalizeKeywords(state.mode === "edit" ? state.product.keywords : []));
  const [keywordInput, setKeywordInput] = useState("");
  const keywordInputId = useId();
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const [imageActionId, setImageActionId] = useState<string | number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AdminFieldErrors>({});

  function addKeyword() {
    const nextKeyword = keywordInput.trim();
    if (!nextKeyword || keywords.includes(nextKeyword)) return;

    setKeywords((current) => [...current, nextKeyword]);
    setKeywordInput("");
    keywordInputRef.current?.focus();
  }

  function handleKeywordKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addKeyword();
  }

  async function removeExistingImage(image: AdminExistingImage) {
    if (!product) return;
    const imageId = Number(image.id);
    if (!Number.isFinite(imageId)) return;
    if (!window.confirm("Remove this product image?")) return;

    setImageActionId(image.id);
    setError(null);
    try {
      await apiRequest(`/api/admin/products/${product.id}/images/${imageId}`, { method: "DELETE" });
      setCurrentProduct((current) => current ? { ...current, images: removeImage(current.images, imageId) } : current);
      onImageRemoved(product.id, imageId);
      showToast("Product image removed.");
    } catch (reason) {
      const nextError = parseAdminFormError(reason, "Product image could not be removed.");
      setError(nextError.message);
    } finally {
      setImageActionId(null);
    }
  }

  async function setCoverImage(image: AdminExistingImage) {
    if (!product) return;
    const imageId = Number(image.id);
    if (!Number.isFinite(imageId)) return;

    setImageActionId(image.id);
    setError(null);
    try {
      const savedImage = await apiRequest<ProductImage>(`/api/admin/products/${product.id}/images/${imageId}`, {
        method: "PATCH",
        body: JSON.stringify({ cover_photo: true }),
      });
      setCurrentProduct((current) => current ? { ...current, images: upsertImage(current.images, savedImage) } : current);
      onImageUpdated(product.id, savedImage);
      showToast("Cover image updated.");
    } catch (reason) {
      const nextError = parseAdminFormError(reason, "Cover image could not be updated.");
      setError(nextError.message);
    } finally {
      setImageActionId(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const validation = validateProduct(form);
    setError(null);
    setFieldErrors(validation);
    if (Object.keys(validation).length) return;

    setSubmitting(true);
    try {
      const uploadedImages = selectedImages.length ? await uploadPendingAdminImages(selectedImages, setSelectedImages) : [];
      const saved = await apiRequest<AdminProduct>(
        state.mode === "create" ? "/api/admin/products" : `/api/admin/products/${product?.id}`,
        {
          method: state.mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify(productPayload(form, keywords)),
        },
      );
      const savedWithImages = await attachUploadedProductImages(saved, uploadedImages);
      setSelectedImages([]);
      setCurrentProduct(savedWithImages);
      onSaved(savedWithImages, state.mode);
      showToast(`Product ${state.mode === "create" ? "created" : "updated"}.`);
      onClose();
    } catch (reason) {
      const nextError = parseAdminFormError(reason, "Product could not be saved.");
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
      entityLabel="Product"
      formId={formId}
      onClose={onClose}
      submitting={submitting}
      error={error}
      size="wide"
    >
      <AdminModalForm id={formId} onSubmit={submit}>
        <AdminModalSection title="Basic information">
          <AdminFieldGrid>
            <AdminModalField label="Name" required wide error={getFieldError(fieldErrors, "name")}>
              <input name="name" defaultValue={product?.name ?? ""} aria-invalid={Boolean(getFieldError(fieldErrors, "name"))} />
            </AdminModalField>
            <AdminModalField label="Short description" wide error={getFieldError(fieldErrors, "short_description")}>
              <textarea name="short_description" defaultValue={product?.short_description ?? ""} maxLength={500} aria-invalid={Boolean(getFieldError(fieldErrors, "short_description"))} />
            </AdminModalField>
            <AdminModalField label="Description" wide error={getFieldError(fieldErrors, "description")}>
              <textarea name="description" defaultValue={product?.description ?? ""} aria-invalid={Boolean(getFieldError(fieldErrors, "description"))} />
            </AdminModalField>
            <div className={styles.keywordBuilderField}>
              <span className={styles.keywordBuilderLabel}>Keywords</span>
              <div className={styles.keywordBuilder}>
                <div className={styles.keywordEntry}>
                  <label htmlFor={keywordInputId}>Keyword</label>
                  <input
                    ref={keywordInputRef}
                    id={keywordInputId}
                    value={keywordInput}
                    placeholder="Enter keyword"
                    onChange={(event) => setKeywordInput(event.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    disabled={submitting}
                  />
                  <button type="button" onClick={addKeyword} disabled={submitting}>Add</button>
                </div>
                <div className={styles.keywordCollection} aria-live="polite">
                  <span className={styles.keywordCollectionLabel}>Add Section</span>
                  {keywords.length ? (
                    <div className={styles.keywordChips}>
                      {keywords.map((keyword) => (
                        <span className={styles.keywordChip} key={keyword}>
                          <span>{keyword}</span>
                          <button
                            type="button"
                            aria-label={`Remove keyword ${keyword}`}
                            onClick={() => setKeywords((current) => current.filter((item) => item !== keyword))}
                            disabled={submitting}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className={styles.keywordEmpty}>No keywords added yet.</span>
                  )}
                </div>
              </div>
              {getFieldError(fieldErrors, "keywords") ? <p className={styles.keywordFieldError}>{getFieldError(fieldErrors, "keywords")}</p> : null}
            </div>
          </AdminFieldGrid>
        </AdminModalSection>

        <AdminModalSection title="Classification">
          <AdminFieldGrid>
            <TaxonomySelect name="category" label="Category" items={lookups.categories} currentId={product?.category} createMode={state.mode === "create"} error={getFieldError(fieldErrors, "category")} />
            <TaxonomySelect name="material" label="Material" items={lookups.materials} currentId={product?.material} createMode={state.mode === "create"} error={getFieldError(fieldErrors, "material")} />
            <TaxonomySelect name="deity" label="Deity" items={lookups.deities} currentId={product?.deity} createMode={state.mode === "create"} error={getFieldError(fieldErrors, "deity", "diety")} />
          </AdminFieldGrid>
        </AdminModalSection>

        <AdminModalSection title="Publishing">
          <AdminFieldGrid>
            <AdminModalField label="Status" error={getFieldError(fieldErrors, "status")}>
              <select name="status" defaultValue={product?.status ?? "draft"} aria-invalid={Boolean(getFieldError(fieldErrors, "status"))}>
                {statusOptions.map((item) => <option value={item} key={item}>{label(item)}</option>)}
              </select>
            </AdminModalField>
            <AdminModalField label="Availability" error={getFieldError(fieldErrors, "availability")}>
              <select name="availability" defaultValue={product?.availability ?? "made_to_order"} aria-invalid={Boolean(getFieldError(fieldErrors, "availability"))}>
                {availabilityOptions.map((item) => <option value={item} key={item}>{label(item)}</option>)}
              </select>
            </AdminModalField>
            <AdminModalField label="Sales mode" error={getFieldError(fieldErrors, "sales_mode")}>
              <select name="sales_mode" defaultValue={product?.sales_mode ?? "quote_only"} aria-invalid={Boolean(getFieldError(fieldErrors, "sales_mode"))}>
                {salesModeOptions.map((item) => <option value={item} key={item}>{label(item)}</option>)}
              </select>
            </AdminModalField>
            <AdminModalField label="Display order" error={getFieldError(fieldErrors, "display_order")}>
              <input name="display_order" type="number" min="0" defaultValue={product?.display_order ?? 999} aria-invalid={Boolean(getFieldError(fieldErrors, "display_order"))} />
            </AdminModalField>
            <AdminCheckboxField label="Featured on home" error={getFieldError(fieldErrors, "is_featured")}>
              <input name="is_featured" type="checkbox" defaultChecked={Boolean(product?.is_featured)} />
            </AdminCheckboxField>
          </AdminFieldGrid>
        </AdminModalSection>

        <AdminModalSection title="Selling and measurements">
          <AdminFieldGrid>
            <AdminModalField label="Height" error={getFieldError(fieldErrors, "height")}>
              <input name="height" defaultValue={productValue(product, "height")} aria-invalid={Boolean(getFieldError(fieldErrors, "height"))} />
            </AdminModalField>
            <AdminModalField label="Minimum weight" error={getFieldError(fieldErrors, "min_weight")}>
              <input name="min_weight" defaultValue={productValue(product, "min_weight")} aria-invalid={Boolean(getFieldError(fieldErrors, "min_weight"))} />
            </AdminModalField>
            <AdminModalField label="Maximum weight" error={getFieldError(fieldErrors, "max_weight")}>
              <input name="max_weight" defaultValue={productValue(product, "max_weight")} aria-invalid={Boolean(getFieldError(fieldErrors, "max_weight"))} />
            </AdminModalField>
            <AdminModalField label="Original price" error={getFieldError(fieldErrors, "original_price")}>
              <input name="original_price" type="number" min="0" step="0.01" defaultValue={productValue(product, "original_price")} aria-invalid={Boolean(getFieldError(fieldErrors, "original_price"))} />
            </AdminModalField>
            <AdminModalField label="Selling price" error={getFieldError(fieldErrors, "selling_price")}>
              <input name="selling_price" type="number" min="0" step="0.01" defaultValue={productValue(product, "selling_price")} aria-invalid={Boolean(getFieldError(fieldErrors, "selling_price"))} />
            </AdminModalField>
            <AdminModalField label="GST" error={getFieldError(fieldErrors, "gst")} hint="Blank optional fields are not sent to the backend.">
              <input name="gst" type="number" min="0" step="0.01" defaultValue={productValue(product, "gst")} aria-invalid={Boolean(getFieldError(fieldErrors, "gst"))} />
            </AdminModalField>
          </AdminFieldGrid>
        </AdminModalSection>

        <AdminModalSection title="Images">
          <AdminImageUpload
            label="Product Images"
            description="Upload or drag & drop JPG, PNG, or WEBP images."
            selectedImages={selectedImages}
            onSelectedImagesChange={setSelectedImages}
            existingImages={product?.images ?? []}
            multiple
            maxFiles={maxProductImages}
            disabled={submitting || Boolean(imageActionId)}
            onRemoveExisting={product ? removeExistingImage : undefined}
            onSetCoverExisting={product ? setCoverImage : undefined}
          />
        </AdminModalSection>
      </AdminModalForm>

      {product ? (
        product.slug ? <Link className={styles.modalProductLink} href={`/products/${product.slug}`} target="_blank">Open product page <ExternalLink size={14} /></Link> : null
      ) : null}
    </AdminEntityModal>
  );
}

export function CatalogAdmin() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [lookups, setLookups] = useState<Lookups>(emptyLookups);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ProductModalState | null>(null);
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
    const task = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) => `${product.name} ${product.slug} ${product.uid}`.toLowerCase().includes(needle));
  }, [products, query]);

  const saveProduct = useCallback((product: AdminProduct, mode: ProductModalState["mode"]) => {
    setProducts((current) => upsertProduct(current, product, mode));
  }, []);

  const updateProductImage = useCallback((productId: number, image: ProductImage) => {
    setProducts((current) => current.map((product) => (
      product.id === productId ? { ...product, images: upsertImage(product.images, image) } : product
    )));
    setModal((current) => {
      if (!current || current.mode !== "edit" || current.product.id !== productId) return current;
      return { mode: "edit", product: { ...current.product, images: upsertImage(current.product.images, image) } };
    });
  }, []);

  const removeProductImageFromState = useCallback((productId: number, imageId: number) => {
    setProducts((current) => current.map((product) => (
      product.id === productId ? { ...product, images: removeImage(product.images, imageId) } : product
    )));
    setModal((current) => {
      if (!current || current.mode !== "edit" || current.product.id !== productId) return current;
      return { mode: "edit", product: { ...current.product, images: removeImage(current.product.images, imageId) } };
    });
  }, []);

  return (
    <section className={styles.adminSection}>
      <div className={styles.toolbar}>
        <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" /></label>
        <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button>
        <button className={styles.primaryAction} type="button" onClick={() => setModal({ mode: "create" })}><Plus size={15} /> Add Product</button>
      </div>

      <div className={styles.summary}>
        <strong>{filteredProducts.length}</strong>
        <span>{loading ? "Loading catalogue..." : "products connected to Django"}</span>
        <small>{products.filter((product) => product.status === "active").length} active</small>
      </div>

      <div className={styles.productList}>
        {filteredProducts.map((product) => {
          const imageUrl = coverImage(product);
          return (
            <article className={styles.productRow} key={product.id}>
              <div className={styles.productSummary}>
                <span className={styles.productThumb}>
                  {imageUrl ? <Image unoptimized src={imageUrl} alt={product.name} fill sizes="64px" /> : <ImageIcon size={20} />}
                </span>
                <span className={styles.productIdentity}>
                  <strong>{product.name}</strong>
                  <small>{lookupName(lookups.categories, product.category)} - {lookupName(lookups.materials, product.material)} - {lookupName(lookups.deities, product.deity)}</small>
                </span>
                <span className={`${styles.statusPill} ${styles[product.status]}`}>{label(product.status)}</span>
                <span className={styles[completion(product)]}>{label(completion(product))}</span>
                <span className={styles.productActions}>
                  {product.slug ? <Link href={`/products/${product.slug}`} target="_blank" aria-label={`Open ${product.name}`}><ExternalLink size={15} /></Link> : null}
                  <button type="button" onClick={() => setModal({ mode: "edit", product })}>Edit</button>
                </span>
              </div>
            </article>
          );
        })}
        {!loading && !filteredProducts.length ? <div className={styles.stateCard}><h2 className="font-display">No products found.</h2><p>Create a product after adding active category, material and deity records.</p></div> : null}
      </div>

      {modal ? (
        <ProductModal
          key={`${modal.mode}-${modal.mode === "edit" ? modal.product.id : "new"}`}
          state={modal}
          lookups={lookups}
          onClose={() => setModal(null)}
          onSaved={saveProduct}
          onImageRemoved={removeProductImageFromState}
          onImageUpdated={updateProductImage}
        />
      ) : null}
    </section>
  );
}
