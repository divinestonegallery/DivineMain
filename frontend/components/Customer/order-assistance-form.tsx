// @ts-nocheck
"use client";

import { FormEvent } from "react";
import { ArrowRight, MessageCircle, PackageSearch, Phone } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import styles from "./customer-page.module.css";

export function OrderAssistanceForm() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => form.get(name)?.toString().trim() || "Not specified";
    const message = encodeURIComponent(["Namaste, I would like assistance with an enquiry or order.", "", `Name: ${value("name")}`, `Phone: ${value("phone")}`, `Reference: ${value("reference")}`, `Question: ${value("message")}`].join("\n"));
    window.open(`https://wa.me/919166138566?text=${message}`, "_blank", "noopener,noreferrer");
  }

  return (
    <section className={styles.section}><div className={`${styles.orderLayout} site-container`}><div className={styles.orderCard}><PackageSearch aria-hidden="true" size={27} /><h2 className="font-display">Have your reference ready.</h2><p>Share the quotation number, product name, payment reference or the phone number used during the conversation. The gallery can then locate the correct details more quickly.</p><a href="tel:+919166138566"><Phone aria-hidden="true" size={17} /> Call +91 91661 38566</a></div><div className={styles.orderCard}><h2 className="font-display">Prepare an order-assistance message.</h2><form className={styles.orderForm} onSubmit={handleSubmit}><label>Your name<input name="name" autoComplete="name" required /></label><label>WhatsApp number<input name="phone" type="tel" autoComplete="tel" required /></label><label>Order or quotation reference<input name="reference" placeholder="If available" /></label><label>How can we help?<textarea name="message" required /></label><button className={buttonClassName({ size: "lg" })} type="submit"><MessageCircle aria-hidden="true" size={18} /> Continue on WhatsApp <ArrowRight aria-hidden="true" size={17} /></button></form></div></div></section>
  );
}
