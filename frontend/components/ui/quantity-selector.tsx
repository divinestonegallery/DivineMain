// @ts-nocheck
"use client";

import { Minus, Plus } from "lucide-react";
import styles from "./ui.module.css";

export function QuantitySelector({ value, min = 1, max = 10, onChange }: { value: number; min?: number; max?: number; onChange: (value: number) => void }) {
  return <div className={styles.quantitySelector} aria-label="Quantity selector">
    <button type="button" aria-label="Decrease quantity" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
      <Minus aria-hidden="true" size={16} />
    </button>
    <output aria-live="polite">{value}</output>
    <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
      <Plus aria-hidden="true" size={16} />
    </button>
  </div>;
}
