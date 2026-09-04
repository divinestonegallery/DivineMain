// @ts-nocheck
"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole, PackageCheck, ShieldCheck } from "lucide-react";
import { sendContactMessage } from "@/api/contact";
import { buttonClassName } from "@/components/ui/button";
import type { CatalogItem } from "@/components/Catalog/catalog-data";
import { useEnquiryBag } from "@/components/Customer/device-collections";
import styles from "./checkout.module.css";

function isRemoteImage(src: string) {
  return /^https?:\/\//i.test(src);
}

function itemSize(item: CatalogItem) {
  return item.height > 0 ? `${item.height} inch` : "custom sizing";
}

function SelectedItems({ items }: { items: CatalogItem[] }) {
  return (
    <div className={styles.items}>
      {items.map((item) => (
        <article className={styles.item} key={item.id}>
          <Link className={styles.itemImage} href={`/products/${item.slug}`}>
            <Image src={item.image} alt={item.imageAlt} fill sizes="92px" unoptimized={isRemoteImage(item.image)} />
          </Link>
          <div>
            <small>{item.deity} - {item.material}</small>
            <h3 className="font-display">{item.name}</h3>
            <p>{itemSize(item)} - {item.salesMode === "quote" ? "quote only" : "enquiry ready"}</p>
          </div>
          <strong>{item.pricePaise ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(item.pricePaise / 100) : "Quote"}</strong>
        </article>
      ))}
    </div>
  );
}

export function CheckoutExperience({ products }: { products: CatalogItem[] }) {
  const enquiryBag = useEnquiryBag();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const selectedItems = useMemo(() => {
    const selectedIds = enquiryBag.ids;
    return products.filter((item) => selectedIds.has(item.id) || selectedIds.has(item.slug));
  }, [enquiryBag.ids, products]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItems.length) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const value = (name: string) => form.get(name)?.toString().trim() || "";
    setSubmitting(true);
    setError("");

    try {
      await sendContactMessage({
        name: value("name"),
        email: value("email"),
        phone: value("phone"),
        message: [
          "Checkout enquiry from selected bag:",
          "",
          ...selectedItems.map((item, index) => `${index + 1}. ${item.name} (${item.slug}) - ${itemSize(item)} - ${item.material}`),
          "",
          `Delivery city: ${value("city")}`,
          `Postcode: ${value("postalCode")}`,
          `Preferred payment: ${value("paymentMethod") || "Not specified"}`,
          "",
          value("message"),
        ].join("\n"),
      });
      enquiryBag.clear();
      formElement.reset();
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The checkout enquiry could not be sent.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className={styles.centerCard}>
        <CheckCircle2 aria-hidden="true" size={34} />
        <h2 className="font-display">Your enquiry is with the gallery.</h2>
        <p>The selected works and delivery details were saved in the backend contact queue.</p>
        <Link className={buttonClassName({ size: "lg" })} href="/shop">Continue exploring <ArrowRight aria-hidden="true" size={17} /></Link>
      </div>
    );
  }

  if (!selectedItems.length) {
    return (
      <div className={styles.centerCard}>
        <PackageCheck aria-hidden="true" size={30} />
        <h2 className="font-display">Your enquiry bag is empty.</h2>
        <p>Add one or more ready-made works, then return here to request pricing, delivery and payment guidance.</p>
        <Link className={buttonClassName({ size: "lg" })} href="/shop">Explore the collection <ArrowRight aria-hidden="true" size={17} /></Link>
      </div>
    );
  }

  return (
    <div className={styles.checkoutGrid}>
      <div className={styles.itemsPanel}>
        <div className={styles.panelHeading}>
          <div><span>Selected works</span><h2 className="font-display">Review your enquiry</h2></div>
          <Link href="/cart">Edit bag</Link>
        </div>
        <SelectedItems items={selectedItems} />
        <div className={styles.readyMessage}>
          <ShieldCheck aria-hidden="true" size={19} />
          <span>Final pricing, GST, packing, freight and payment mode are confirmed by gallery staff.</span>
        </div>
      </div>

      <aside className={styles.summaryPanel}>
        <span className={styles.secureLabel}><LockKeyhole aria-hidden="true" size={15} /> Backend connected</span>
        <h2 className="font-display">Send details</h2>
        <form className={styles.readinessForm} onSubmit={submit}>
          <label><span>Name</span><input name="name" autoComplete="name" required /></label>
          <label><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
          <label><span>WhatsApp number</span><input name="phone" type="tel" autoComplete="tel" required /></label>
          <label><span>Delivery city</span><input name="city" autoComplete="address-level2" required /></label>
          <label><span>Delivery postcode</span><input name="postalCode" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} required /></label>
          <fieldset>
            <legend>Preferred payment</legend>
            <label><input type="radio" name="paymentMethod" value="online" /><span>Online payment<small>Staff will confirm availability first</small></span></label>
            <label><input type="radio" name="paymentMethod" value="bank_transfer" /><span>Bank transfer<small>Details shared after confirmation</small></span></label>
            <label><input type="radio" name="paymentMethod" value="cod" /><span>Cash on Delivery<small>Available only after staff approval</small></span></label>
          </fieldset>
          <label><span>Message</span><textarea name="message" placeholder="Share placement, deadline, delivery access or billing notes." /></label>
          {error ? <p className={styles.formError}>{error}</p> : null}
          <button className={buttonClassName({ size: "lg" })} type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send enquiry"}</button>
        </form>
        <small className={styles.safetyNote}>This project backend exposes enquiry/contact workflows, not live order, payment or shipping APIs. The frontend now submits this step through the supported contact route.</small>
      </aside>
    </div>
  );
}
