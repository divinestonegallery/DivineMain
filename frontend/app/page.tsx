import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Gem,
  MessageCircle,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { ProductCard as CatalogProductCard } from "@/components/Catalog/product-card";
import { buttonClassName } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import { getPublishedPage } from "@/api/cms/public-repository";
import { getHome } from "@/api/products";
import type { HomeBlock, HomeData, HomeDeityGroup, ProductCard, ReviewCard, TaxonomyItem } from "@/api/products";
import styles from "./page.module.css";

import { DynamicCategoryTabs } from "./dynamic-category-tabs";
import { HomeCarouselRail } from "./home-carousel-rail";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("home");
  return {
    title: page?.seoTitle ? { absolute: page.seoTitle } : undefined,
    description:
      page?.seoDescription ??
      "Discover authentic hand-carved marble moorties by fourth-generation master moortikars from Alwar, Rajasthan.",
    alternates: { canonical: "/" },
  };
}

export const revalidate = 60;

const HOME_BLOCK = {
  popularMooti: "popular_moorti",
  dreamMooti: "shop_by_dream_moorti",
  dreamTemples: "dream_temples",
  categories: "shop_by_categories",
  homeDecor: "shop_home_decors",
  reviews: "reviews",
} as const;

const preferredDreamMootiOrder = ["ganesh", "hanuman", "radha krishna"];

const reviewDate = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function getBlock(blocks: HomeBlock[], type: string) {
  return blocks.find((block) => block.type === type)?.data ?? {};
}

function getProducts(data: HomeBlock["data"] | undefined): ProductCard[] {
  return Array.isArray(data?.products) ? data.products.filter(Boolean) : [];
}

function getGroups(data: HomeBlock["data"] | undefined): HomeDeityGroup[] {
  const groups = data?.deities ?? data?.dieties ?? [];
  return Array.isArray(groups) ? groups.filter((group) => group?.products?.length) : [];
}

function getCategories(data: HomeBlock["data"] | undefined): TaxonomyItem[] {
  return Array.isArray(data?.categories) ? data.categories.filter(Boolean) : [];
}

