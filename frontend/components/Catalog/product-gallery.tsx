"use client";

import Image from "next/image";
import { Expand, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { ProductImage } from "@/src/types/product";
import styles from "./product.module.css";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

function isRemoteImage(src: string) {
  return /^https?:\/\//i.test(src);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function ProductGallery({ images }: { images: ProductImage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panRef = useRef(pan);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const activeImage = images[activeIndex];

  const getClampedPan = useCallback((nextPan: { x: number; y: number }, nextZoom: number) => {
    const stage = stageRef.current;
    if (!stage || nextZoom <= MIN_ZOOM) return { x: 0, y: 0 };

    const maxX = (stage.clientWidth * (nextZoom - 1)) / 2;
    const maxY = (stage.clientHeight * (nextZoom - 1)) / 2;

    return {
      x: clamp(nextPan.x, -maxX, maxX),
      y: clamp(nextPan.y, -maxY, maxY),
    };
  }, []);

  const resetViewer = useCallback(() => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    dragRef.current = null;
    setPanning(false);
  }, []);

  const closeViewer = useCallback(() => {
    setExpanded(false);
    resetViewer();
  }, [resetViewer]);

  const openViewer = useCallback(() => {
    resetViewer();
    setExpanded(true);
  }, [resetViewer]);

  const handleThumbnailClick = useCallback((index: number) => {
    setActiveIndex(index);
    resetViewer();
  }, [resetViewer]);

  const updateZoom = useCallback((direction: "in" | "out") => {
    setZoom((currentZoom) => {
      const nextZoom = direction === "in"
        ? clamp(currentZoom + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM)
        : clamp(currentZoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);

      setPan((currentPan) => getClampedPan(currentPan, nextZoom));
      return nextZoom;
    });
  }, [getClampedPan]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (zoom <= MIN_ZOOM) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: panRef.current.x,
      originY: panRef.current.y,
    };
    setPanning(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextPan = {
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    };
    setPan(getClampedPan(nextPan, zoom));
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    setPanning(false);
  };

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    if (!expanded) return;

    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;

    const overlay = overlayRef.current;
    if (!overlay) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      if (event.deltaY < 0) {
        updateZoom("in");
      } else if (event.deltaY > 0) {
        updateZoom("out");
      }
    };

    overlay.addEventListener("wheel", handleWheel, { passive: false });
    return () => overlay.removeEventListener("wheel", handleWheel);
  }, [expanded, updateZoom]);

  useEffect(() => {
    if (!expanded) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeViewer();
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        updateZoom("in");
      } else if (event.key === "-") {
        event.preventDefault();
        updateZoom("out");
      } else if (event.key === "0") {
        event.preventDefault();
        resetViewer();
      }
    };

    const handleResize = () => {
      setPan((currentPan) => getClampedPan(currentPan, zoom));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [closeViewer, expanded, getClampedPan, resetViewer, updateZoom, zoom]);

  if (!activeImage) return null;

  return (
    <div className={styles.gallery}>
      <div className={styles.galleryMain}>
        <Image src={activeImage.src} alt={activeImage.alt} fill sizes="(max-width: 900px) 100vw, 55vw" priority unoptimized={isRemoteImage(activeImage.src)} />
        <button type="button" aria-label="View larger image" onClick={openViewer}>
          <Expand aria-hidden="true" size={19} />
        </button>
      </div>
      <div className={styles.galleryThumbnails}>
        {images.map((image, index) => (
          <button
            key={`${image.src}-${index}`}
            type="button"
            aria-label={`View image ${index + 1}`}
            aria-pressed={index === activeIndex}
            onClick={() => handleThumbnailClick(index)}
          >
            <Image src={image.src} alt="" fill sizes="90px" unoptimized={isRemoteImage(image.src)} />
          </button>
        ))}
      </div>
      {expanded ? (
        <div className={styles.imageViewerOverlay} role="dialog" aria-modal="true" aria-label="Expanded product image" ref={overlayRef}>
          <button className={styles.imageViewerBackdrop} type="button" aria-label="Close image viewer" onClick={closeViewer} />
          <button className={styles.imageViewerClose} type="button" aria-label="Close image viewer" onClick={closeViewer} ref={closeButtonRef}>
            <X aria-hidden="true" size={22} strokeWidth={1.8} />
          </button>

          <div className={styles.imageViewerPanel}>
            <div className={styles.imageViewerStage} ref={stageRef}>
              <div
                className={styles.imageViewerImage}
                data-zoomed={zoom > MIN_ZOOM}
                data-dragging={panning}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}
              >
                <Image src={activeImage.src} alt={activeImage.alt} fill sizes="(max-width: 680px) 92vw, 60vw" unoptimized={isRemoteImage(activeImage.src)} />
              </div>
            </div>

            <div className={styles.imageViewerControls} aria-label="Image zoom controls">
              <button className={styles.imageViewerControlButton} type="button" aria-label="Zoom out" onClick={() => updateZoom("out")} disabled={zoom <= MIN_ZOOM}>
                <ZoomOut aria-hidden="true" size={19} strokeWidth={1.8} />
              </button>
              <span className={styles.imageViewerZoomLevel} aria-live="polite">{Math.round(zoom * 100)}%</span>
              <button className={styles.imageViewerControlButton} type="button" aria-label="Zoom in" onClick={() => updateZoom("in")} disabled={zoom >= MAX_ZOOM}>
                <ZoomIn aria-hidden="true" size={19} strokeWidth={1.8} />
              </button>
              <button className={styles.imageViewerControlButton} type="button" aria-label="Reset zoom" onClick={resetViewer} disabled={zoom === MIN_ZOOM && pan.x === 0 && pan.y === 0}>
                <RotateCcw aria-hidden="true" size={18} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
