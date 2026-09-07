"use client";

import Image from "next/image";
import { ChangeEvent, Dispatch, DragEvent, SetStateAction, useEffect, useRef, useState } from "react";
import { ImageIcon, Trash2, UploadCloud, X } from "lucide-react";
import { friendlyUploadError, uploadAdminImage, validateUploadImageFile, type AdminUploadSession } from "@/api/uploads";
import styles from "./admin-image-upload.module.css";

export type AdminSelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
  status: "ready" | "uploading" | "uploaded" | "error";
  error?: string;
  result?: AdminUploadSession;
};

export type AdminExistingImage = {
  id: string | number;
  image_url?: string | null;
  alt_text?: string | null;
  cover_photo?: boolean;
};

export type UploadedAdminSelection = {
  selection: AdminSelectedImage;
  upload: AdminUploadSession;
};

const accept = "image/jpeg,image/png,image/webp";

function nextId() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `image-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fileLabel(file: File) {
  const size = file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
  return `${file.type.replace("image/", "").toUpperCase()} - ${size}`;
}

export async function uploadPendingAdminImages(
  images: AdminSelectedImage[],
  setImages: Dispatch<SetStateAction<AdminSelectedImage[]>>,
) {
  const uploads: UploadedAdminSelection[] = [];

  for (const image of images) {
    if (image.result) {
      uploads.push({ selection: image, upload: image.result });
      continue;
    }

    setImages((current) => current.map((item) => item.id === image.id ? { ...item, status: "uploading", error: "" } : item));
    try {
      const upload = await uploadAdminImage(image.file);
      setImages((current) => current.map((item) => item.id === image.id ? { ...item, status: "uploaded", result: upload } : item));
      uploads.push({ selection: image, upload });
    } catch (reason) {
      const message = friendlyUploadError(reason);
      setImages((current) => current.map((item) => item.id === image.id ? { ...item, status: "error", error: message } : item));
      throw new Error(message);
    }
  }

  return uploads;
}

export function AdminImageUpload({
  label,
  description,
  selectedImages,
  onSelectedImagesChange,
  existingImages = [],
  multiple = false,
  maxFiles = multiple ? 12 : 1,
  disabled = false,
  strictSingleImage = false,
  onRemoveExisting,
  onSetCoverExisting,
}: {
  label: string;
  description?: string;
  selectedImages: AdminSelectedImage[];
  onSelectedImagesChange: Dispatch<SetStateAction<AdminSelectedImage[]>>;
  existingImages?: AdminExistingImage[];
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
  strictSingleImage?: boolean;
  onRemoveExisting?: (image: AdminExistingImage) => void;
  onSetCoverExisting?: (image: AdminExistingImage) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewUrls = useRef(new Set<string>());
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }, []);

  function revokeSelected(image: AdminSelectedImage) {
    URL.revokeObjectURL(image.previewUrl);
    previewUrls.current.delete(image.previewUrl);
  }

  function addFiles(fileList: FileList | File[]) {
    setError("");
    const files = Array.from(fileList);
    const nextImages: AdminSelectedImage[] = [];
    const savedImageCount = multiple ? existingImages.filter((image) => image.image_url).length : 0;

    if (!multiple && strictSingleImage && files.length > 1) {
      setError("Please select only one image.");
      return;
    }

    if (!multiple && strictSingleImage && (existingImages.some((image) => image.image_url) || selectedImages.length)) {
      setError("Remove the current image before selecting another.");
      return;
    }

    for (const file of files) {
      const validation = validateUploadImageFile(file);
      if (validation) {
        setError(validation);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      nextImages.push({ id: nextId(), file, previewUrl, status: "ready" });
      if (!multiple) break;
    }

    if (!nextImages.length) return;

    onSelectedImagesChange((current) => {
      const base = multiple ? current : [];
      if (!multiple) current.forEach(revokeSelected);
      const slots = Math.max(0, maxFiles - savedImageCount - base.length);
      if (slots < nextImages.length) setError(`You can upload up to ${maxFiles} image${maxFiles === 1 ? "" : "s"}.`);
      nextImages.slice(slots).forEach(revokeSelected);
      return [...base, ...nextImages.slice(0, slots)];
    });
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files) addFiles(files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    addFiles(event.dataTransfer.files);
  }

  function removeSelected(image: AdminSelectedImage) {
    revokeSelected(image);
    onSelectedImagesChange((current) => current.filter((item) => item.id !== image.id));
  }

  return (
    <div className={styles.upload}>
      <div className={styles.uploadHeader}>
        <strong>{label}</strong>
        <small>{description || "Upload JPG, PNG, or WEBP images."}</small>
      </div>

      {existingImages.some((image) => image.image_url) ? (
        <div className={styles.existingGrid} aria-label={`Existing ${label.toLowerCase()}`}>
          {existingImages.filter((image) => image.image_url).map((image) => (
            <article className={styles.existingCard} key={image.id}>
              <span className={styles.existingImage}>
                <Image unoptimized src={image.image_url || ""} alt={image.alt_text || label} fill sizes="160px" />
              </span>
              <span className={styles.existingMeta}>
                <strong>{image.alt_text || "Current image"}</strong>
                {image.cover_photo ? <small className={styles.coverBadge}>Cover</small> : <small>Saved image</small>}
              </span>
              {(onRemoveExisting || onSetCoverExisting) ? (
                <span className={styles.existingActions}>
                  {onSetCoverExisting && !image.cover_photo ? <button type="button" onClick={() => onSetCoverExisting(image)} disabled={disabled}>Make cover</button> : null}
                  {onRemoveExisting ? <button type="button" onClick={() => onRemoveExisting(image)} disabled={disabled}><Trash2 size={13} /> Remove</button> : null}
                </span>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {selectedImages.length ? (
        <div className={styles.previewGrid} aria-label={`Selected ${label.toLowerCase()}`}>
          {selectedImages.map((image) => (
            <article className={styles.previewCard} key={image.id}>
              <span className={styles.previewImage}>
                <Image unoptimized src={image.previewUrl} alt={`Selected ${image.file.name}`} fill sizes="160px" />
              </span>
              <span className={styles.previewMeta}>
                <strong>{image.file.name}</strong>
                <small>{image.status === "uploading" ? "Uploading..." : image.status === "uploaded" ? "Uploaded" : fileLabel(image.file)}</small>
                {image.error ? <small className={styles.errorText}>{image.error}</small> : null}
              </span>
              <span className={styles.previewActions}>
                <button type="button" onClick={() => removeSelected(image)} disabled={disabled || image.status === "uploading"}>
                  <X size={13} /> Remove
                </button>
              </span>
            </article>
          ))}
        </div>
      ) : null}

      <input ref={inputRef} className={styles.fileInput} type="file" accept={accept} multiple={multiple} onChange={handleInputChange} disabled={disabled} />
      <button
        className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ""}`.trim()}
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        disabled={disabled}
      >
        <UploadCloud aria-hidden="true" size={26} />
        <span>
          <strong>{multiple ? "Upload Images" : "Upload Image"}</strong>
          <small>Drag & drop here</small>
          <small>JPG / PNG / WEBP</small>
        </span>
        <ImageIcon aria-hidden="true" size={18} />
      </button>
      {error ? <p className={styles.uploadError} role="alert">{error}</p> : null}
    </div>
  );
}
