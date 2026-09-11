"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type ReactNode } from "react";

type ResilientImageProps = ImageProps & {
  fallback: ReactNode;
};

/**
 * Keeps a broken remote image from leaving a blank card or a noisy browser error.
 * The fallback is supplied by the owning surface so it can match that surface's
 * layout and remains a leaf client boundary for server-rendered pages.
 */
export function ResilientImage({ fallback, onError, ...props }: ResilientImageProps) {
  const [failed, setFailed] = useState(false);
  const { alt, ...imageProps } = props;

  if (failed) return <>{fallback}</>;

  return (
    <Image
      {...imageProps}
      alt={alt}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
