// @ts-nocheck
"use client";

import { MessageCircle, Phone, Share2 } from "lucide-react";
import { buttonClassName, Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { brand } from "@/src/config/brand";
import styles from "@/app/products/[slug]/product-page.module.css";

export function ProductActions({
  name,
  height,
  pricePaise,
  gstRateBps,
  stockQuantity,
  salesMode,
}: {
  productId: string;
  name: string;
  height: number;
  pricePaise?: number | null;
  gstRateBps?: number | null;
  stockQuantity?: number;
  salesMode?: "direct" | "quote" | "both";
}) {
  const { showToast } = useToast();
  const heightDetail = height > 0 ? ` (${height} inch)` : "";
  const message = encodeURIComponent(
    `Namaste, I would like current availability and details for ${name}${heightDetail}.`,
  );
  const whatsappHref = `https://wa.me/919166138566?text=${message}`;
  const directReady = pricePaise !== null && pricePaise !== undefined && gstRateBps !== null && gstRateBps !== undefined && Boolean(stockQuantity) && salesMode !== "quote";
  const price = directReady
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(pricePaise / 100)
    : null;

  async function shareProduct() {
    if (navigator.share) {
      await navigator.share({ title: name, url: window.location.href });
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
    showToast("Product link copied.");
  }

  return (
    <>
      <div className={styles.actionCard}>
        <div className={styles.priceNote}>
          <span className={styles.availabilityBadge}>{price ? "Price" : "Availability"}</span>
          <strong className={styles.availabilityTitle}>{price ?? "Available on request"}</strong>
          <p className={styles.availabilityDesc}>{price ? "Price before GST. Shipping calculated separately." : "Contact our gallery for current availability, pricing and delivery details."}</p>
        </div>
        <div className={styles.primaryActions}>
          <a className={buttonClassName({ size: "md", className: styles.whatsappButton })} href={whatsappHref} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden="true" size={18} /> Enquire on WhatsApp
          </a>
          <a className={buttonClassName({ variant: "outline", size: "md", className: styles.callButton })} href="tel:+919166138566">
            <Phone aria-hidden="true" size={18} /> Call {brand.phone}
          </a>
        </div>
        <div className={styles.secondaryActions}>
          <Button variant="ghost" className={styles.secondaryBtn} onClick={shareProduct}>
            <Share2 aria-hidden="true" size={17} /> 
            <span>Share</span>
          </Button>
        </div>
      </div>

      <div className={styles.mobileEnquiryBar}>
        <span><small>Interested in this work?</small><strong>Request details</strong></span>
        <a href={whatsappHref} target="_blank" rel="noreferrer">
          <MessageCircle aria-hidden="true" size={17} /> WhatsApp
        </a>
      </div>
    </>
  );
}
