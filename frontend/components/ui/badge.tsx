// @ts-nocheck
import { HTMLAttributes } from "react";
import styles from "./ui.module.css";

type BadgeTone = "gold" | "neutral" | "success" | "danger" | "dark";

export function Badge({ className = "", tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={`${styles.badge} ${styles[`badge-${tone}`]} ${className}`.trim()} {...props} />;
}