function getReviews(data: HomeBlock["data"] | undefined): ReviewCard[] {
  return Array.isArray(data?.reviews) ? data.reviews.filter(Boolean) : [];
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function shouldSkipImageOptimization(src: string) {
  if (!/^https?:\/\//i.test(src)) return false;
  try {
    return !["media.divinestonegallery.com", "images.unsplash.com"].includes(new URL(src).hostname);
  } catch {
    return true;
  }
}

function reviewComment(comment: string | null | undefined) {
  return normalizeText(comment).replace(/\s*\(Review\s+\d+\)\s*$/i, "").trim();
}

function taxonomyHref(item: TaxonomyItem) {
  return `/shop?q=${encodeURIComponent(item.name)}`;
}

function categoryFilterHref(item: TaxonomyItem) {
  const category = normalizeText(item.slug) || normalizeText(item.name);
  return `/shop?category=${encodeURIComponent(category)}`;
}

function groupName(group: HomeDeityGroup) {
  return (
    normalizeText(group.deity_name) ||
    normalizeText(group.diety_name) ||
    normalizeText(group.products?.[0]?.deity) ||
    "Collection"
  );
}

function orderDreamMootiGroups(groups: HomeDeityGroup[]) {
  return [...groups].sort((a, b) => {
    const aName = groupName(a).toLowerCase();
    const bName = groupName(b).toLowerCase();
    const aIndex = preferredDreamMootiOrder.findIndex((name) => aName.includes(name));
    const bIndex = preferredDreamMootiOrder.findIndex((name) => bName.includes(name));
    if (aIndex === -1 && bIndex === -1) return aName.localeCompare(bName);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

function heroQuickLinks(groups: HomeDeityGroup[], categories: TaxonomyItem[]) {
  const links = [
    ...groups.map((group) => {
      const name = groupName(group);
      return { label: name, href: `/shop?q=${encodeURIComponent(name)}` };
    }),
    ...categories.map((category) => ({ label: category.name, href: taxonomyHref(category) })),
  ];

  const seen = new Set<string>();
  return links.filter((link) => {
    const key = link.label.toLowerCase();
    if (!link.label || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 7);
}

function MediaImage({
  src,
  alt,
  priority = false,
  sizes,
}: {
  src?: string | null;
  alt: string;
  priority?: boolean;
  sizes: string;
}) {
  if (!src) {
    return (
      <span className={styles.mediaPlaceholder}>
        <Gem aria-hidden="true" size={28} strokeWidth={1.35} />
        <small>Image coming soon</small>
      </span>
    );
  }

  return (
    <Image
      className={styles.mediaImg}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={shouldSkipImageOptimization(src)}
    />
  );
}

function SectionHeading({
  title,
  href,
  aside,
}: {
  title: string;
  href?: string;
  aside?: ReactNode;
}) {
  return (
    <div className={styles.sectionHeadingRow}>
      <div>
        <div className={styles.sectionTitleLine}>
          <h2 className="font-display">{title}</h2>
          {href ? (
            <Link href={href} aria-label={`View all ${title}`}>
              <ArrowRight aria-hidden="true" size={19} />
            </Link>
          ) : null}
        </div>
      </div>
      {aside}
    </div>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className={styles.emptyState}>
      <Search aria-hidden="true" size={26} strokeWidth={1.4} />
      <h3 className="font-display">{label}</h3>
      <p>The backend returned no published items for this home block yet.</p>
    </div>
  );
}

function HomeApiError({ message }: { message: string }) {
  return (
    <section className={styles.dataSection}>
      <div className="site-container">
        <div className={`${styles.emptyState} ${styles.errorState}`} role="alert">
          <AlertCircle aria-hidden="true" size={28} strokeWidth={1.4} />
          <h2 className="font-display">Home data could not be loaded.</h2>
          <p>{message}</p>
        </div>
      </div>
    </section>
  );
}

function DynamicTabsSection({
  id,
  title,
  products,
  groups,
  groupBy,
  actionHref,
  surface = false,
}: {
  id?: string;
  title: string;
  products?: ProductCard[];
  groups?: HomeDeityGroup[];
  groupBy?: "deity" | "category";
  actionHref: string;
  surface?: boolean;
}) {
  const hasContent = (products && products.length > 0) || (groups && groups.length > 0);
  return (
    <section className={`${styles.dataSection} ${surface ? styles.surfaceSection : ""}`} id={id}>
      <div className="site-container">
        <SectionHeading title={title} href={actionHref} />
        {hasContent ? (
          <DynamicCategoryTabs products={products} groups={groups} groupBy={groupBy} idPrefix={id || "tabs"} />
        ) : (
          <EmptySection label={`${title} is waiting for backend items`} />
        )}
      </div>
    </section>
  );
}

function ProductRailSection({
  id,
  title,
  products,
  actionHref,
  surface = false,
  carousel = false,
}: {
  id?: string;
  title: string;
  products: ProductCard[];
  actionHref?: string;
  surface?: boolean;
  carousel?: boolean;
}) {
  const productCards = products.map((product, index) => (
    <CatalogProductCard product={product} key={product.uid ?? product.slug ?? `${title}-${index}`} />
  ));

  return (
    <section className={`${styles.dataSection} ${surface ? styles.surfaceSection : ""}`} id={id}>
      <div className="site-container">
        <SectionHeading title={title} href={actionHref} />
        {products.length ? (
          carousel ? (
            <HomeCarouselRail className={styles.productRail} label={title}>
              {productCards}
            </HomeCarouselRail>
          ) : (
            <div className={styles.productRail}>
              {productCards}
            </div>
          )
        ) : (
          <EmptySection label={`${title} is waiting for backend items`} />
        )}
      </div>
    </section>
  );
}

function CategoriesSection({ categories }: { categories: TaxonomyItem[] }) {
  return (
    <section className={styles.categorySection}>
      <div className="site-container">
        <SectionHeading
          title="Categories"
          href="/shop"
        />
        {categories.length ? (
          <HomeCarouselRail className={styles.categoryGrid} label="Categories">
            {categories.map((category) => (
              <Link className={styles.categoryCard} href={categoryFilterHref(category)} key={category.id ?? category.slug ?? category.name}>
                <span className={styles.categoryImage}>
                  <MediaImage
                    src={category.image_url}
                    alt={`${category.name} category`}
                    sizes="(max-width: 680px) 90vw, (max-width: 1024px) 45vw, 31vw"
                  />
                </span>
                <span>
                  <strong className="font-display">{category.name}</strong>
                  {category.description ? <small>{category.description}</small> : null}
                </span>
                <ArrowRight aria-hidden="true" size={17} />
              </Link>
            ))}
          </HomeCarouselRail>
        ) : (
          <EmptySection label="Categories are waiting for backend items" />
        )}
      </div>
    </section>
  );
}

function HomeDecorSection({ products, groups }: { products: ProductCard[]; groups: HomeDeityGroup[] }) {
  return (
    <DynamicTabsSection
      id="home-decor"
      title="Shop by Home Decor"
      products={products}
      groups={groups}
      groupBy="category"
      actionHref="/shop?q=home%20decor"
      surface
    />
  );
}

function ReviewsSection({ reviews }: { reviews: ReviewCard[] }) {
  const averageRating = reviews.length
    ? reviews.reduce((total, review) => total + Math.max(0, Math.min(5, Number(review.rating ?? 0))), 0) / reviews.length
    : 0;

  return (
    <section className={styles.reviewsSection}>
      <div className="site-container">
        <SectionHeading
          title="Customer Reviews"
          aside={
            <aside className={styles.reviewSummary} aria-label="Review summary">
              <strong>{averageRating.toFixed(1)}/5</strong>
              <div className={styles.stars} aria-hidden="true">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star fill={index < Math.round(averageRating) ? "currentColor" : "none"} key={index} size={16} strokeWidth={1.5} />
                ))}
              </div>
              <span>{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span>
            </aside>
          }
        />
        {reviews.length ? (
          <HomeCarouselRail autoplay className={styles.reviewRail} label="Customer Reviews">
            {reviews.map((review) => {
              const rating = Math.max(0, Math.min(5, Number(review.rating ?? 0)));
              const date = review.created_at ? new Date(review.created_at) : null;
              const validDate = date && !Number.isNaN(date.getTime()) ? date : null;
              const comment = reviewComment(review.comment);

              return (
                <article className={styles.reviewCard} key={review.id}>
                  <div className={styles.reviewAvatar} aria-hidden="true">
                    <span>{rating || 5}</span>
                  </div>
                  <div className={styles.stars} aria-label={`${rating} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        aria-hidden="true"
                        fill={index < rating ? "currentColor" : "none"}
                        key={index}
                        size={17}
                        strokeWidth={1.5}
                      />
                    ))}
                  </div>
                  {comment ? <p>{comment}</p> : <p>No written comment was provided.</p>}
                  <footer>
                    {validDate ? <time dateTime={review.created_at ?? undefined}>{reviewDate.format(validDate)}</time> : null}
                  </footer>
                </article>
              );
            })}
          </HomeCarouselRail>
        ) : (
          <EmptySection label="Customer Reviews are waiting for backend items" />
        )}
      </div>
    </section>
  );
}

function HeroSection({ quickLinks }: { quickLinks: Array<{ label: string; href: string }> }) {
  return (
    <section className={`${styles.hero} ${styles.videoHero}`}>
      <video
        className={styles.heroVideo}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster="/brand/home-hero-poster.jpg"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/brand/background_video.mp4" type="video/mp4" />
      </video>
      <span className={styles.heroVeil} aria-hidden="true" />
      <div className={`${styles.heroInner} site-container`}>
        <div className={styles.heroCopy}>
          <form className={styles.heroSearch} action="/shop" data-hero-search>
            <Search aria-hidden="true" size={24} strokeWidth={1.6} />
            <input name="q" type="search" placeholder="Search for Ganesh, marble temple or home decor" aria-label="Search the Divine Stone catalogue" />
            <button type="submit" aria-label="Search catalogue">
              <Search aria-hidden="true" size={22} strokeWidth={1.8} />
            </button>
          </form>
          {quickLinks.length ? (
            <div className={styles.heroQuickLinks} aria-label="Popular searches">
              <span>Most Popular Mooti</span>
              <div>
                {quickLinks.map((link, index) => (
                  <Link href={link.href} key={link.href} data-featured={index === 0 ? "true" : undefined}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          <p className={styles.heroLead}>
            Authentic hand-carved marble moorties shaped by fourth-generation master.</p>
          <div className={styles.heroActions}>
            <Link className={buttonClassName({ size: "lg" })} href="/shop">
              Explore moorties <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link className={buttonClassName({ variant: "outline", size: "lg" })} href="/custom-murti">
              Customize Your Moorti
            </Link>
          </div>
        </div>
        <Link className={styles.heroScrollCue} href="#popular-mooti" aria-label="Scroll to Popular Mooti">
          <ChevronDown aria-hidden="true" size={21} />
        </Link>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={styles.finalCta}>
      <div className="site-container">
        <Sparkles aria-hidden="true" size={26} strokeWidth={1.35} />
        <h2 className="font-display">Let the right work find its place in your home.</h2>
        <p>Explore the collection or speak with the gallery for help choosing deity, scale, marble and placement.</p>
        <div>
          <Link className={buttonClassName({ size: "lg" })} href="/shop">
            Explore collection <ArrowRight aria-hidden="true" size={18} />
          </Link>
          <a
            className={`${buttonClassName({ size: "lg" })} ${styles.whatsappCta}`}
            href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20help%20finding%20a%20divine%20piece."
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle aria-hidden="true" size={18} /> Connect on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

async function loadHomeData(): Promise<{ home: HomeData; error: string | null }> {
  try {
    return { home: await getHome(), error: null };
  } catch (error) {
    return {
      home: { blocks: [] },
      error: error instanceof Error ? error.message : "The Home API request failed.",
    };
  }
}

export default async function Home() {
  const { home, error } = await loadHomeData();
  const blocks = home.blocks ?? [];

  const popular = getBlock(blocks, HOME_BLOCK.popularMooti);
  const dreamMooti = getBlock(blocks, HOME_BLOCK.dreamMooti);
  const dreamTemples = getBlock(blocks, HOME_BLOCK.dreamTemples);
  const categories = getBlock(blocks, HOME_BLOCK.categories);
  const homeDecor = getBlock(blocks, HOME_BLOCK.homeDecor);
  const reviews = getBlock(blocks, HOME_BLOCK.reviews);
  const dreamMootiGroups = orderDreamMootiGroups(getGroups(dreamMooti));
  const categoryItems = getCategories(categories);

  return (
    <ToastProvider>
      <SiteHeader animateLogo />
      <main id="main-content" tabIndex={-1}>
        <HeroSection quickLinks={error ? [] : heroQuickLinks(dreamMootiGroups, categoryItems)} />
        {error ? (
          <HomeApiError message={error} />
        ) : (
          <>
            <ProductRailSection
              id="popular-mooti"
              title="Popular Mooti"
              products={getProducts(popular)}
              actionHref="/shop"
              carousel
            />
            <DynamicTabsSection
              id="dream-mooti"
              title="Shop by Dream Mooti"
              groups={dreamMootiGroups}
              products={getProducts(dreamMooti)}
              groupBy="deity"
              actionHref="/shop"
              surface
            />
            <ProductRailSection
              title="Shop Dream Temple"
              products={getProducts(dreamTemples)}
              actionHref="/shop?q=temple"
              carousel
            />
            <HomeDecorSection products={getProducts(homeDecor)} groups={getGroups(homeDecor)} />
            <CategoriesSection categories={categoryItems} />
            <ReviewsSection reviews={getReviews(reviews)} />
          </>
        )}
        <FinalCta />
      </main>
      <SiteFooter />
      {/* <WhatsAppAssistance elevated /> */}
      <CookieConsent />
    </ToastProvider>
  );
}
