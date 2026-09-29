import { Skeleton, VisuallyHidden } from "@/components/common/skeleton";
import skeletonStyles from "@/components/common/skeleton.module.css";
import { ProductCardSkeleton } from "./product-card-skeleton";
import styles from "./shop-catalog.module.css";

const CARD_COUNT = 12;
const CHIP_WIDTHS = ["chipShort", "chip", "chipWide", "chip", "chipShort"] as const;
const FILTER_COUNT = 4;

export function ProductListingSkeleton() {
  return (
    <section className={styles.catalogSection} role="status" aria-busy="true">
      <VisuallyHidden>Loading products</VisuallyHidden>
      <div className="site-container" aria-hidden="true">
        <div className={styles.unifiedToolbar}>
          <div className={styles.categoryChips}>
            {CHIP_WIDTHS.map((width, index) => (
              <Skeleton className={skeletonStyles[width]} key={index} />
            ))}
          </div>
          <div className={styles.toolbarActions}>
            <Skeleton className={skeletonStyles.mobileFilter} />
            <Skeleton className={skeletonStyles.sort} />
          </div>
        </div>

        <div className={styles.catalogLayout}>
          <aside className={styles.filterSidebar}>
            <div className={styles.filterHeading}>
              <Skeleton className={skeletonStyles.filterTitle} />
            </div>
            <div className={styles.filterControls}>
              {Array.from({ length: FILTER_COUNT }, (_, index) => (
                <div className={styles.filterGroup} key={index}>
                  <Skeleton className={skeletonStyles.filterLabel} />
                  <Skeleton className={skeletonStyles.filterControl} />
                </div>
              ))}
              <div className={styles.priceFilters}>
                <Skeleton className={skeletonStyles.priceField} />
                <Skeleton className={skeletonStyles.priceField} />
              </div>
            </div>
            <div className={styles.advisorCard}>
              <Skeleton className={skeletonStyles.advisorLine} />
              <Skeleton className={skeletonStyles.advisorLineShort} />
            </div>
          </aside>

          <div>
            <div className={styles.resultsCount}>
              <Skeleton className={skeletonStyles.results} />
            </div>
            <div className={styles.productGrid}>
              {Array.from({ length: CARD_COUNT }, (_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
