"use client";

import { ArrowRight } from "lucide-react";
import { Children, Fragment } from "react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

type ScrollState = {
  canScrollBackward: boolean;
  canScrollForward: boolean;
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function carouselMetrics(rail: HTMLDivElement, loop: boolean) {
  const items = Array.from(rail.children).filter((node): node is HTMLElement => node instanceof HTMLElement);
  const firstItem = items[0];
  const computedStyle = window.getComputedStyle(rail);
  const gap = Number.parseFloat(computedStyle.columnGap || computedStyle.gap || "0") || 0;
  const cardWidth = firstItem?.getBoundingClientRect().width ?? 0;
  const step = cardWidth + gap;
  const visible = step > 0 ? Math.max(1, Math.round((rail.clientWidth + gap) / step)) : 1;
  const sourceCount = loop ? Math.floor(items.length / 3) : items.length;
  const maxIndex = Math.max(0, items.length - visible);
  const currentIndex = step > 0 ? Math.round(rail.scrollLeft / step) : 0;

  return { items, step, visible, sourceCount, maxIndex, currentIndex };
}

export function HomeCarouselRail({
  children,
  className,
  label,
  autoplay = false,
}: {
  children: ReactNode;
  className: string;
  label: string;
  autoplay?: boolean;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const autoplayPausedRef = useRef(false);
  const scrollEndTimerRef = useRef<number | null>(null);
  const [autoplayReset, setAutoplayReset] = useState(0);
  const [scrollState, setScrollState] = useState<ScrollState>({
    canScrollBackward: false,
    canScrollForward: false,
  });

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const { items, visible } = carouselMetrics(rail, autoplay);
    setScrollState({
      canScrollBackward: autoplay ? items.length > visible : rail.scrollLeft > 2,
      canScrollForward: autoplay ? items.length > visible : rail.scrollLeft < maxScroll - 2,
    });
  }, [autoplay]);

  const normalizeLoopPosition = useCallback(() => {
    if (!autoplay) return;
    const rail = railRef.current;
    if (!rail) return;
    const { step, sourceCount } = carouselMetrics(rail, true);
    if (step <= 0 || sourceCount <= 0) return;

    const firstCopyStart = sourceCount * step;
    const thirdCopyStart = sourceCount * 2 * step;
    if (rail.scrollLeft < firstCopyStart - step * 0.5) {
      rail.scrollTo({ left: rail.scrollLeft + firstCopyStart, behavior: "auto" });
    } else if (rail.scrollLeft >= thirdCopyStart) {
      rail.scrollTo({ left: rail.scrollLeft - firstCopyStart, behavior: "auto" });
    }
  }, [autoplay]);

  const resetAutoplay = useCallback(() => {
    if (autoplay) setAutoplayReset((value) => value + 1);
  }, [autoplay]);

  const scrollRail = useCallback((direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;

    const { step } = carouselMetrics(rail, autoplay);
    if (step <= 0) {
      rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      return;
    }

    if (autoplay) {
      rail.scrollTo({
        left: rail.scrollLeft + direction * step,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
      return;
    }

    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const nextLeft = direction < 0
      ? Math.max(0, rail.scrollLeft - step)
      : Math.min(maxScroll, rail.scrollLeft + step);

    rail.scrollTo({
      left: nextLeft,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [autoplay]);

  useEffect(() => {
    if (!autoplay || prefersReducedMotion()) return;
    const timer = window.setInterval(() => {
      if (!autoplayPausedRef.current) scrollRail(1);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [autoplay, autoplayReset, scrollRail]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const frame = window.requestAnimationFrame(() => {
      if (autoplay) {
        const { step, sourceCount } = carouselMetrics(rail, true);
        if (step > 0 && sourceCount > 0) rail.scrollTo({ left: sourceCount * step, behavior: "auto" });
      }
      updateScrollState();
    });

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(rail);
    Array.from(rail.children).forEach((child) => resizeObserver.observe(child));

    const handleScrollEnd = () => {
      normalizeLoopPosition();
      updateScrollState();
    };
    const handleScroll = () => {
      updateScrollState();
      if (!autoplay) return;
      if (scrollEndTimerRef.current !== null) window.clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = window.setTimeout(handleScrollEnd, 140);
    };
    rail.addEventListener("scroll", handleScroll, { passive: true });
    rail.addEventListener("scrollend", handleScrollEnd);
    window.addEventListener("resize", updateScrollState);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      rail.removeEventListener("scroll", handleScroll);
      rail.removeEventListener("scrollend", handleScrollEnd);
      if (scrollEndTimerRef.current !== null) window.clearTimeout(scrollEndTimerRef.current);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [autoplay, children, normalizeLoopPosition, updateScrollState]);

  const childItems = Children.toArray(children);
  const renderedChildren = autoplay && childItems.length > 1
    ? [0, 1, 2].flatMap((copy) => childItems.map((child, index) => (
        <Fragment key={`${copy}-${index}`}>{child}</Fragment>
      )))
    : children;

  return (
    <div className={styles.carouselShell}>
      <div
        className={className}
        ref={railRef}
        aria-label={label}
        onMouseEnter={autoplay ? () => { autoplayPausedRef.current = true; } : undefined}
        onMouseLeave={autoplay ? () => { autoplayPausedRef.current = false; resetAutoplay(); } : undefined}
        onTouchStart={autoplay ? () => { autoplayPausedRef.current = true; resetAutoplay(); } : undefined}
        onTouchEnd={autoplay ? () => { autoplayPausedRef.current = false; resetAutoplay(); } : undefined}
        onTouchCancel={autoplay ? () => { autoplayPausedRef.current = false; resetAutoplay(); } : undefined}
      >
        {renderedChildren}
      </div>
      <button
        type="button"
        className={`${styles.cardArrow} ${styles.carouselArrow} ${styles.carouselArrowPrevious}`}
        aria-label={`Scroll ${label} left`}
        disabled={!scrollState.canScrollBackward}
        onClick={() => { resetAutoplay(); scrollRail(-1); }}
      >
        <ArrowRight aria-hidden="true" size={17} />
      </button>
      <button
        type="button"
        className={`${styles.cardArrow} ${styles.carouselArrow} ${styles.carouselArrowNext}`}
        aria-label={`Scroll ${label} right`}
        disabled={!scrollState.canScrollForward}
        onClick={() => { resetAutoplay(); scrollRail(1); }}
      >
        <ArrowRight aria-hidden="true" size={17} />
      </button>
    </div>
  );
}
