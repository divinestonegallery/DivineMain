"use client";

import type { CSSProperties, DragEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useCallback, useMemo } from "react";
import { ResilientImage } from "@/components/common/resilient-image";
import styles from "./protected-image.module.css";

export type ProtectedImageProps = {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  fallback?: ReactNode;
  unoptimized?: boolean;
  loading?: "lazy" | "eager";
  draggable?: boolean;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  style?: CSSProperties;
  protectedText?: string;
  watermarkEnabled?: boolean;
};

const PROTECTION_MESSAGE = "Divine Stone Gallery";

function isScreenshotShortcut(event: KeyboardEvent) {
  return (
    event.key === "PrintScreen" ||
    event.key === "Snapshot" ||
    event.key === "SysRq" ||
    (event.key.toLowerCase() === "s" && (event.ctrlKey || event.metaKey || event.altKey)) ||
    (event.key === "S" && (event.ctrlKey || event.metaKey || event.altKey))
  );
}

export function ProtectedImage({
  src,
  alt,
  fill = true,
  priority = false,
  sizes,
  className,
  fallback,
  unoptimized,
  loading,
  draggable = false,
  onClick,
  style,
  protectedText = PROTECTION_MESSAGE,
  watermarkEnabled = true,
}: ProtectedImageProps) {
  const handleContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleDragStart = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    // There is no supported browser API that reliably detects OS-level capture tools
    // such as Print Screen, Win + Shift + S, the Snipping Tool, or third-party screen
    // recorders. Those shortcuts often never reach the page at all, and screenshots can
    // still be taken outside the browser. This is only a best-effort deterrent for
    // keyboard events that do reach the webpage; it is not a security boundary.
    if (!isScreenshotShortcut(event)) return;

    const target = event.target as HTMLElement | null;
    if (target && target.tagName !== "BUTTON" && target.tagName !== "A") {
      event.preventDefault();
    }
  }, []);

  const watermark = useMemo(() => {
    if (!watermarkEnabled) return null;
    return (
      <span
        aria-hidden="true"
        className={styles.watermark}
        title={protectedText}
      />
    );
  }, [protectedText, watermarkEnabled]);

  return (
    <div
      className={`${styles.protectedFrame} ${className ?? ""}`.trim()}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
      onKeyDown={handleKeyDown}
      onClick={onClick}
      role="img"
      aria-label={alt}
      style={style}
      tabIndex={-1}
    >
      <ResilientImage
        src={src}
        alt={alt}
        fill={fill}
        priority={priority}
        sizes={sizes}
        unoptimized={unoptimized}
        loading={loading}
        className={styles.protectedImage}
        fallback={fallback}
        draggable={draggable}
      />
      {watermark}
    </div>
  );
}
