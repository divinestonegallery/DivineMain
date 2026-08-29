// @ts-nocheck
"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, ShoppingBag, Trash2 } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { CatalogItem } from "@/components/Catalog/catalog-data";
import { useEnquiryBag } from "./device-collections";
import styles from "./customer-page.module.css";

export function EnquiryBagView({ products }: { products: CatalogItem[] }) {
  const enquiryBag = useEnquiryBag();
  const { showToast } = useToast();
  const items = products.filter((item) => enquiryBag.ids.has(item.id));

  if (!items.length) {
    return <section className={styles.section}><div className="site-container"><div className={styles.emptyState}><div><ShoppingBag aria-hidden="true" size={31} /><h2 className="font-display">Your enquiry bag is empty.</h2><p>Add works you would like to discuss together. Public checkout is intentionally replaced by a personal quote because availability, finish, packing and destination affect the final details.</p><Link className={buttonClassName({ size: "lg" })} href="/shop">Explore the collection <ArrowRight aria-hidden="true" size={18} /></Link></div></div></div></section>;
  }

  const message = encodeURIComponent(["Namaste, I would like current details and a combined quote for:", "", ...items.map((item, index) => `${index + 1}. ${item.name} (${item.height} inch)`), "", "Please confirm availability, pricing, packing and delivery guidance."].join("\n"));

  return (
    <section className={styles.section}>
      <div className={`${styles.bagLayout} site-container`}>
        <div><div className={styles.sectionHeading}><h2 className="font-display">Works to discuss</h2><button type="button" onClick={() => { enquiryBag.clear(); showToast("Enquiry bag cleared."); }}>Clear bag</button></div><div className={styles.bagItems}>{items.map((item) => <article className={styles.bagItem} key={item.id}><Link className={styles.bagThumb} href={`/products/${item.slug}`}><Image src={item.image} alt={item.imageAlt} fill sizes="110px" /></Link><div><h2 className="font-display"><Link href={`/products/${item.slug}`}>{item.name}</Link></h2><p>{item.height}&quot; · {item.material} · {item.finish}</p></div><button className={styles.removeButton} type="button" aria-label={`Remove ${item.name} from enquiry bag`} onClick={() => { enquiryBag.remove(item.id); showToast("Removed from your enquiry bag."); }}><Trash2 aria-hidden="true" size={17} /></button></article>)}</div></div>
        <aside className={styles.bagSummary}><span className={styles.statusBadge}><ShoppingBag aria-hidden="true" size={15} /> {items.length} {items.length === 1 ? "work" : "works"}</span><h2 className="font-display">Choose quotation or checkout.</h2><p>Request a considered combined quote, or check whether every selected work has the verified price, tax, stock and shipping information required for a secure order.</p><Link className={buttonClassName({ size: "lg" })} href="/checkout">Check secure checkout <ArrowRight aria-hidden="true" size={18} /></Link><a className={buttonClassName({ variant: "outline", size: "lg" })} href={`https://wa.me/919166138566?text=${message}`} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" size={18} /> Request quote on WhatsApp</a></aside>
      </div>
    </section>
  );
}
