import { Skeleton, VisuallyHidden } from "@/components/common/skeleton";
import skeletonStyles from "@/components/common/skeleton.module.css";
import productStyles from "./product.module.css";
import { ProductCardSkeleton } from "./product-card-skeleton";
import styles from "@/app/products/[slug]/product-page.module.css";

const THUMB_COUNT = 4;
const SPEC_COUNT = 6;
const DESCRIPTION_LINES = 3;
const ACCORDION_COUNT = 3;
const RELATED_COUNT = 3;

export function ProductDetailSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <VisuallyHidden>Loading product</VisuallyHidden>
      <div aria-hidden="true">
        <div className="site-container">
          <section className={styles.productHero}>
            <div className={styles.galleryWrap}>
              <div className={productStyles.gallery}>
                <div className={productStyles.galleryMain}>
                  <Skeleton className={skeletonStyles.mediaFill} />
                </div>
                <div className={productStyles.galleryThumbnails}>
                  {Array.from({ length: THUMB_COUNT }, (_, index) => (
                    <Skeleton className={skeletonStyles.thumb} key={index} />
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.productDetails}>
              <Skeleton className={skeletonStyles.badge} />
              <Skeleton className={skeletonStyles.detailTitle} />
              <div className={styles.secondaryActions}>
                <Skeleton className={skeletonStyles.share} />
              </div>

              <hr className={styles.divider} />
              <div className={skeletonStyles.description}>
                {Array.from({ length: DESCRIPTION_LINES }, (_, index) => (
                  <Skeleton
                    className={index === DESCRIPTION_LINES - 1 ? skeletonStyles.detailLineShort : skeletonStyles.detailLine}
                    key={index}
                  />
                ))}
              </div>

              <hr className={styles.divider} />
              <div className={styles.catalogSection}>
                <Skeleton className={skeletonStyles.detailHeading} />
                <dl className={styles.specificationGrid}>
                  {Array.from({ length: SPEC_COUNT }, (_, index) => (
                    <div key={index}>
                      <Skeleton className={skeletonStyles.specLabel} />
                      <Skeleton className={skeletonStyles.specValue} />
                    </div>
                  ))}
                </dl>
              </div>

              <hr className={styles.divider} />
              <div className={styles.actionCard}>
                <Skeleton className={skeletonStyles.detailPrice} />
                <Skeleton className={skeletonStyles.detailTax} />
                <div className={styles.primaryActions}>
                  <Skeleton className={skeletonStyles.cta} />
                  <Skeleton className={skeletonStyles.cta} />
                </div>
              </div>
            </div>
          </section>

          <hr className={styles.sectionDivider} />

          <section className={styles.faqSection}>
            <div className={styles.faqContainer}>
              <Skeleton className={skeletonStyles.sectionTitle} />
              {Array.from({ length: ACCORDION_COUNT }, (_, index) => (
                <div className={skeletonStyles.accordionRow} key={index}>
                  <Skeleton className={skeletonStyles.accordionLabel} />
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className={styles.relatedSection}>
          <div className="site-container">
            <div className={styles.sectionHeading}>
              <Skeleton className={skeletonStyles.relatedTitle} />
              <Skeleton className={skeletonStyles.relatedLink} />
            </div>
            <div className={styles.relatedGrid}>
              {Array.from({ length: RELATED_COUNT }, (_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          </div>
        </section>

        <div className={styles.mobileEnquiryBar}>
          <span>
            <Skeleton className={skeletonStyles.mobileEnquiryLabel} />
            <Skeleton className={skeletonStyles.mobileEnquiryTitle} />
          </span>
          <Skeleton className={skeletonStyles.mobileEnquiryButton} />
        </div>
      </div>
    </div>
  );
}
