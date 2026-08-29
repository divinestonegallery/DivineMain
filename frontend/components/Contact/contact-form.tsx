// @ts-nocheck
"use client";

import { FormEvent } from "react";
import { ArrowRight, LockKeyhole, MessageCircle } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { FormField, SelectField, TextareaField } from "@/components/ui/form-field";
import styles from "@/app/contact/contact.module.css";

export function ContactForm() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => form.get(name)?.toString().trim() || "Not specified";
    const message = [
      "Namaste, I would like assistance from Divine Stone Gallery.",
      "",
      `Name: ${value("name")}`,
      `Phone: ${value("phone")}`,
      `Help with: ${value("reason")}`,
      `Product or page: ${value("product")}`,
      `Message: ${value("message")}`,
    ].join("\n");
    window.open(`https://wa.me/919166138566?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <form className={styles.contactForm} onSubmit={handleSubmit}>
      <div className={styles.formTitle}><MessageCircle aria-hidden="true" size={21} /><div><p>Send an enquiry</p><h2 className="font-display">How can we help?</h2></div></div>
      <div className={styles.formGrid}>
        <FormField label="Your name" name="name" autoComplete="name" placeholder="Full name" required />
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
      <button className={buttonClassName({ size: "lg", className: styles.submitButton })} type="submit">Continue on WhatsApp <ArrowRight aria-hidden="true" size={18} /></button>
      <p className={styles.formPrivacy}><LockKeyhole aria-hidden="true" size={14} /> This frontend does not store your details. The prepared message opens directly in WhatsApp.</p>
    </form>
  );
}
