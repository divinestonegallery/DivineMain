import React from "react";
import { Image as ImageIcon } from "lucide-react";

interface ImagePlaceholderProps {
  className?: string;
  text?: string;
  aspectRatio?: string;
}

export function ImagePlaceholder({
  className = "",
  text = "Image Placeholder",
  aspectRatio = "4/5",
}: ImagePlaceholderProps) {
  return (
    <div
      className={className}
      style={{
        aspectRatio,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--surface-muted)",
        border: "1px dashed var(--border)",
        borderRadius: "var(--radius-lg)",
        color: "var(--ink-muted)",
        width: "100%",
        height: "100%",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <ImageIcon size={32} style={{ marginBottom: "1rem", opacity: 0.5 }} aria-hidden="true" />
      <span style={{ fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.05em" }}>{text}</span>
    </div>
  );
}
