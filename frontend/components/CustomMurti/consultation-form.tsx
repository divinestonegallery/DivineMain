"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, CheckCircle2, ImageIcon, LockKeyhole, PencilRuler, UploadCloud, X } from "lucide-react";
import { submitCustomizeRequest, uploadCustomizationReferenceImage } from "@/api/contact";
import { friendlyUploadError, validateUploadImageFile } from "@/api/uploads";
import { useUser } from "@/components/Auth/auth-facade";
import { buttonClassName } from "@/components/ui/button";
import { FormField, TextareaField } from "@/components/ui/form-field";
import styles from "@/app/custom-murti/custom-murti.module.css";

type Identity = { name: string; email: string; phone: string };
type ReferencePhotoState = {
  id: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "uploaded" | "error";
  objectKey?: string;
  publicUrl?: string | null;
  error?: string;
};

const blankIdentity: Identity = { name: "", email: "", phone: "" };
const phonePattern = /^\+?[0-9][0-9\s-]{7,19}$/;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function friendlySubmitError(reason: unknown) {
  const message = reason instanceof Error ? reason.message : "";
  if (/Reference upload/i.test(message)) return message;
  if (/already submitted/i.test(message)) return "This custom request was already sent recently.";
  return "Something went wrong. Please try again.";
}

