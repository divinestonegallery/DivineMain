"use client";

import Image from "next/image";
import { FormEvent, useId, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { apiRequest } from "@/api/client";
import { AdminImageUpload, uploadPendingAdminImages, type AdminSelectedImage, type UploadedAdminSelection } from "@/components/Admin/admin-image-upload";
import { AdminFieldGrid, AdminModalField, AdminModalSection } from "@/components/Admin/admin-entity-modal";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import styles from "./ai-product-modal.module.css";

type Taxonomy = { id: number; name: string; is_active?: boolean };
export type AIProductLookups = { categories: Taxonomy[]; materials: Taxonomy[]; deities: Taxonomy[] };
export type AIProductDraft = {
  name: string;
  category: number;
  material: number;
  deity?: number | null;
  short_description: string;
  description: string;
  keywords: string[];
  availability: string;
  sales_mode: string;
  height: string;
  min_weight: string;
  max_weight: string;
  status: "draft";
  display_order: number;
  home_page_display_order: number;
  is_featured: boolean;
};

type Props = {
  lookups: AIProductLookups;
  onClose: () => void;
  onSave: (draft: AIProductDraft, uploads: UploadedAdminSelection[]) => Promise<void>;
};

const generatedFields: Array<{ key: keyof AIProductDraft; label: string; multiline?: boolean }> = [
  { key: "short_description", label: "Short description" },
  { key: "description", label: "Description", multiline: true },
  { key: "keywords", label: "Tags / keywords" },
  { key: "height", label: "Height" },
  { key: "min_weight", label: "Minimum weight" },
  { key: "max_weight", label: "Maximum weight" },
];

function lookupName(items: Taxonomy[], id?: number | null) {
  return items.find((item) => item.id === id)?.name ?? "Not set";
}

function fileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}

export function AIProductModal({ lookups, onClose, onSave }: Props) {
  const { showToast } = useToast();
  const formId = useId();
  const [step, setStep] = useState<"input" | "review">("input");
  const [selectedImages, setSelectedImages] = useState<AdminSelectedImage[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [material, setMaterial] = useState("");
  const [deity, setDeity] = useState("");
  const [draft, setDraft] = useState<AIProductDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate(event: FormEvent) {
    event.preventDefault();
    const image = selectedImages[0];
    if (!image || !name.trim() || !category || !material) {
      setError("Add an image, product name, category and material before generating.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const imageBase64 = await fileAsDataUrl(image.file);
      const generated = await apiRequest<AIProductDraft>("/api/admin/products/ai-draft", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          category_id: Number(category),
          material_id: Number(material),
          deity_id: deity ? Number(deity) : null,
          image_base64: imageBase64,
          image_mime_type: image.file.type,
        }),
      });
      setDraft(generated);
      setStep("review");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The AI draft could not be generated.");
    } finally {
      setBusy(false);
    }
  }

  function updateDraft(key: keyof AIProductDraft, value: string) {
    setDraft((current) => current ? { ...current, [key]: key === "keywords" ? value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean) : value } : current);
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const uploads = await uploadPendingAdminImages(selectedImages, setSelectedImages);
      await onSave(draft, uploads);
      showToast("AI product saved.");
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The product could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title={step === "input" ? "Add with AI" : "Review AI Generated Product"} onClose={busy ? () => undefined : onClose} panelClassName={styles.panel}>
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {step === "input" ? (
        <form id={formId} className={styles.content} onSubmit={generate}>
          <AdminModalSection title="Product image">
            <AdminImageUpload label="Upload Product Image" description="Upload or drag & drop one JPG, PNG, or WEBP image." selectedImages={selectedImages} onSelectedImagesChange={setSelectedImages} maxFiles={1} strictSingleImage disabled={busy} />
          </AdminModalSection>
          <AdminModalSection title="Product details">
            <AdminFieldGrid>
              <AdminModalField label="Product Name" required wide>
                <input value={name} onChange={(event) => setName(event.target.value)} disabled={busy} />
              </AdminModalField>
              <AdminModalField label="Deity">
                <select value={deity} onChange={(event) => setDeity(event.target.value)} disabled={busy}><option value="">Select Deity</option>{lookups.deities.filter((item) => item.is_active !== false).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
              </AdminModalField>
              <AdminModalField label="Category" required>
                <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={busy}><option value="">Select Category</option>{lookups.categories.filter((item) => item.is_active !== false).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
              </AdminModalField>
              <AdminModalField label="Material" required>
                <select value={material} onChange={(event) => setMaterial(event.target.value)} disabled={busy}><option value="">Select Material</option>{lookups.materials.filter((item) => item.is_active !== false).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
              </AdminModalField>
            </AdminFieldGrid>
          </AdminModalSection>
          <div className={styles.footer}><Button variant="outline" type="button" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}><Sparkles size={16} /> {busy ? "Generating..." : "Generate with AI"}</Button></div>
        </form>
      ) : (
        <div className={styles.content}>
          <div className={styles.reviewImage}>{selectedImages[0] ? <Image unoptimized src={selectedImages[0].previewUrl} alt={draft?.name ?? "Product preview"} fill sizes="220px" /> : null}</div>
          <AdminModalSection title="Selected classification">
            <div className={styles.summary}><span><b>Product name</b>{draft?.name}</span><span><b>Deity</b>{lookupName(lookups.deities, draft?.deity)}</span><span><b>Category</b>{lookupName(lookups.categories, draft?.category)}</span><span><b>Material</b>{lookupName(lookups.materials, draft?.material)}</span></div>
          </AdminModalSection>
          <AdminModalSection title="Generated product details">
            <div className={styles.generatedGrid}>{generatedFields.map(({ key, label, multiline }) => <AdminModalField label={label} key={key} hint="AI Generated"><>{multiline ? <textarea value={String(draft?.[key] ?? "")} onChange={(event) => updateDraft(key, event.target.value)} disabled={busy} /> : <input value={Array.isArray(draft?.[key]) ? draft[key].join(", ") : String(draft?.[key] ?? "")} onChange={(event) => updateDraft(key, event.target.value)} disabled={busy} />}</></AdminModalField>)}</div>
          </AdminModalSection>
          <div className={styles.footer}><Button variant="outline" onClick={() => setStep("input")} disabled={busy}><ArrowLeft size={16} /> Back</Button><Button onClick={() => void save()} disabled={busy}>{busy ? "Saving..." : "Save Product"}</Button></div>
        </div>
      )}
    </Modal>
  );
}
