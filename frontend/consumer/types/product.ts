// @ts-nocheck
import type { ProductPrice } from "@/api/products";

export type ProductAvailability = "in-stock" | "made-to-order" | "pre-order" | "sold-out";

export type ProductImage = {
  src: string;
  alt: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  deity?: string | null;
  material: string;
  price?: ProductPrice | null;
  currency: "INR";
  image: ProductImage;
  gallery?: ProductImage[];
  rating?: number;
  reviewCount?: number;
  availability: ProductAvailability;
  readyToShip?: boolean;
  customizable?: boolean;
  dimensions?: {
    height: number;
    width: number;
    depth: number;
    unit: "in" | "cm";
  };
};
