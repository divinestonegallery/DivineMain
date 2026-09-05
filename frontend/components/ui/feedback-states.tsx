// @ts-nocheck
import { AlertCircle, PackageOpen, RefreshCw } from "lucide-react";
import { Button } from "./button";
import styles from "./ui.module.css";

export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return <div className={styles.skeletonGroup} aria-label="Loading" aria-busy="true">
    <div className={styles.skeletonMedia} />
    {Array.from({ length: lines }, (_, index) => <div className={styles.skeletonLine} key={index} />)}
  </div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <section className={styles.feedbackState}>
    <PackageOpen aria-hidden="true" size={30} strokeWidth={1.3} />
    <h3 className="font-display">{title}</h3>
    <p>{description}</p>
    {action}
  </section>;
}

export function ErrorState({ title = "Something went wrong", description, onRetry }: { title?: string; description: string; onRetry?: () => void }) {
  return <section className={`${styles.feedbackState} ${styles.errorState}`} role="alert">
    <AlertCircle aria-hidden="true" size={30} strokeWidth={1.3} />
    <h3 className="font-display">{title}</h3>
    <p>{description}</p>
    {onRetry ? <Button variant="outline" onClick={onRetry}><RefreshCw aria-hidden="true" size={17} /> Try again</Button> : null}
  </section>;
}
