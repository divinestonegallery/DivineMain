// @ts-nocheck
import type { ReactNode } from "react";
import styles from "./admin-shell.module.css";

export function AdminPageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className={styles.pageHeader}>
      <div><p>{eyebrow}</p><h1 className="font-display">{title}</h1><span>{description}</span></div>
      {actions ? <div className={styles.pageActions}>{actions}</div> : null}
    </header>
  );
}
