"use client";

import Image from "next/image";
import Link from "next/link";
import { Gem, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Product } from "@/src/types/product";
import type { ProductCard as ApiProductCard } from "@/api/products";
import { ProductPrice } from "./product-price";
import { ProductRating } from "./product-rating";
import styles from "./product.module.css";

type ProductCardInput = Product | (ApiProductCard & {
  image?: Product["image"];
  image_url?: string | null;
  name?: string;
  price?: number;
  compareAtPrice?: number;
  rating?: number;
  reviewCount?: number;
  readyToShip?: boolean;
  customizable?: boolean;
});

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function amount(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function productName(product: ProductCardInput) {
  return text((product as Product).name) || text((product as ApiProductCard).title) || "Untitled work";
}

function productImage(product: ProductCardInput, fallbackAlt: string) {
  const typedImage = (product as Product).image;
  if (typedImage?.src) return { src: typedImage.src, alt: typedImage.alt || fallbackAlt };

  const src = text((product as ApiProductCard).cover_photo) || text((product as { image_url?: string | null }).image_url);
  return src ? { src, alt: fallbackAlt } : null;
}

function productPrice(product: ProductCardInput) {
  return amount((product as Product).price) ?? amount((product as ApiProductCard).selling_price);
}

function productCompareAtPrice(product: ProductCardInput) {
  return amount((product as Product).compareAtPrice) ?? amount((product as ApiProductCard).original_price) ?? undefined;
}

function normalizedAvailability(product: ProductCardInput) {
  return text((product as Product).availability || (product as ApiProductCard).availability);
}

function isReadyToShip(product: ProductCardInput, availability: string) {
  if (typeof (product as Product).readyToShip === "boolean") return Boolean((product as Product).readyToShip);
  return availability === "in-stock" || availability === "in_stock";
}

function isCustomizable(product: ProductCardInput) {
  if (typeof (product as Product).customizable === "boolean") return Boolean((product as Product).customizable);
  const salesMode = text((product as ApiProductCard).sales_mode);
  return salesMode === "quote_only" || salesMode === "buy_and_quote";
}

function priceFallback(product: ProductCardInput) {
  const salesMode = text((product as ApiProductCard).sales_mode);
  return salesMode === "direct_purchase" || salesMode === "buy_and_quote" ? "Price on request" : "Enquire for price";
}

export function ProductCard({ product, priority = false, href }: { product: ProductCardInput; priority?: boolean; href?: string }) {

  const { showToast } = useToast();
  const name = productName(product);
  const image = productImage(product, name);
  const price = productPrice(product);
  const compareAtPrice = productCompareAtPrice(product);
  const availability = normalizedAvailability(product);
  const unavailable = availability === "sold-out" || availability === "out_of_stock";
  const productHref = href ?? (product.slug ? `/products/${product.slug}` : "/shop");
  const meta = [text(product.deity), text(product.material || (product as ApiProductCard).category)].filter(Boolean);

  function addToBag() {
    showToast(`${name} added to your bag.`);
  }

  return (
    <article className={styles.productCard}>
      <div className={styles.productMedia}>
        <Link href={productHref} aria-label={`View ${name}`}>
          {image ? (
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 680px) 72vw, (max-width: 1024px) 38vw, 24vw"
              priority={priority}
              unoptimized={/^https?:\/\//i.test(image.src)}
            />
          ) : (
            <span className={styles.productImagePlaceholder}>
              <Gem aria-hidden="true" size={28} strokeWidth={1.35} />
              <small>Image coming soon</small>
            </span>
          )}
        </Link>
        <div className={styles.productBadges}>
          {isReadyToShip(product, availability) ? <Badge tone="success">Ready to ship</Badge> : null}
          {isCustomizable(product) ? <Badge tone="gold">Customizable</Badge> : null}
        </div>

        <Button className={styles.quickAdd} disabled={unavailable} size="sm" onClick={addToBag}>
          <ShoppingBag aria-hidden="true" size={15} />
          {unavailable ? "Sold out" : "Quick add"}
        </Button>
      </div>
      <div className={styles.productInfo}>
        {meta.length ? (
          <div className={styles.productMeta}>
            {meta.map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        ) : null}
        <Link className={styles.productName} href={productHref}>{name}</Link>
        {product.rating ? <ProductRating rating={product.rating} reviewCount={product.reviewCount} /> : null}
        {price ? (
          <ProductPrice price={price} compareAtPrice={compareAtPrice} compact />
        ) : (
          <div className={`${styles.price} ${styles.priceCompact}`}>
            <strong>{priceFallback(product)}</strong>
          </div>
        )}
      </div>
    </article>
  );
}
