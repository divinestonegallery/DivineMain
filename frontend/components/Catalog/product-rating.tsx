// @ts-nocheck
import { Star } from "lucide-react";
import styles from "./product.module.css";

export function ProductRating({ rating = 0, reviewCount = 0 }: { rating?: number; reviewCount?: number }) {
  return (
    <div className={styles.rating} aria-label={`${rating} out of 5 stars from ${reviewCount} reviews`}>
      <Star aria-hidden="true" size={14} fill="currentColor" strokeWidth={1.4} />
      <span>{rating.toFixed(1)}</span>
      <small>({reviewCount})</small>
    </div>
  );
}
