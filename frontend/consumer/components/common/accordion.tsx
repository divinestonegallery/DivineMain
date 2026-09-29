// @ts-nocheck
"use client";

import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./ui.module.css";

export type AccordionItem = { id: string; title: string; content: ReactNode };

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className={styles.accordion}>
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <section key={item.id}>
            <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : item.id)}>
              <span>{item.title}</span>
              <ChevronDown aria-hidden="true" size={19} className={open ? styles.accordionIconOpen : ""} />
            </button>
            <div hidden={!open} className={styles.accordionPanel}>{item.content}</div>
          </section>
        );
      })}
    </div>
  );
}
