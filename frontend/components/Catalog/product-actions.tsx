// @ts-nocheck
"use client";

import { Heart, MessageCircle, Phone, Share2, ShoppingBag } from "lucide-react";
import { buttonClassName, Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { brand } from "@/src/config/brand";
import { useEnquiryBag, useSavedWorks } from "@/components/Customer/device-collections";
import styles from "@/app/products/[slug]/product-page.module.css";

export function ProductActions({
  productId,
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
  const savedWorks = useSavedWorks();
  const enquiryBag = useEnquiryBag();
  const saved = savedWorks.ids.has(productId);
  const inBag = enquiryBag.ids.has(productId);
  const { showToast } = useToast();
  const message = encodeURIComponent(
    `Namaste, I would like current availability and details for ${name} (${height} inch).`,
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
          <span>Price</span>
          <strong className="font-display">{price ?? "Available on request"}</strong>
          <small>{price ? "Price before GST. Shipping is calculated separately for your postcode." : "Ask us for current availability, pricing and delivery guidance."}</small>
        </div>
        <a className={buttonClassName({ size: "lg", className: styles.whatsappButton })} href={whatsappHref} target="_blank" rel="noreferrer">
          <MessageCircle aria-hidden="true" size={18} /> Enquire on WhatsApp
        </a>
        <a className={buttonClassName({ variant: "outline", size: "lg", className: styles.callButton })} href="tel:+919166138566">
          <Phone aria-hidden="true" size={18} /> Call {brand.phone}
        </a>
        <div className={styles.secondaryActions}>
          <Button
            variant="ghost"
            aria-pressed={saved}
            onClick={() => {
              const added = savedWorks.toggle(productId);
              showToast(added ? "Added to your wishlist." : "Removed from your wishlist.");
            }}
          >
            <Heart aria-hidden="true" size={17} fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved" : "Save"}
          </Button>
          <Button
            variant="ghost"
            aria-pressed={inBag}
            onClick={() => {
              const added = enquiryBag.toggle(productId);
              showToast(added ? "Added to your enquiry bag." : "Removed from your enquiry bag.");
            }}
          >
            <ShoppingBag aria-hidden="true" size={17} /> {inBag ? "In bag" : "Add to bag"}
          </Button>
          <Button variant="ghost" onClick={shareProduct}>
            <Share2 aria-hidden="true" size={17} /> Share
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
