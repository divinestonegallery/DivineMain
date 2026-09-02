// @ts-nocheck
"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole, MessageCircle } from "lucide-react";
import { sendContactMessage } from "@/api/contact";
import { buttonClassName } from "@/components/ui/button";
import { FormField, SelectField, TextareaField } from "@/components/ui/form-field";
import styles from "@/app/contact/contact.module.css";

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const value = (name: string) => form.get(name)?.toString().trim() || "Not specified";
    setSubmitting(true);
    setError("");

    try {
      await sendContactMessage({
        name: value("name"),
        email: value("email"),
        phone: value("phone") === "Not specified" ? "" : value("phone"),
        message: [
          `Help with: ${value("reason")}`,
          `Product or page: ${value("product")}`,
          "",
          value("message"),
        ].join("\n"),
      });
      setSent(true);
      formElement.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your enquiry could not be sent.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className={styles.contactForm}>
        <div className={styles.formTitle}><CheckCircle2 aria-hidden="true" size={24} /><div><p>Enquiry received</p><h2 className="font-display">We will contact you shortly.</h2></div></div>
        <p className={styles.formPrivacy}>Your message has been saved in the gallery backend.</p>
        <button className={buttonClassName({ size: "lg", className: styles.submitButton })} type="button" onClick={() => setSent(false)}>Send another enquiry</button>
      </div>
    );
  }

  return (
    <form className={styles.contactForm} onSubmit={handleSubmit}>
      <div className={styles.formTitle}><MessageCircle aria-hidden="true" size={21} /><div><p>Send an enquiry</p><h2 className="font-display">How can we help?</h2></div></div>
      <div className={styles.formGrid}>
        <FormField label="Your name" name="name" autoComplete="name" placeholder="Full name" required />
        <FormField label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        <FormField label="WhatsApp number" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. +91 98765 43210" required />
        <SelectField className={styles.fullField} label="What can we help with?" name="reason" defaultValue="" required>
          <option value="" disabled>Select a topic</option>
          <option>Choosing a murti</option>
          <option>Product availability or pricing</option>
          <option>Custom murti commission</option>
          <option>Size, material or care guidance</option>
          <option>Packing or delivery question</option>
          <option>Existing enquiry or order</option>
          <option>Something else</option>
        </SelectField>
        <FormField className={styles.fullField} label="Product name or page link" name="product" placeholder="Optional" />
        <TextareaField className={styles.fullField} label="Your message" name="message" placeholder="Tell us the deity, size, destination or question you have in mind." required />
      </div>
      {error ? <p className={styles.formPrivacy}>{error}</p> : null}
      <button className={buttonClassName({ size: "lg", className: styles.submitButton })} type="submit" disabled={submitting}>{submitting ? "Sending..." : <>Send enquiry <ArrowRight aria-hidden="true" size={18} /></>}</button>
      <p className={styles.formPrivacy}><LockKeyhole aria-hidden="true" size={14} /> Your message is sent securely to the Divine Stone Gallery backend.</p>
    </form>
  );
}
