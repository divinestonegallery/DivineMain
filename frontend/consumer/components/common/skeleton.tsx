import styles from "./skeleton.module.css";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  const classes = className ? `${styles.shimmer} ${className}` : styles.shimmer;
  return <div className={classes} />;
}

export function VisuallyHidden({ children }: { children: string }) {
  return <span className={styles.visuallyHidden}>{children}</span>;
}
