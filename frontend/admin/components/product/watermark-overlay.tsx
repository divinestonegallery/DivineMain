import styles from "./watermark-overlay.module.css";

export function WatermarkOverlay() {
  return <span className={styles.watermark} aria-hidden="true" />;
}