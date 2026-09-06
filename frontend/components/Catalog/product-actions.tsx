// @ts-nocheck
"use client";

import { MessageCircle, Phone, Share2 } from "lucide-react";
import { buttonClassName, Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ProductPrice } from "@/api/products";
import { brand } from "@/src/config/brand";
import { formatDiscountPercentage, formatOptionalCurrency } from "@/src/utils/formatCurrency";
import styles from "@/app/products/[slug]/product-page.module.css";

export function ProductActions({
  name,
  height,
  price: priceInfo,
}: {
  productId: string;
  name: string;
  height: number;
  price?: ProductPrice | null;
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
  const sellingPrice = formatOptionalCurrency(priceInfo?.selling_price);
  const originalPrice = formatOptionalCurrency(priceInfo?.original_price);
  const discount = formatDiscountPercentage(priceInfo?.discount_percentage);
  const discountLabel = discount ? `-${discount}` : null;

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
          {sellingPrice ? (
            <div className={styles.detailPrice} aria-label="Product price">
              <div className={styles.detailPricePrimary}>
                {discountLabel ? <span className={styles.detailDiscount}>{discountLabel}</span> : null}
                <strong className={styles.detailSellingPrice}>{sellingPrice}</strong>
              </div>
              {originalPrice ? <p className={styles.mrpLine}>M.R.P.: <del>{originalPrice}</del></p> : null}
              <p className={styles.taxLine}>Inclusive of all taxes</p>
            </div>
          ) : (
            <>
              <span className={styles.availabilityBadge}>Availability</span>
              <strong className={styles.availabilityTitle}>Available on request</strong>
              <p className={styles.availabilityDesc}>Contact our gallery for current availability, pricing and delivery details.</p>
            </>
          )}
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