function nextUploadId() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `reference-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fileLabel(file: File) {
  const size = file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
  return `${file.type.replace("image/", "").toUpperCase()} - ${size}`;
}

function uploadStatusText(photo: ReferencePhotoState) {
  if (photo.status === "uploading") return "Uploading...";
  if (photo.status === "uploaded") return "Image Uploaded";
  return photo.error || "Image upload failed. Please try again.";
}

function ProfileField({ label, loading, value }: { label: string; loading: boolean; value?: string }) {
  return (
    <div className={styles.profileField} aria-busy={loading}>
      <span>{label}</span>
      {loading ? <strong className={styles.profileSkeleton} aria-hidden="true" /> : <strong>{value || "Not available"}</strong>}
      <small>From your profile</small>
    </div>
  );
}

export function ConsultationForm() {
  const { isLoaded, isSignedIn, user } = useUser();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadRequestRef = useRef("");
  const profileIdentity: Identity = {
    name: cleanText(user?.name),
    email: cleanText(user?.email),
    phone: cleanText(user?.phone),
  };
  const [manualIdentity, setManualIdentity] = useState(blankIdentity);
  const [referencePhoto, setReferencePhoto] = useState<ReferencePhotoState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (referencePhoto?.previewUrl) URL.revokeObjectURL(referencePhoto.previewUrl);
    };
  }, [referencePhoto?.previewUrl]);

  function updateIdentity(field: keyof Identity) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setManualIdentity((current) => ({ ...current, [field]: event.target.value }));
      setFieldErrors((current) => ({ ...current, [field]: "" }));
    };
  }

  function clearFieldError(field: string) {
    return () => setFieldErrors((current) => ({ ...current, [field]: "" }));
  }

  function clearFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeReferencePhoto() {
    uploadRequestRef.current = nextUploadId();
    setReferencePhoto(null);
    clearFileInput();
    setFieldErrors((current) => ({ ...current, referencePhoto: "" }));
  }

  function selectReferencePhoto(file: File | undefined) {
    setError("");
    setFieldErrors((current) => ({ ...current, referencePhoto: "" }));

    if (!file) return;

    if (!isSignedIn) {
      setFieldErrors((current) => ({ ...current, referencePhoto: "Please sign in to include a reference photo." }));
      clearFileInput();
      return;
    }

    const validation = validateUploadImageFile(file);
    if (validation) {
      setFieldErrors((current) => ({ ...current, referencePhoto: validation }));
      clearFileInput();
      return;
    }

    const uploadId = nextUploadId();
    uploadRequestRef.current = uploadId;
    setReferencePhoto({ id: uploadId, file, previewUrl: URL.createObjectURL(file), status: "uploading" });

    void uploadCustomizationReferenceImage(file)
      .then(({ objectKey, publicUrl }) => {
        if (uploadRequestRef.current !== uploadId) return;
        setReferencePhoto((current) => current?.id === uploadId
          ? { ...current, status: "uploaded", objectKey, publicUrl, error: "" }
          : current);
      })
      .catch((reason) => {
        if (uploadRequestRef.current !== uploadId) return;
        const message = friendlyUploadError(reason);
        setReferencePhoto((current) => current?.id === uploadId
          ? { ...current, status: "error", error: message }
          : current);
        setFieldErrors((current) => ({ ...current, referencePhoto: message }));
      })
      .finally(clearFileInput);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectReferencePhoto(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragActive(false);
    if (submitting || referencePhoto?.status === "uploading") return;
    selectReferencePhoto(event.dataTransfer.files?.[0]);
  }

  function validate(form: FormData) {
    const nextErrors: Record<string, string> = {};
    const value = (name: string) => form.get(name)?.toString().trim() || "";

    if (!isSignedIn) {
      if (!value("name") || value("name").length < 2) nextErrors.name = "Please enter your name.";
      if (!value("email")) nextErrors.email = "Please enter a valid email address.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email"))) nextErrors.email = "Please enter a valid email address.";
      if (!value("phone")) nextErrors.phone = "Please enter your phone number.";
      else if (!phonePattern.test(value("phone"))) nextErrors.phone = "Please enter your phone number.";
    } else if (!profileIdentity.email && !profileIdentity.phone) {
      nextErrors.profile = "We could not find contact details in your profile.";
    }

    const pincode = value("pincode");
    if (!value("city") || value("city").length < 2) nextErrors.city = "Please enter your city.";
    if (!pincode) nextErrors.pincode = "Please enter your 6-digit pincode.";
    else if (!/^[1-9][0-9]{5}$/.test(pincode)) nextErrors.pincode = "Please enter a valid Indian pincode.";
    if (referencePhoto && !isSignedIn) nextErrors.referencePhoto = "Please sign in to include a reference photo, or remove it to send without the photo.";
    else if (referencePhoto?.status === "uploading") nextErrors.referencePhoto = "Please wait for the image upload to finish.";
    else if (referencePhoto?.status === "error") nextErrors.referencePhoto = referencePhoto.error || "Image upload failed. Please try again.";
    else if (referencePhoto && !referencePhoto.objectKey) nextErrors.referencePhoto = "Please upload the image again or remove it before sending.";

    return { errors: nextErrors, value };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const { errors, value } = validate(form);
    setFieldErrors(errors);
    setError(errors.profile || "");
    if (Object.values(errors).some(Boolean)) return;

    setSubmitting(true);
    setError("");

    try {
      const referenceObjectKey = referencePhoto?.status === "uploaded" ? referencePhoto.objectKey : undefined;
      await submitCustomizeRequest({
        name: isSignedIn ? profileIdentity.name || undefined : value("name"),
        email: isSignedIn ? profileIdentity.email || undefined : value("email"),
        phone: isSignedIn ? profileIdentity.phone || undefined : value("phone"),
        city: value("city"),
        pincode: value("pincode"),
        approximate_height: value("height"),
        preferred_material: value("preferred_material") || undefined,
        description: value("description") || undefined,
        reference_object_key: referenceObjectKey,
      });

      setSent(true);
      uploadRequestRef.current = "";
      setReferencePhoto(null);
      formElement.reset();
      clearFileInput();
      if (!isSignedIn) setManualIdentity(blankIdentity);
    } catch (reason) {
      setError(friendlySubmitError(reason));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className={`${styles.customizeForm} ${styles.formSuccess}`} role="status">
        <CheckCircle2 aria-hidden="true" size={34} />
        <p className={styles.formEyebrow}>Custom Request Sent</p>
        <h2 className="font-display">Thank you for sharing your requirements.</h2>
        <p>Our team will review your request and get back to you shortly.</p>
        <button className={buttonClassName({ size: "lg", className: styles.formSubmit })} type="button" onClick={() => setSent(false)}>
          Send another request <ArrowRight aria-hidden="true" size={18} />
        </button>
      </div>
    );
  }

  const showProfileFields = !isLoaded || isSignedIn;
  const referenceUploading = referencePhoto?.status === "uploading";
  const uploadDisabled = !isLoaded || submitting || referenceUploading;

  return (
    <form className={styles.customizeForm} noValidate onSubmit={handleSubmit}>
      <div className={styles.formHeading}>
        <span><PencilRuler aria-hidden="true" size={20} /></span>
        <div>
          <p className={styles.formEyebrow}>Send your requirements</p>
        </div>
      </div>

      <div className={styles.formGrid}>
        {showProfileFields ? (
          <>
            <ProfileField label="Name" loading={!isLoaded} value={profileIdentity.name} />
            <ProfileField label="Email" loading={!isLoaded} value={profileIdentity.email} />
            <ProfileField label="Phone" loading={!isLoaded} value={profileIdentity.phone} />
          </>
        ) : (
          <>
            <FormField label="Name" name="name" autoComplete="name" placeholder="Full name" minLength={2} maxLength={255} value={manualIdentity.name} onChange={updateIdentity("name")} error={fieldErrors.name} required />
            <FormField label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={manualIdentity.email} onChange={updateIdentity("email")} error={fieldErrors.email} required />
            <FormField label="Phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. +91 98765 43210" pattern="\+?[0-9][0-9\s-]{7,19}" maxLength={20} value={manualIdentity.phone} onChange={updateIdentity("phone")} error={fieldErrors.phone} required />
          </>
        )}
        <FormField label="Height(inches)" name="height" placeholder="e.g. 24 inches" maxLength={100} onChange={clearFieldError("height")} />
        <FormField label="City" name="city" autoComplete="address-level2" placeholder="Jaipur" minLength={2} maxLength={50} error={fieldErrors.city} onChange={clearFieldError("city")} required />
        <FormField label="Pincode" name="pincode" inputMode="numeric" autoComplete="postal-code" placeholder="302001" pattern="[1-9][0-9]{5}" maxLength={6} error={fieldErrors.pincode} onChange={clearFieldError("pincode")} required />
        <FormField className={styles.fullField} label="Preferred Material" name="preferred_material" placeholder="e.g. White Makrana Marble" maxLength={255} onChange={clearFieldError("preferred_material")} />
        <TextareaField className={styles.fullField} label="Description / Comment" name="description" maxLength={10000} placeholder="Tell us about your customization requirements..." />

        <div className={`${styles.uploadField} ${styles.fullField}`}>
          <div className={styles.uploadLabel}>
            <span>Custom Moorti Image <small>(Optional)</small></span>
            <small>{isSignedIn ? "Upload a photo or design reference if you have one." : "Sign in to include the photo with your request."}</small>
          </div>
          <input ref={fileInputRef} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} disabled={uploadDisabled} />
          {referencePhoto ? (
            <div className={styles.uploadPreview} data-status={referencePhoto.status} aria-busy={referenceUploading}>
              <span className={styles.uploadPreviewImage}>
                <Image src={referencePhoto.previewUrl} alt="Selected reference preview" fill sizes="120px" unoptimized />
              </span>
              <span>
                <strong>{referencePhoto.file.name}</strong>
                <small>{fileLabel(referencePhoto.file)}</small>
                <small className={styles.uploadStatus} data-status={referencePhoto.status}>
                  {referencePhoto.status === "uploaded" ? <CheckCircle2 aria-hidden="true" size={14} /> : null}
                  {uploadStatusText(referencePhoto)}
                </small>
                {referencePhoto.publicUrl ? <small>Ready to attach to your request.</small> : null}
              </span>
              <span className={styles.uploadPreviewActions}>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadDisabled}>Replace Image</button>
                <button type="button" aria-label="Remove selected reference photo" onClick={removeReferencePhoto} disabled={submitting || referenceUploading}><X aria-hidden="true" size={14} /> Remove</button>
              </span>
            </div>
          ) : (
            <button
              className={`${styles.uploadButton} ${dragActive ? styles.uploadButtonActive : ""}`.trim()}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => { event.preventDefault(); if (!uploadDisabled) setDragActive(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              disabled={uploadDisabled}
            >
              <UploadCloud aria-hidden="true" size={20} />
              <span><strong>Upload Image</strong><small>Drag & drop or Browse</small><small>JPG / PNG / WEBP</small></span>
              <ImageIcon aria-hidden="true" size={18} />
            </button>
          )}
          {fieldErrors.referencePhoto ? <p className={styles.formError} role="alert">{fieldErrors.referencePhoto}</p> : null}
        </div>
      </div>

      {error ? <p className={styles.formError} role="alert">{error}</p> : null}
      <button className={buttonClassName({ size: "lg", className: styles.formSubmit })} type="submit" disabled={submitting || !isLoaded || referenceUploading}>
        {referenceUploading ? "Uploading image..." : submitting ? "Sending request..." : <>Send custom request <ArrowRight aria-hidden="true" size={18} /></>}
      </button>
      <p className={styles.formPrivacy}><LockKeyhole aria-hidden="true" size={14} /> Your details are used only to respond to this custom request.</p>
    </form>
  );
}
