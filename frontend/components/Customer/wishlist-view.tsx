// @ts-nocheck
"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, ShoppingBag, Trash2 } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { CatalogItem } from "@/components/Catalog/catalog-data";
import { useEnquiryBag, useSavedWorks } from "./device-collections";
import styles from "./customer-page.module.css";

export function WishlistView({ products }: { products: CatalogItem[] }) {
  const savedWorks = useSavedWorks();
  const enquiryBag = useEnquiryBag();
  const { showToast } = useToast();
  const items = products.filter((item) => savedWorks.ids.has(item.id));

  if (!items.length) {
    return <section className={styles.section}><div className="site-container"><div className={styles.emptyState}><div><Heart aria-hidden="true" size={31} /><h2 className="font-display">Your wishlist is ready for its first work.</h2><p>Use the heart on any collection card or product page. Works are kept on this device while signed out and securely synchronized after sign-in.</p><Link className={buttonClassName({ size: "lg" })} href="/shop">Explore the collection <ArrowRight aria-hidden="true" size={18} /></Link></div></div></div></section>;
  }

  return (
    <section className={styles.section}>
      <div className="site-container">
        <div className={styles.sectionHeading}><h2 className="font-display">{items.length} saved {items.length === 1 ? "work" : "works"}</h2><button type="button" onClick={() => { savedWorks.clear(); showToast("Wishlist cleared."); }}>Clear wishlist</button></div>
        <div className={styles.productGrid}>
          {items.map((item) => {
            const inBag = enquiryBag.ids.has(item.id);
            return <article className={styles.productCard} key={item.id}>
              <Link className={styles.productImage} href={`/products/${item.slug}`}><Image src={item.image} alt={item.imageAlt} fill sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 33vw" /></Link>
              <div className={styles.productCopy}><span>{item.deity} · {item.height}&quot;</span><h2 className="font-display"><Link href={`/products/${item.slug}`}>{item.name}</Link></h2><p>{item.material} · {item.finish}</p><div className={styles.cardActions}><Link href={`/products/${item.slug}`}>View details <ArrowRight aria-hidden="true" size={15} /></Link><button type="button" onClick={() => { const added = enquiryBag.toggle(item.id); showToast(added ? "Added to your enquiry bag." : "Removed from your enquiry bag."); }}><ShoppingBag aria-hidden="true" size={16} /> {inBag ? "In bag" : "Add to bag"}</button><button type="button" aria-label={`Remove ${item.name} from wishlist`} onClick={() => { savedWorks.remove(item.id); showToast("Removed from your wishlist."); }}><Trash2 aria-hidden="true" size={16} /> Remove</button></div></div>
            </article>;
          })}
        </div>
      </div>
    </section>
  );
}
