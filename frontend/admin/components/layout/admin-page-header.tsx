// @ts-nocheck
import type { ReactNode } from "react";
import styles from "./admin-shell.module.css";

export function AdminPageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <header className={styles.pageHeader}>
      <div><h1 className="font-display">{title}</h1></div>
      {actions ? <div className={styles.pageActions}>{actions}</div> : null}
    </header>
  );
}
