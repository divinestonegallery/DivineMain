"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./product-page.module.css";

const MOBILE_QUERY = "(max-width: 680px)";

function subscribeToMobileQuery(onChange: () => void) {
  const mediaQuery = window.matchMedia(MOBILE_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getMobileServerSnapshot() {
  return false;
}

export function ProductDescription({ description }: { description: string }) {
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsMore, setNeedsMore] = useState(false);
  const isMobile = useSyncExternalStore(subscribeToMobileQuery, getMobileSnapshot, getMobileServerSnapshot);

  useEffect(() => {
    if (!isMobile) return;

    let frame = 0;
    const measure = () => {
      const element = descriptionRef.current;
      if (!element) return;

      if (!description.trim()) {
        setNeedsMore(false);
        return;
      }

      const lineHeight = Number.parseFloat(window.getComputedStyle(element).lineHeight);
      const collapsedHeight = Number.isFinite(lineHeight) ? lineHeight * 2 : element.clientHeight;
      const probe = element.cloneNode(true) as HTMLParagraphElement;
      probe.classList.remove(styles.descriptionCollapsed);
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      probe.style.width = `${element.clientWidth}px`;
      probe.style.height = "auto";
      document.body.appendChild(probe);
      const fullHeight = probe.scrollHeight;
      probe.remove();
      setNeedsMore(fullHeight > collapsedHeight + 1);
    };
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleMeasure);
    observer?.observe(descriptionRef.current as Element);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [description, isExpanded, isMobile]);

  const isCollapsed = isMobile && !isExpanded;

  return (
    <>
      <p ref={descriptionRef} className={`${styles.description} ${isCollapsed ? styles.descriptionCollapsed : ""}`}>
        {description}
      </p>
      {isMobile && needsMore ? (
        <button
          className={styles.descriptionToggle}
          type="button"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Show less product description" : "Show more product description"}
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          {isExpanded ? "Less" : "More"}
        </button>
      ) : null}
    </>
  );
}
