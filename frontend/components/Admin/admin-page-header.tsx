// @ts-nocheck
import type { ReactNode } from "react";
import styles from "./admin-shell.module.css";

export function AdminPageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <header className={styles.pageHeader}>
      <div><h1 className="font-display">{title}</h1><span>{description}</span></div>
      {actions ? <div className={styles.pageActions}>{actions}</div> : null}
    </header>
  );
}
