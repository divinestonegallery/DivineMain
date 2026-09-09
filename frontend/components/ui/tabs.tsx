// @ts-nocheck
"use client";

import { ReactNode, useState } from "react";
import styles from "./ui.module.css";

export type TabItem = { id: string; label: string; content: ReactNode };

export function Tabs({ items, defaultTab, idPrefix = "tabs" }: { items: TabItem[]; defaultTab?: string; idPrefix?: string }) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.id);

  return (
    <div className={styles.tabs}>
      <div className={styles.tabList} role="tablist">
        {items.map((item) => (
          <button
            id={`${idPrefix}-${item.id}-tab`}
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active === item.id}
            aria-controls={`${idPrefix}-${item.id}-panel`}
            onClick={() => setActive(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <section
          id={`${idPrefix}-${item.id}-panel`}
          key={item.id}
          role="tabpanel"
          aria-labelledby={`${idPrefix}-${item.id}-tab`}
          hidden={active !== item.id}
          className={styles.tabPanel}
        >
          {item.content}
        </section>
      ))}
    </div>
  );
}
