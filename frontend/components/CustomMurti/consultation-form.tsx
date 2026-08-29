// @ts-nocheck
"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/components/Auth/auth-facade";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ImagePlus, LockKeyhole, MessageCircle } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { FormField, SelectField, TextareaField } from "@/components/ui/form-field";
import { AccountBootstrap } from "@/components/Auth/account-bootstrap";
import { prepareImageForUpload } from "@/components/Uploads/prepare-image";
import { useAuthConfigured } from "@/components/Auth/auth-provider";
import styles from "@/app/custom-murti/custom-murti.module.css";

function ConnectedConsultationForm() {
  const configured = true;
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [createdWarning, setCreatedWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || !isSignedIn) return;
    setSubmitting(true);
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const value = (name: string) => form.get(name)?.toString().trim() || "Not specified";
    try {
      const token = await getToken();
      const response = await fetch("/api/v1/commissions", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          deityOrSubject: value("deity"),
          preferredMaterial: value("material"),
          destinationPostalCode: value("postalCode"),
          targetHeightMm: Math.round(Number(value("heightInches")) * 25.4),
          requirements: [
            `Placement: ${value("placement")}`,
            `Preferred finish: ${value("finish")}`,
            `Timeline: ${value("timeline")}`,
            `City / destination: ${value("city")}`,
            `Customer notes: ${value("notes")}`,
          ].join("\n"),
        }),
      });
      if (!response.ok) throw new Error((await response.json() as { error?: { message?: string } }).error?.message || "The request could not be saved.");
      const payload = await response.json() as { data: { commissionNumber: string } };
      setCreated(payload.data.commissionNumber);
      const files = form.getAll("references").filter((item): item is File => item instanceof File && item.size > 0).slice(0, 5);
      for (const file of files) {
        const upload = new FormData();
        upload.set("file", await prepareImageForUpload(file));
        const mediaResponse = await fetch(`/api/v1/commissions/${encodeURIComponent(payload.data.commissionNumber)}/media`, {
          method: "POST",
          headers: token ? { authorization: `Bearer ${token}` } : undefined,
          body: upload,
        });
        if (!mediaResponse.ok) { setCreatedWarning("Your request is saved, but one reference image could not be uploaded. You can share it with the gallery later."); break; }
      }
      formElement.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The commission request could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) return <div className={styles.consultationForm}><div className={styles.formSuccess}><CheckCircle2 aria-hidden="true" size={34} /><h2 className="font-display">Your commission request is saved.</h2><p>Reference {created} is now in your private gallery account.</p>{createdWarning || error ? <p className={styles.formError}>{createdWarning || error}</p> : null}<Link className={buttonClassName({ size: "lg" })} href={`/account/commissions/${created}`}>Track your commission <ArrowRight aria-hidden="true" size={18} /></Link></div></div>;

  return (
    <form className={styles.consultationForm} onSubmit={handleSubmit}>
      {configured ? <AccountBootstrap /> : null}
      <div className={styles.formHeading}><span><MessageCircle aria-hidden="true" size={20} /></span><div><p>Begin your consultation</p><h2 className="font-display">Tell us what you envision.</h2></div></div>
      {!configured ? <div className={styles.referenceNote}><MessageCircle aria-hidden="true" size={20} /><span><strong>Secure requests are ready for account activation.</strong><small>Until Clerk is configured, begin through WhatsApp.</small></span></div> : isLoaded && !isSignedIn ? <div className={styles.referenceNote}><LockKeyhole aria-hidden="true" size={20} /><span><strong>Sign in to save and track your commission.</strong><small>Your references and milestone approvals stay private inside your gallery account.</small></span></div> : null}
      <div className={styles.formGrid}>
        <FormField label="Deity or subject" name="deity" placeholder="e.g. Radha Krishna" required />
        <FormField label="City or delivery destination" name="city" autoComplete="address-level2" placeholder="City, state" required />
        <FormField label="Delivery postcode" name="postalCode" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} placeholder="6-digit Indian postcode" required />
        <FormField label="Approximate height (inches)" name="heightInches" type="number" inputMode="decimal" min="1" max="240" placeholder="e.g. 24" required />
        <SelectField label="Where will it be placed?" name="placement" defaultValue="" required><option value="" disabled>Select placement</option><option>Home mandir</option><option>Temple</option><option>Commercial or institutional space</option><option>Gift</option><option>Not decided yet</option></SelectField>
        <SelectField label="Preferred material" name="material" defaultValue="Marble"><option>Marble</option><option>Makrana marble</option><option>Discuss with the gallery</option></SelectField>
        <SelectField label="Preferred finish" name="finish" defaultValue="Not decided yet"><option>Not decided yet</option><option>Natural white marble</option><option>Traditional hand-painted</option><option>Subtle gold accents</option><option>Discuss with the gallery</option></SelectField>
        <SelectField label="Preferred timeline" name="timeline" defaultValue="Flexible"><option>Flexible</option><option>Within 1–2 months</option><option>Within 3–6 months</option><option>For a specific ceremony or date</option></SelectField>
        <TextareaField className={styles.fullField} label="Describe the posture, expression or details" name="notes" placeholder="Share the style, ornamentation, base, accompanying figures or other preferences." />
      </div>
      <label className={styles.referenceUpload}><ImagePlus aria-hidden="true" size={20} /><span><strong>Add reference photos</strong><small>Up to 5 JPEG, PNG or WebP images, 12 MB each. Large photos are optimized before upload.</small></span><input type="file" name="references" accept="image/jpeg,image/png,image/webp" multiple /></label>
      {error ? <p className={styles.formError}>{error}</p> : null}
      {configured && isSignedIn ? <button className={buttonClassName({ size: "lg", className: styles.formSubmit })} type="submit" disabled={submitting}>{submitting ? "Saving securely…" : <>Submit commission request <ArrowRight aria-hidden="true" size={18} /></>}</button> : configured ? <Link className={buttonClassName({ size: "lg", className: styles.formSubmit })} href="/sign-in?redirect_url=/custom-murti#consultation">Sign in to begin <ArrowRight aria-hidden="true" size={18} /></Link> : <a className={buttonClassName({ size: "lg", className: styles.formSubmit })} href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20to%20discuss%20a%20custom%20murti." target="_blank" rel="noreferrer">Continue on WhatsApp <ArrowRight aria-hidden="true" size={18} /></a>}
      <p className={styles.formPrivacy}><LockKeyhole aria-hidden="true" size={14} /> Requests and reference images are private to your account and authorised gallery staff.</p>
    </form>
  );
}

export function ConsultationForm() {
  const configured = useAuthConfigured();
  if (configured) return <ConnectedConsultationForm />;
  return <div className={styles.consultationForm}><div className={styles.formSuccess}><MessageCircle aria-hidden="true" size={34} /><h2 className="font-display">Begin with a personal conversation.</h2><p>The secure commission workspace is ready and opens when account keys are configured.</p><a className={buttonClassName({ size: "lg" })} href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20to%20discuss%20a%20custom%20murti." target="_blank" rel="noreferrer">Continue on WhatsApp <ArrowRight aria-hidden="true" size={18} /></a></div></div>;
}
