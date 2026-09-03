"use client";

import { useMemo } from "react";
import { Tabs } from "@/components/ui/tabs";
import { ProductCard as CatalogProductCard } from "@/components/Catalog/product-card";
import type { ProductCard } from "@/api/products";
import styles from "./page.module.css";

export function PopularMoortiTabs({ products, title }: { products: ProductCard[]; title: string }) {
  const tabs = useMemo(() => {
    if (!products.length) return [];

    const deitiesMap = new Map<string, ProductCard[]>();

    products.forEach((p) => {
      const deity = typeof p.deity === "string" ? p.deity.trim() : "";
      if (deity) {
        if (!deitiesMap.has(deity)) deitiesMap.set(deity, []);
        deitiesMap.get(deity)!.push(p);
      }
    });

    const uniqueDeities = Array.from(deitiesMap.keys());

    if (uniqueDeities.length === 0) {
      return [
        {
          id: "all",
          label: "All",
          content: (
            <div className={styles.productRail}>
              {products.map((product, index) => (
                <CatalogProductCard product={product} priority={index === 0} key={product.uid ?? product.slug ?? `${title}-${index}`} />
              ))}
            </div>
          ),
        },
      ];
    }

    return uniqueDeities.map((deity) => {
      const deityProducts = deitiesMap.get(deity)!;
      return {
        id: deity,
        label: deity,
        content: (
          <div className={styles.productRail}>
            {deityProducts.map((product, index) => (
              <CatalogProductCard product={product} priority={index === 0} key={product.uid ?? product.slug ?? `${title}-${index}`} />
            ))}
          </div>
        ),
      };
    });
  }, [products, title]);

  if (!tabs.length) return null;

  return (
    <div className={styles.popularTabsContainer || ""}>
      <Tabs items={tabs} idPrefix="popular-mooti" />
    </div>
  );
}
