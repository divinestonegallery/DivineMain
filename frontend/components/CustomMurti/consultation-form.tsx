"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, CheckCircle2, ImageIcon, LockKeyhole, PencilRuler, UploadCloud, X } from "lucide-react";
import { createCustomizationUploadSession, submitCustomizeRequest, type CustomizationUploadSession } from "@/api/contact";
import { useUser } from "@/components/Auth/auth-facade";
import { buttonClassName } from "@/components/ui/button";
import { FormField, TextareaField } from "@/components/ui/form-field";
import styles from "@/app/custom-murti/custom-murti.module.css";

type Identity = { name: string; email: string; phone: string };
type SupportedImageType = "image/jpeg" | "image/png" | "image/webp";

const blankIdentity: Identity = { name: "", email: "", phone: "" };
const supportedImageTypes = new Set<string>(["image/jpeg", "image/png", "image/webp"]);
const phonePattern = /^\+?[0-9][0-9\s-]{7,19}$/;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function supportedImageType(type: string): type is SupportedImageType {
  return supportedImageTypes.has(type);
}

function friendlySubmitError(reason: unknown) {
  const message = reason instanceof Error ? reason.message : "";
  if (/already submitted/i.test(message)) return "This custom request was already sent recently.";
  return "Something went wrong. Please try again.";
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

function uploadHeaders(session: CustomizationUploadSession, file: File) {
  const headers = new Headers();
  Object.entries(session.required_headers || {}).forEach(([name, value]) => {
    if (name.toLowerCase() !== "content-length") headers.set(name, String(value));
  });
  if (!headers.has("Content-Type")) headers.set("Content-Type", file.type);
  return headers;
}

export function ConsultationForm() {
  const { isLoaded, isSignedIn, user } = useUser();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const profileIdentity: Identity = {
    name: cleanText(user?.name),
    email: cleanText(user?.email),
    phone: cleanText(user?.phone),
  };
  const [manualIdentity, setManualIdentity] = useState(blankIdentity);
  const [referencePhoto, setReferencePhoto] = useState<{ file: File; previewUrl: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError("");
    setFieldErrors((current) => ({ ...current, referencePhoto: "" }));

    if (!file) {
      setReferencePhoto(null);
      return;
    }

    if (!file.size || !supportedImageType(file.type)) {
      setReferencePhoto(null);
      setFieldErrors((current) => ({ ...current, referencePhoto: "Please select a valid image." }));
      event.target.value = "";
      return;
    }

    setReferencePhoto({ file, previewUrl: URL.createObjectURL(file) });
  }

  function removeReferencePhoto() {
    setReferencePhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFieldErrors((current) => ({ ...current, referencePhoto: "" }));
  }

  function validate(form: FormData) {
    const nextErrors: Record<string, string> = {};
    const value = (name: string) => form.get(name)?.toString().trim() || "";

    if (!isSignedIn) {
      if (!value("name")) nextErrors.name = "Please enter your name.";
      if (!value("email")) nextErrors.email = "Please enter a valid email address.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email"))) nextErrors.email = "Please enter a valid email address.";
      if (!value("phone")) nextErrors.phone = "Please enter your phone number.";
      else if (!phonePattern.test(value("phone"))) nextErrors.phone = "Please enter your phone number.";
    } else if (!profileIdentity.email && !profileIdentity.phone) {
      nextErrors.profile = "We could not find contact details in your profile.";
    }

    if (!value("height")) nextErrors.height = "Please enter the required height.";
    if (!value("city")) nextErrors.city = "Please enter your city and state.";
    if (referencePhoto && !isSignedIn) nextErrors.referencePhoto = "Please sign in to include a reference photo, or remove it to send without the photo.";

    return { errors: nextErrors, value };
  }

  async function uploadReferencePhoto(file: File) {
    if (!supportedImageType(file.type)) throw new Error("Invalid reference image.");

    const session = await createCustomizationUploadSession({
      filename: (file.name || "reference-image").slice(0, 255),
      content_type: file.type,
      file_size: file.size,
    });

    const response = await fetch(session.upload_url, {
      method: session.method || "PUT",
      headers: uploadHeaders(session, file),
      body: file,
    });

    if (!response.ok) throw new Error("Reference upload failed.");
    return session.object_key;
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
      const referenceObjectKey = referencePhoto ? await uploadReferencePhoto(referencePhoto.file) : undefined;
      await submitCustomizeRequest({
        name: isSignedIn ? profileIdentity.name || undefined : value("name"),
        email: isSignedIn ? profileIdentity.email || undefined : value("email"),
        phone: isSignedIn ? profileIdentity.phone || undefined : value("phone"),
        city: value("city"),
        approximate_height: value("height"),
        description: value("description") || undefined,
        reference_object_key: referenceObjectKey,
      });

      setSent(true);
      setReferencePhoto(null);
      formElement.reset();
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

  return (
    <form className={styles.customizeForm} noValidate onSubmit={handleSubmit}>
      <div className={styles.formHeading}>
        <span><PencilRuler aria-hidden="true" size={20} /></span>
        <div>
          <p className={styles.formEyebrow}>Send your requirements</p>
          <h2 className="font-display">Customize Moorti Form</h2>
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
            <FormField label="Name" name="name" autoComplete="name" placeholder="Full name" value={manualIdentity.name} onChange={updateIdentity("name")} error={fieldErrors.name} required />
            <FormField label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={manualIdentity.email} onChange={updateIdentity("email")} error={fieldErrors.email} required />
            <FormField label="Phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. +91 98765 43210" pattern="\+?[0-9][0-9\s-]{7,19}" value={manualIdentity.phone} onChange={updateIdentity("phone")} error={fieldErrors.phone} required />
          </>
        )}
        <FormField label="Height" name="height" placeholder="e.g. 24 inches" error={fieldErrors.height} onChange={clearFieldError("height")} required />
        <FormField className={styles.fullField} label="Address / City / State" name="city" autoComplete="address-level2" placeholder="Jaipur, Rajasthan" error={fieldErrors.city} onChange={clearFieldError("city")} required />
        <TextareaField className={styles.fullField} label="Description / Comment" name="description" placeholder="Tell us about your customization requirements..." />

        <div className={`${styles.uploadField} ${styles.fullField}`}>
          <div className={styles.uploadLabel}>
            <span>Reference Photo <small>(Optional)</small></span>
            <small>{isSignedIn ? "Upload a photo or design reference if you have one." : "Sign in to include the photo with your request."}</small>
          </div>
          <input ref={fileInputRef} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
          {referencePhoto ? (
            <div className={styles.uploadPreview}>
              <Image src={referencePhoto.previewUrl} alt="Selected reference preview" width={46} height={46} unoptimized />
              <span>
                <strong>{referencePhoto.file.name}</strong>
                <small>{referencePhoto.file.type.replace("image/", "").toUpperCase()}</small>
              </span>
              <button type="button" aria-label="Remove selected reference photo" onClick={removeReferencePhoto}><X aria-hidden="true" size={16} /></button>
            </div>
          ) : (
            <button className={styles.uploadButton} type="button" onClick={() => fileInputRef.current?.click()}>
              <UploadCloud aria-hidden="true" size={20} />
              <span><strong>Upload Reference Photo</strong><small>JPG, PNG, WEBP</small></span>
              <ImageIcon aria-hidden="true" size={18} />
            </button>
          )}
          {fieldErrors.referencePhoto ? <p className={styles.formError} role="alert">{fieldErrors.referencePhoto}</p> : null}
        </div>
      </div>

      {error ? <p className={styles.formError} role="alert">{error}</p> : null}
      <button className={buttonClassName({ size: "lg", className: styles.formSubmit })} type="submit" disabled={submitting || !isLoaded}>
        {submitting ? "Sending request..." : <>Send custom request <ArrowRight aria-hidden="true" size={18} /></>}
      </button>
      <p className={styles.formPrivacy}><LockKeyhole aria-hidden="true" size={14} /> Your details are used only to respond to this custom request.</p>
    </form>
  );
}
