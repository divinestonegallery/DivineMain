"use client";

import Image from "next/image";
import Link from "next/link";
import { Gem } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/src/types/product";
import type { BackendProductImage, ProductCard as ApiProductCard, ProductPrice as ProductPriceValue } from "@/api/products";
import { ProductPrice } from "./product-price";
import { ProductRating } from "./product-rating";
import styles from "./product.module.css";

type ProductCardInput = Product | (ApiProductCard & {
  image?: Product["image"];
  image_url?: string | null;
  name?: string | null;
  price?: ProductPriceValue | null;
  rating?: number;
  reviewCount?: number;
  readyToShip?: boolean;
  customizable?: boolean;
});

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePriceValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? String(value) : null;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isPriceObject(value: unknown): value is ProductPriceValue {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeProductPrice(value: unknown): ProductPriceValue | null {
  if (!isPriceObject(value)) return null;

  const price = {
    selling_price: normalizePriceValue(value.selling_price) ?? "",
    original_price: normalizePriceValue(value.original_price) ?? "",
    discount_percentage: normalizePriceValue(value.discount_percentage) ?? "",
    gst_price: normalizePriceValue(value.gst_price) ?? "",
  };

  return Object.values(price).some(Boolean) ? price : null;
}

function productName(product: ProductCardInput) {
  return text((product as Product).name) || text((product as ApiProductCard).title) || "Untitled work";
}

function productImage(product: ProductCardInput, fallbackAlt: string) {
  const typedImage = (product as Product).image;
  if (typedImage?.src) return { src: typedImage.src, alt: typedImage.alt || fallbackAlt };

  const images = Array.isArray((product as { images?: BackendProductImage[] }).images)
    ? [...((product as { images?: BackendProductImage[] }).images ?? [])]
        .filter((item) => text(item.image_url))
        .sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0))
    : [];
  const galleryImage = images.find((item) => item.cover_photo) ?? images[0];
  const src =
    text(galleryImage?.image_url) ||
    text((product as ApiProductCard).cover_photo) ||
    text((product as { image_url?: string | null }).image_url);
  const alt = text(galleryImage?.alt_text) || fallbackAlt;
  return src ? { src, alt } : null;
}

function productPrice(product: ProductCardInput): ProductPriceValue | null {
  return normalizeProductPrice((product as { price?: unknown }).price);
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
  const name = productName(product);
  const image = productImage(product, name);
  const price = productPrice(product);
  const productHref = href ?? (product.slug ? `/products/${product.slug}` : "/shop");
  const meta = [text(product.deity), text(product.material || (product as ApiProductCard).category)].filter(Boolean);

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
          {isCustomizable(product) ? <Badge tone="gold">Customizable</Badge> : null}
        </div>
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
        <ProductPrice price={price} compact fallback={priceFallback(product)} />
      </div>
    </article>
  );
}
