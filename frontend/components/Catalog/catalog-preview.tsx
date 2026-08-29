// @ts-nocheck
"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, SelectField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { Tabs } from "@/components/ui/tabs";
import { ProductCard } from "./product-card";
import { sampleProducts } from "./sample-products";
import styles from "./catalog-preview.module.css";

export function CatalogPreview() {
  const [quantity, setQuantity] = useState(1);
  const [consultationOpen, setConsultationOpen] = useState(false);

  return (
    <>
      <section className={styles.previewIntro}>
        <div>
          <p>Component collection · Step 4</p>
          <h1 className="font-display">Designed for considered decisions.</h1>
        </div>
        <span>
          Reusable shopping components now carry the same calm, premium language across catalogue, product and checkout experiences.
        </span>
      </section>

      <div className={styles.controlBar}>
        <div>
          <Badge tone="success">Ready to ship</Badge>
          <Badge tone="gold">Customizable</Badge>
        </div>
        <Button variant="outline" onClick={() => setConsultationOpen(true)}>
          <SlidersHorizontal aria-hidden="true" size={17} /> Refine requirements
        </Button>
      </div>

      <section className={styles.curatedMedia} aria-label="Curated collection photography">
        <figure className={`${styles.editorialCard} ${styles.editorialMain}`}>
          <Image
            src="/catalog/lakshmi-ganesh-saraswati-12.jpg"
            alt="Lakshmi, Ganesha and Saraswati marble moorties arranged in a warm devotional setting"
            fill
            sizes="(max-width: 800px) 100vw, 68vw"
            priority
          />
          <figcaption className={styles.editorialCaption}>
            <span>Curated for the home mandir</span>
            <strong>Divine harmony, carved in marble</strong>
          </figcaption>
        </figure>
        <div className={styles.editorialStack}>
          <figure className={styles.editorialCard}>
            <Image
              src="/catalog/shreenathji-wall-27.jpg"
              alt="Hand-painted 27-inch Shreenathji marble wall sculpture in a styled devotional setting"
              fill
              sizes="(max-width: 800px) 50vw, 32vw"
            />
            <figcaption className={styles.editorialCaption}>
              <span>Wall sculptures</span>
              <strong>Shrinathji</strong>
            </figcaption>
          </figure>
          <figure className={styles.editorialCard}>
            <Image
              src="/catalog/cow-calf-6.jpg"
              alt="Six-inch marble cow and calf sculpture styled with marigolds and a diya"
              fill
              sizes="(max-width: 800px) 50vw, 32vw"
            />
            <figcaption className={styles.editorialCaption}>
              <span>Sacred accents</span>
              <strong>Gau Mata &amp; calf</strong>
            </figcaption>
          </figure>
        </div>
      </section>

      <section aria-labelledby="product-preview-title">
        <div className={styles.sectionHeading}>
          <div>
            <p>Featured craftsmanship</p>
            <h2 className="font-display" id="product-preview-title">Collection preview</h2>
          </div>
          <Button variant="ghost">View all moorties <ArrowRight aria-hidden="true" size={17} /></Button>
        </div>
        <div className={styles.productGrid}>
          {sampleProducts.map((product, index) => <ProductCard product={product} href="/" key={product.id} priority={index === 0} />)}
        </div>
        <div className={styles.paginationWrap}>
          <Pagination currentPage={1} totalPages={3} basePath="/" />
        </div>
      </section>

      <section className={styles.detailPreview}>
        <div>
          <p className={styles.eyebrow}>Product information system</p>
          <Tabs items={[
            { id: "details", label: "Details", content: "Every listing supports exact dimensions, material, finish, origin, availability and production time." },
            { id: "craft", label: "Craftsmanship", content: "Artisan identity and making methods can be explained without interrupting the primary purchase journey." },
            { id: "delivery", label: "Delivery", content: "Packaging, dispatch estimates and damage protection remain visible before checkout." },
          ]} />
        </div>
        <div>
          <p className={styles.eyebrow}>Common questions</p>
          <Accordion items={[
            { id: "custom", title: "Can this moorti be customized?", content: "Yes. Size, stone, posture, ornamentation and finish can be discussed with our workshop." },
            { id: "packing", title: "How is safe delivery handled?", content: "Each moorti receives protective wrapping, cushioning and a fitted wooden crate when required." },
            { id: "timeline", title: "How long does a commission take?", content: "The timeline depends on scale and detailing. Milestones will be shown before approval." },
          ]} />
        </div>
        <div className={styles.quantityDemo}>
          <p className={styles.eyebrow}>Quantity control</p>
          <QuantitySelector value={quantity} onChange={setQuantity} max={5} />
          <small>Accessible controls are ready for cart and product pages.</small>
        </div>
      </section>

      <Modal open={consultationOpen} title="Refine your requirements" onClose={() => setConsultationOpen(false)}>
        <form className={styles.previewForm} onSubmit={(event) => { event.preventDefault(); setConsultationOpen(false); }}>
          <SelectField label="Deity" name="deity" defaultValue="krishna">
            <option value="krishna">Krishna</option>
            <option value="ganesha">Ganesha</option>
            <option value="shiva">Shiva</option>
            <option value="hanuman">Hanuman</option>
          </SelectField>
          <FormField label="Preferred height" name="height" placeholder="For example, 18 inches" hint="You can provide an approximate measurement." />
          <Button type="submit">Apply requirements</Button>
        </form>
      </Modal>
    </>
  );
}
