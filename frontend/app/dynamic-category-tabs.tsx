"use client";

import { useMemo } from "react";
import { Tabs } from "@/components/ui/tabs";
import { ProductCard as CatalogProductCard } from "@/components/Catalog/product-card";
import type { ProductCard, HomeDeityGroup } from "@/api/products";
import styles from "./page.module.css";

function groupName(group: HomeDeityGroup) {
  const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  return (
    normalizeText(group.deity_name) ||
    normalizeText(group.diety_name) ||
    normalizeText(group.products?.[0]?.deity) ||
    "Collection"
  );
}

export function DynamicCategoryTabs({
  products = [],
  groups = [],
  groupBy = "deity",
  idPrefix,
}: {
  products?: ProductCard[];
  groups?: HomeDeityGroup[];
  groupBy?: "deity" | "category";
  idPrefix: string;
}) {
  const tabs = useMemo(() => {
    // If backend provided pre-grouped data, use it!
    if (groups && groups.length > 0) {
      return groups.map((g, index) => ({
        id: groupName(g) || g.deity_slug || `group-${index}`,
        label: groupName(g) || "Collection",
        content: (
          <div className={styles.productRail}>
            {g.products.map((product, pIndex) => (
              <CatalogProductCard product={product} priority={pIndex === 0} key={product.uid ?? product.slug ?? `${idPrefix}-${pIndex}`} />
            ))}
          </div>
        )
      })).filter(t => t.label);
    }

    // Otherwise, dynamically group products
    if (!products || !products.length) return [];

    const groupedMap = new Map<string, ProductCard[]>();

    products.forEach((p) => {
      let key = "";
      if (groupBy === "deity") {
        key = typeof p.deity === "string" ? p.deity.trim() : "";
      } else if (groupBy === "category") {
        key = typeof p.category === "string" ? p.category.trim() : "";
      }
      
      if (key) {
        if (!groupedMap.has(key)) groupedMap.set(key, []);
        groupedMap.get(key)!.push(p);
      }
    });

    const uniqueKeys = Array.from(groupedMap.keys());

    if (uniqueKeys.length === 0) {
      return [
        {
          id: "all",
          label: "All",
          content: (
            <div className={styles.productRail}>
              {products.map((product, index) => (
                <CatalogProductCard product={product} priority={index === 0} key={product.uid ?? product.slug ?? `${idPrefix}-${index}`} />
              ))}
            </div>
          ),
        },
      ];
    }

    // Reorder tabs: match preferred order if deity
    const preferredDreamMootiOrder = ["ganesh", "hanuman", "radha krishna"];
    if (groupBy === "deity") {
      uniqueKeys.sort((a, b) => {
        const aName = a.toLowerCase();
        const bName = b.toLowerCase();
        const aIndex = preferredDreamMootiOrder.findIndex((name) => aName.includes(name));
        const bIndex = preferredDreamMootiOrder.findIndex((name) => bName.includes(name));
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }

    return uniqueKeys.map((key) => {
      const groupProducts = groupedMap.get(key)!;
      return {
        id: key,
        label: key,
        content: (
          <div className={styles.productRail}>
            {groupProducts.map((product, index) => (
              <CatalogProductCard product={product} priority={index === 0} key={product.uid ?? product.slug ?? `${idPrefix}-${index}`} />
            ))}
          </div>
        ),
      };
    });
  }, [products, groups, groupBy, idPrefix]);

  if (!tabs.length) return null;

  return (
    <div className={styles.popularTabsContainer || ""}>
      <Tabs items={tabs} idPrefix={idPrefix} />
    </div>
  );
}
