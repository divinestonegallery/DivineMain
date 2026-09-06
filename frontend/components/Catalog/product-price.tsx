import type { ProductPrice as ProductPriceValue } from "@/api/products";
import { formatDiscountPercentage, formatOptionalCurrency } from "@/src/utils/formatCurrency";
import styles from "./product.module.css";

type ProductPriceProps = {
  price?: ProductPriceValue | null;
  compact?: boolean;
  showGst?: boolean;
  fallback?: string | null;
};

export function ProductPrice({ price, compact = false, showGst = false, fallback = null }: ProductPriceProps) {
  const sellingPrice = formatOptionalCurrency(price?.selling_price);
  const originalPrice = formatOptionalCurrency(price?.original_price);
  const discount = formatDiscountPercentage(price?.discount_percentage);
  const gstPrice = formatOptionalCurrency(price?.gst_price);

  if (!sellingPrice) {
    return fallback ? (
      <div className={`${styles.price} ${compact ? styles.priceCompact : ""}`}>
        <strong>{fallback}</strong>
      </div>
    ) : null;
  }

  return (
    <div className={`${styles.price} ${compact ? styles.priceCompact : ""}`}>
      <strong>{sellingPrice}</strong>
      {originalPrice || discount ? (
        <span className={styles.priceMeta}>
          {originalPrice ? <del>{originalPrice}</del> : null}
          {discount ? <span className={styles.discountBadge}>{discount} OFF</span> : null}
        </span>
      ) : null}
      {showGst && gstPrice ? <small className={styles.priceGst}>GST: {gstPrice}</small> : null}
    </div>
  );
}
