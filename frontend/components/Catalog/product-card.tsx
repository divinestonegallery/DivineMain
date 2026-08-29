// @ts-nocheck
"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Product } from "@/src/types/product";
import { ProductPrice } from "./product-price";
import { ProductRating } from "./product-rating";
import styles from "./product.module.css";

export function ProductCard({ product, priority = false, href }: { product: Product; priority?: boolean; href?: string }) {
  const [wishlisted, setWishlisted] = useState(false);
  const { showToast } = useToast();
  const unavailable = product.availability === "sold-out";
  const productHref = href ?? `/products/${product.slug}`;

  function addToBag() {
    showToast(`${product.name} added to your bag.`);
  }

  return (
    <article className={styles.productCard}>
      <div className={styles.productMedia}>
        <Link href={productHref} aria-label={`View ${product.name}`}>
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes="(max-width: 680px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
          />
        </Link>
        <div className={styles.productBadges}>
          {product.readyToShip ? <Badge tone="success">Ready to ship</Badge> : null}
          {product.customizable ? <Badge tone="gold">Customizable</Badge> : null}
        </div>
        <button
          className={`${styles.wishlistButton} ${wishlisted ? styles.wishlisted : ""}`}
          type="button"
          aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={wishlisted}
          onClick={() => {
            setWishlisted((value) => !value);
            showToast(wishlisted ? "Removed from your wishlist." : "Saved to your wishlist.");
          }}
        >
          <Heart aria-hidden="true" size={19} fill={wishlisted ? "currentColor" : "none"} strokeWidth={1.5} />
        </button>
        <Button className={styles.quickAdd} disabled={unavailable} size="sm" onClick={addToBag}>
          <ShoppingBag aria-hidden="true" size={15} />
          {unavailable ? "Sold out" : "Quick add"}
        </Button>
      </div>
      <div className={styles.productInfo}>
        <div className={styles.productMeta}>
          <span>{product.deity}</span>
          <span aria-hidden="true">·</span>
          <span>{product.material}</span>
        </div>
        <Link className={styles.productName} href={productHref}>{product.name}</Link>
        {product.rating ? <ProductRating rating={product.rating} reviewCount={product.reviewCount} /> : null}
        <ProductPrice price={product.price} compareAtPrice={product.compareAtPrice} compact />
      </div>
    </article>
  );
}
