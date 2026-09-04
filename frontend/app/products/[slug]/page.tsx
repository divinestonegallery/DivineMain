import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
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
import { ApiError } from "@/api/client";
import { getSiteUrl } from "@/src/config/site";
import {
  getPublicCatalogItem,
  getRelatedPublicCatalogItems,
} from "@/api/catalog/repository";
import type { CatalogItem } from "@/components/Catalog/catalog-data";
import { ProductActions } from "@/components/Catalog/product-actions";
import { ProductGallery } from "@/components/Catalog/product-gallery";
import styles from "./product-page.module.css";

type ProductPageProps = { params: Promise<{ slug: string }> };

// New and updated products are resolved from PostgreSQL at request time.
export const dynamic = "force-dynamic";

type ProductLoadState = "not-found" | "unavailable";

const loadProduct = cache(async function loadProduct(slug: string): Promise<{ product: CatalogItem | null; error: ProductLoadState | null }> {
  try {
    const product = await getPublicCatalogItem(slug);
    return { product, error: product ? null : "not-found" };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { product: null, error: "not-found" };
    }

    console.error("Product detail API request failed:", error);
    return { product: null, error: "unavailable" };
  }
});

function productPageTitle(product: CatalogItem) {
  return product.height > 0 ? `${product.name} | ${product.height}-inch Marble Moorti` : `${product.name} | Marble Moorti`;
}

function availabilityLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    in_stock: "In stock",
    made_to_order: "Made to order",
    out_of_stock: "Out of stock",
  };
  return value ? labels[value] ?? value.replace(/_/g, " ") : "";
}

function cleanProductName(name: string) {
  return name.replace(/\s*[-|]\s*[A-Z0-9]+$/i, '').replace(/\s*\([A-Z0-9]+\)$/i, '').trim();
}

function productGallery(product: CatalogItem) {
  const mainImage = { src: product.image, alt: product.imageAlt };
  if (!product.gallery || product.gallery.length === 0) {
    return [mainImage];
  }
  const hasMainImage = product.gallery.some(img => img.src === product.image);
  return hasMainImage ? product.gallery : [mainImage, ...product.gallery];
}

function productStateCopy(error: ProductLoadState | null) {
  if (error === "not-found") {
    return {
      title: "Product not found",
      description: "This work may no longer be available in the gallery.",
    };
  }

  return {
    title: "Unable to load product",
    description: "Please try again, or return to the shop to continue browsing.",
  };
}

function ProductState({ error }: { error: ProductLoadState | null }) {
  const copy = productStateCopy(error);

  return (
    <ToastProvider>
      <SiteHeader />
      <main className={styles.productPage} id="main-content" tabIndex={-1}>
        <section className={`${styles.productState} site-container`}>
          <BadgeCheck aria-hidden="true" size={28} />
          <h1 className="font-display">{copy.title}</h1>
          <p>{copy.description}</p>
          <Link href="/shop">Return to shop <ArrowRight aria-hidden="true" size={16} /></Link>
        </section>
      </main>
      <SiteFooter />
      <CookieConsent />
    </ToastProvider>
  );
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { product, error } = await loadProduct(slug);

  if (!product) {
    return {
      title: error === "not-found" ? "Product not found" : "Marble Moorti",
      robots: error === "not-found" ? { index: false, follow: true } : undefined,
    };
  }

  const imageUrl = new URL(product.image, getSiteUrl()).toString();

  return {
    title: productPageTitle(product),
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.name} | Divine Stone Gallery`,
      description: product.description,
      images: [{ url: imageUrl, alt: product.imageAlt }],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const { product, error } = await loadProduct(slug);

  if (!product) return <ProductState error={error} />;

  const related = await getRelatedPublicCatalogItems(product).catch((reason) => {
    console.error("Related product API request failed:", reason);
    return [];
  });
  const gallery = productGallery(product);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: new URL(product.image, getSiteUrl()).toString(),
    material: product.material,
    category: product.category,
    brand: { "@type": "Brand", name: "Divine Stone Gallery" },
    ...(product.height > 0 ? { size: `${product.height} inches` } : {}),
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
              { label: cleanProductName(product.name) },
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
              <h1 className="font-display">{cleanProductName(product.name)}</h1>
              <p className={styles.description}>{product.description}</p>

              <dl className={styles.specificationGrid}>
                {product.height > 0 ? <div><dt><Ruler aria-hidden="true" size={17} /> Height</dt><dd>{product.height} inches</dd></div> : null}
                {product.weightGrams ? <div><dt>Weight</dt><dd>{product.weightMinGrams ? `${Number((product.weightMinGrams / 1000).toFixed(1))}–${Number((product.weightGrams / 1000).toFixed(1))} kg` : `${Number((product.weightGrams / 1000).toFixed(1))} kg`}</dd></div> : null}
                <div><dt><Gem aria-hidden="true" size={17} /> Material</dt><dd>{product.material}</dd></div>
                {product.availability ? <div><dt><PackageCheck aria-hidden="true" size={17} /> Availability</dt><dd>{availabilityLabel(product.availability)}</dd></div> : null}
                <div><dt><Sparkles aria-hidden="true" size={17} /> Finish</dt><dd>{product.finish}</dd></div>
                <div><dt><HandHeart aria-hidden="true" size={17} /> Made by</dt><dd>Master moortikars</dd></div>
              </dl>

              <ProductActions
                productId={product.id}
                name={cleanProductName(product.name)}
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

        {/* <section className={styles.guidanceSection}>
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
        </section> */}

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
                    <Image src={item.image} alt={item.imageAlt} fill sizes="(max-width: 680px) 50vw, 33vw" unoptimized={/^https?:\/\//i.test(item.image)} />
                  </Link>
                  <span>{[item.deity, item.height > 0 ? `${item.height}"` : ""].filter(Boolean).join(" · ")}</span>
                  <h3 className="font-display"><Link href={`/products/${item.slug}`}>{cleanProductName(item.name)}</Link></h3>
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
