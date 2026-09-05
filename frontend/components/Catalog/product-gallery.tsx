// @ts-nocheck
"use client";

import Image from "next/image";
import { Expand } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ProductImage } from "@/src/types/product";
import styles from "./product.module.css";

function isRemoteImage(src: string) {
  return /^https?:\/\//i.test(src);
}

export function ProductGallery({ images }: { images: ProductImage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const activeImage = images[activeIndex];

  if (!activeImage) return null;

  return (
    <div className={styles.gallery}>
      <div className={styles.galleryMain}>
        <Image src={activeImage.src} alt={activeImage.alt} fill sizes="(max-width: 900px) 100vw, 55vw" priority unoptimized={isRemoteImage(activeImage.src)} />
        <button type="button" aria-label="View larger image" onClick={() => setExpanded(true)}>
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
            onClick={() => setActiveIndex(index)}
          >
            <Image src={image.src} alt="" fill sizes="90px" unoptimized={isRemoteImage(image.src)} />
          </button>
        ))}
      </div>
      <Modal open={expanded} title="Product detail" onClose={() => setExpanded(false)}>
        <div className={styles.galleryExpanded}>
          <Image src={activeImage.src} alt={activeImage.alt} fill sizes="90vw" unoptimized={isRemoteImage(activeImage.src)} />
        </div>
      </Modal>
    </div>
  );
}
