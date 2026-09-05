"use client";

import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

type ScrollState = {
  canScrollBackward: boolean;
  canScrollForward: boolean;
};

export function HomeCarouselRail({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className: string;
  label: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState<ScrollState>({
    canScrollBackward: false,
    canScrollForward: false,
  });

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    setScrollState({
      canScrollBackward: rail.scrollLeft > 2,
      canScrollForward: rail.scrollLeft < maxScroll - 2,
    });
  }, []);

  const scrollRail = useCallback((direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;

    const firstItem = rail.firstElementChild instanceof HTMLElement ? rail.firstElementChild : null;
    const computedStyle = window.getComputedStyle(rail);
    const gap = Number.parseFloat(computedStyle.columnGap || computedStyle.gap || "0") || 0;
    const cardWidth = firstItem?.getBoundingClientRect().width ?? 0;
    const scrollAmount = cardWidth > 0 ? cardWidth + gap : rail.clientWidth * 0.8;

    rail.scrollBy({
      left: direction * scrollAmount,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    updateScrollState();

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(rail);
    Array.from(rail.children).forEach((child) => resizeObserver.observe(child));

    rail.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      resizeObserver.disconnect();
      rail.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [children, updateScrollState]);

  return (
    <div className={styles.carouselShell}>
      <div className={className} ref={railRef} aria-label={label}>
        {children}
      </div>
      <button
        type="button"
        className={`${styles.cardArrow} ${styles.carouselArrow} ${styles.carouselArrowPrevious}`}
        aria-label={`Scroll ${label} left`}
        disabled={!scrollState.canScrollBackward}
        onClick={() => scrollRail(-1)}
      >
        <ArrowRight aria-hidden="true" size={17} />
      </button>
      <button
        type="button"
        className={`${styles.cardArrow} ${styles.carouselArrow} ${styles.carouselArrowNext}`}
        aria-label={`Scroll ${label} right`}
        disabled={!scrollState.canScrollForward}
        onClick={() => scrollRail(1)}
      >
        <ArrowRight aria-hidden="true" size={17} />
      </button>
    </div>
  );
}
