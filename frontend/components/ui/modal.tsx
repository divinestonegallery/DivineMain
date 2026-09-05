// @ts-nocheck
"use client";

import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import styles from "./ui.module.css";

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  const titleId = `modal-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const focusableSelector = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
    const focusable = panel ? Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)) : [];
    (focusable[0] ?? panel)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className={styles.modalRoot} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button className={styles.modalBackdrop} type="button" aria-label="Close dialog" onClick={onClose} />
      <section className={styles.modalPanel} ref={panelRef} tabIndex={-1}>
        <div className={styles.modalHeader}>
          <h2 className="font-display" id={titleId}>{title}</h2>
          <Button variant="ghost" size="icon" aria-label="Close dialog" onClick={onClose}>
            <X aria-hidden="true" size={21} />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}
