import { Skeleton } from "@/components/common/skeleton";
import skeletonStyles from "@/components/common/skeleton.module.css";
import styles from "./shop-catalog.module.css";

export function ProductCardSkeleton() {
  return (
    <article className={styles.productCard}>
      <div className={styles.productMedia}>
        <Skeleton className={skeletonStyles.mediaFill} />
      </div>
      <div className={styles.productInfo}>
        <Skeleton className={skeletonStyles.cardMeta} />
        <Skeleton className={skeletonStyles.cardTitle} />
        <Skeleton className={skeletonStyles.cardDetail} />
        <Skeleton className={skeletonStyles.cardPrice} />
        <Skeleton className={skeletonStyles.cardLink} />
      </div>
    </article>
  );
}
