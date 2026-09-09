// @ts-nocheck
"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import { sendContactMessage } from "@/api/contact";
import { useUser } from "@/components/Auth/auth-facade";
import { buttonClassName } from "@/components/ui/button";
import { FormField, TextareaField } from "@/components/ui/form-field";
import styles from "@/app/contact/contact.module.css";

const emptyIdentity = { name: "", email: "", phone: "" };

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function enquiryError(reason: unknown) {
  const message = reason instanceof Error ? reason.message : "";
  if (/already submitted/i.test(message)) return "This enquiry was already sent recently.";
  return "We couldn't send your enquiry right now. Please check your details and try again.";
}

export function ContactForm() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [identity, setIdentity] = useState(emptyIdentity);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const profileIdentity = {
      name: cleanText(user.name),
      email: cleanText(user.email),
      phone: cleanText(user.phone),
    };

    setIdentity((current) => ({
      name: current.name || profileIdentity.name,
      email: current.email || profileIdentity.email,
      phone: current.phone || profileIdentity.phone,
    }));
  }, [isLoaded, isSignedIn, user]);

  function updateIdentity(field: keyof typeof identity) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setIdentity((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const value = (name: string) => form.get(name)?.toString().trim() || "";
    const cityState = value("cityState");
    const message = value("message");
    setSubmitting(true);
    setError("");

    try {
      await sendContactMessage({
        name: value("name"),
        email: value("email"),
        phone: value("phone"),
        message: [
          `City / State: ${cityState}`,
          "",
          `Comment: ${message || "Not provided"}`,
        ].join("\n").trim(),
      });
      setSent(true);
      formElement.reset();
      if (!isSignedIn) setIdentity(emptyIdentity);
    } catch (reason) {
      setError(enquiryError(reason));
    } finally {
      setSubmitting(false);
    }
  }

  const profileNotice = !isLoaded
    ? "Loading your saved contact details..."
    : isSignedIn
      ? "Contact details loaded from your profile. You can edit them for this enquiry."
      : "";

  if (sent) {
    return (
      <div className={`${styles.contactForm} ${styles.successCard}`} role="status">
        <span className={styles.successIcon}><CheckCircle2 aria-hidden="true" size={30} /></span>
        <div className={styles.formHeader}>
          <p>Enquiry sent</p>
          <h2 className="font-display">Thank you for contacting us.</h2>
          <span>Your enquiry has been sent successfully. Our team will get back to you shortly.</span>
        </div>
        <button className={buttonClassName({ size: "lg", className: styles.submitButton })} type="button" onClick={() => setSent(false)}>Send another enquiry</button>
      </div>
    );
  }

  return (
    <form className={styles.contactForm} onSubmit={handleSubmit}>
      <div className={styles.formHeader}>
        <p>Send an enquiry</p>
        <h2 className="font-display">How can we help?</h2>
        <span>Share your details and the gallery team will guide you personally.</span>
      </div>
      {profileNotice ? <p className={styles.profileNotice}>{profileNotice}</p> : null}
      <div className={styles.formGrid}>
        <FormField label="Name" name="name" autoComplete="name" placeholder="Full name" value={identity.name} onChange={updateIdentity("name")} required />
        <FormField label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={identity.email} onChange={updateIdentity("email")} required />
        <FormField label="Phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. +91 98765 43210" pattern="\+?[0-9][0-9\s-]{7,19}" value={identity.phone} onChange={updateIdentity("phone")} required />
        <FormField label="Address / City / State" name="cityState" autoComplete="address-level2" placeholder="City, State" required />
        <TextareaField className={styles.fullField} label="Query / Description / Comment" name="message" placeholder="Tell us what you are looking for, or leave this blank." />
      </div>
      {error ? <p className={styles.formError} role="alert">{error}</p> : null}
      <button className={buttonClassName({ size: "lg", className: styles.submitButton })} type="submit" disabled={submitting}>{submitting ? "Sending..." : <>Send enquiry <ArrowRight aria-hidden="true" size={18} /></>}</button>
      <p className={styles.formPrivacy}><LockKeyhole aria-hidden="true" size={14} /> Your details are used only to respond to this enquiry.</p>
    </form>
  );
}
