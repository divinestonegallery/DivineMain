// @ts-nocheck
import styles from "./product.module.css";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function ProductPrice({ price, compareAtPrice, compact = false }: { price: number; compareAtPrice?: number; compact?: boolean }) {
  const discount = compareAtPrice && compareAtPrice > price
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : null;

  return (
    <div className={`${styles.price} ${compact ? styles.priceCompact : ""}`}>
      <strong>{inr.format(price)}</strong>
      {compareAtPrice ? <del>{inr.format(compareAtPrice)}</del> : null}
      {discount ? <span>{discount}% off</span> : null}
    </div>
  );
}
