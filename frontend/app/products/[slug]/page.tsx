import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Gem,
  HandHeart,
  PackageCheck,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { JsonLd } from "@/components/common/json-ld";
import { Accordion } from "@/components/ui/accordion";
import { ToastProvider } from "@/components/ui/toast";
import { getSiteUrl } from "@/src/config/site";
import {
  getPublicCatalogItem,
  getRelatedPublicCatalogItems,
  getProductGallery,
} from "@/api/catalog/repository";
import type { CatalogItem } from "@/components/Catalog/catalog-data";
import { ProductActions } from "@/components/Catalog/product-actions";
import { ProductGallery } from "@/components/Catalog/product-gallery";
import styles from "./product-page.module.css";

type ProductPageProps = { params: Promise<{ slug: string }> };

// New and updated products are resolved from PostgreSQL at request time.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicCatalogItem(slug);

  if (!product) return { title: "Marble Moorti" };

  return {
    title: `${product.name} | ${product.height}-inch Marble Moorti`,
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.name} | Divine Stone Gallery`,
      description: product.description,
      images: [{ url: product.image, alt: product.imageAlt }],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getPublicCatalogItem(slug);
  if (!product) notFound();

  const [related, gallery] = await Promise.all([
    getRelatedPublicCatalogItems(product),
    getProductGallery(product.id, product.image, product.imageAlt),
  ]);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: new URL(product.image, getSiteUrl()).toString(),
    material: product.material,
    category: product.category,
    size: `${product.height} inches`,
    brand: { "@type": "Brand", name: "Divine Stone Gallery" },
  };
  const accordionItems = [
    {
      id: "craft",
      title: "Craft and finish",
      content: (
        <p>
          This work is shaped and finished by hand in our family tradition. The final expression, veining and painted details may carry subtle variations that make each marble work individual.
        </p>
      ),
    },
    {
      id: "customisation",
      title: "Customisation",
      content: (
        <p>
          Size, marble, ornamentation and finish can be discussed with our gallery. We will confirm what is possible for this form before any commission begins.
        </p>
      ),
    },
    {
      id: "delivery",
      title: "Packing and delivery",
      content: (
        <p>
          Delivery is planned according to the sculpture&apos;s dimensions and destination. Each work is protectively packed, and our team shares the available delivery arrangement during your consultation.
        </p>
      ),
    },
  ];

  return (
    <ToastProvider>
      <SiteHeader />
      <JsonLd data={productSchema} />
      <main className={styles.productPage} id="main-content" tabIndex={-1}>
        <div className="site-container">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Shop", href: "/shop" },
              { label: product.name },
            ]}
          />

          <section className={styles.productHero}>
            <div className={styles.galleryWrap}>
              <ProductGallery images={gallery} />
              <div className={styles.imagePromise}>
                <BadgeCheck aria-hidden="true" size={18} />
                <span>Full sculpture shown without image cropping</span>
              </div>
            </div>

            <div className={styles.productDetails}>
              <p className={styles.eyebrow}>{product.category} · {product.deity}</p>
              <h1 className="font-display">{product.name}</h1>
              <p className={styles.description}>{product.description}</p>

              <dl className={styles.specificationGrid}>
                <div><dt><Ruler aria-hidden="true" size={17} /> Height</dt><dd>{product.height} inches</dd></div>
                {product.weightGrams ? <div><dt>Weight</dt><dd>{product.weightMinGrams ? `${Number((product.weightMinGrams / 1000).toFixed(1))}–${Number((product.weightGrams / 1000).toFixed(1))} kg` : `${Number((product.weightGrams / 1000).toFixed(1))} kg`}</dd></div> : null}
                <div><dt><Gem aria-hidden="true" size={17} /> Material</dt><dd>{product.material}</dd></div>
                <div><dt><Sparkles aria-hidden="true" size={17} /> Finish</dt><dd>{product.finish}</dd></div>
                <div><dt><HandHeart aria-hidden="true" size={17} /> Made by</dt><dd>Master moortikars</dd></div>
              </dl>

              <ProductActions
                productId={product.id}
                name={product.name}
                height={product.height}
                pricePaise={product.pricePaise}
                gstRateBps={product.gstRateBps}
                stockQuantity={product.stockQuantity}
                salesMode={product.salesMode}
              />

              <div className={styles.reassuranceList}>
                <span><ShieldCheck aria-hidden="true" size={18} /> Personal guidance before ordering</span>
                <span><PackageCheck aria-hidden="true" size={18} /> Protective packing and delivery support</span>
                <span><BadgeCheck aria-hidden="true" size={18} /> Fourth-generation family atelier</span>
              </div>

              <Accordion items={accordionItems} />
            </div>
          </section>
        </div>

        <section className={styles.guidanceSection}>
          <div className={`${styles.guidanceGrid} site-container`}>
            <div>
              <p className={styles.eyebrow}>Choose with confidence</p>
              <h2 className="font-display">The right form, scale and finish for your space.</h2>
            </div>
            <p>
              Share a photo or measurements of your mandir or temple. Our gallery can help you understand proportion, marble, placement and available customisation before you decide.
            </p>
            <a href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20guidance%20choosing%20the%20right%20moorti%20for%20my%20space." target="_blank" rel="noreferrer">
              Speak with our gallery <ArrowRight aria-hidden="true" size={17} />
            </a>
          </div>
        </section>

        <section className={styles.relatedSection}>
          <div className="site-container">
            <div className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}>You may also appreciate</p><h2 className="font-display">Related sacred works</h2></div>
              <Link href="/shop">View all works <ArrowRight aria-hidden="true" size={16} /></Link>
            </div>
            <div className={styles.relatedGrid}>
              {related.map((item: CatalogItem) => (
                <article key={item.id}>
                  <Link className={styles.relatedImage} href={`/products/${item.slug}`}>
                    <Image src={item.image} alt={item.imageAlt} fill sizes="(max-width: 680px) 50vw, 33vw" />
                  </Link>
                  <span>{item.deity} · {item.height}&quot;</span>
                  <h3 className="font-display"><Link href={`/products/${item.slug}`}>{item.name}</Link></h3>
                  <p>{item.material} · {item.finish}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <CookieConsent />
    </ToastProvider>
  );
}
