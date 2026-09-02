// @ts-nocheck
"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/components/Auth/auth-facade";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, MessageCircle } from "lucide-react";
import { submitCustomizeRequest } from "@/api/contact";
import { buttonClassName } from "@/components/ui/button";
import { FormField, SelectField, TextareaField } from "@/components/ui/form-field";
import { AccountBootstrap } from "@/components/Auth/account-bootstrap";
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
    setSubmitting(true);
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const value = (name: string) => form.get(name)?.toString().trim() || "";
    try {
      await getToken();
      await submitCustomizeRequest({
        name: value("name") || undefined,
        email: value("email") || undefined,
        phone: value("phone") || undefined,
        city: value("city"),
        pincode: value("postalCode") || undefined,
        approximate_height: value("heightInches") ? `${value("heightInches")} inches` : undefined,
        preferred_material: value("material") || undefined,
        description: [
          `Deity or subject: ${value("deity") || "Not specified"}`,
          `Placement: ${value("placement") || "Not specified"}`,
          `Preferred finish: ${value("finish") || "Not specified"}`,
          `Timeline: ${value("timeline") || "Flexible"}`,
          "",
          value("notes"),
        ].join("\n").trim(),
      });
      setCreated("custom-murti");
      formElement.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The custom murti request could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) return <div className={styles.consultationForm}><div className={styles.formSuccess}><CheckCircle2 aria-hidden="true" size={34} /><h2 className="font-display">Your custom murti request is saved.</h2><p>The gallery team will review the details and contact you.</p>{createdWarning || error ? <p className={styles.formError}>{createdWarning || error}</p> : null}<button className={buttonClassName({ size: "lg" })} type="button" onClick={() => setCreated(null)}>Send another request <ArrowRight aria-hidden="true" size={18} /></button></div></div>;

  return (
    <form className={styles.consultationForm} onSubmit={handleSubmit}>
      {configured ? <AccountBootstrap /> : null}
      <div className={styles.formHeading}><span><MessageCircle aria-hidden="true" size={20} /></span><div><p>Begin your consultation</p><h2 className="font-display">Tell us what you envision.</h2></div></div>
      {isLoaded && !isSignedIn ? <div className={styles.referenceNote}><LockKeyhole aria-hidden="true" size={20} /><span><strong>You can submit without signing in.</strong><small>Sign in first if you want this request associated with your gallery account.</small></span></div> : null}
      <div className={styles.formGrid}>
        <FormField label="Your name" name="name" autoComplete="name" placeholder="Full name" required />
        <FormField label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        <FormField label="WhatsApp number" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. +91 98765 43210" required />
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
      {error ? <p className={styles.formError}>{error}</p> : null}
      <button className={buttonClassName({ size: "lg", className: styles.formSubmit })} type="submit" disabled={submitting}>{submitting ? "Saving securely..." : <>Submit custom request <ArrowRight aria-hidden="true" size={18} /></>}</button>
      <p className={styles.formPrivacy}><LockKeyhole aria-hidden="true" size={14} /> Requests are saved through the Django customisation endpoint for gallery staff follow-up.</p>
    </form>
  );
}

export function ConsultationForm() {
  const configured = useAuthConfigured();
  if (configured) return <ConnectedConsultationForm />;
  return <div className={styles.consultationForm}><div className={styles.formSuccess}><MessageCircle aria-hidden="true" size={34} /><h2 className="font-display">Begin with a personal conversation.</h2><p>The secure commission workspace is ready and opens when account keys are configured.</p><a className={buttonClassName({ size: "lg" })} href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20to%20discuss%20a%20custom%20murti." target="_blank" rel="noreferrer">Continue on WhatsApp <ArrowRight aria-hidden="true" size={18} /></a></div></div>;
}
