// @ts-nocheck
"use client";

import Link from "next/link";
import { ImageIcon, Upload } from "lucide-react";
import styles from "./media-library-admin.module.css";

export function MediaLibraryAdmin() {
  return (
    <section className={styles.library}>
      <div className={styles.metrics}>
        <article><ImageIcon size={19} /><span><small>Standalone library</small><strong>0</strong></span></article>
        <article><Upload size={19} /><span><small>Supported upload flow</small><strong>Product images</strong></span></article>
      </div>
      <div className={styles.empty}>
        <ImageIcon size={28} />
        <h2 className="font-display">Media is attached from product records.</h2>
        <p>
          This backend provides presigned upload sessions and product image attachment, but it does
          not expose a separate media-library API. Use Catalogue Manager to attach uploaded product
          image object keys.
        </p>
        <Link className={styles.primary} href="/admin/catalog">Open catalogue manager</Link>
      </div>
    </section>
  );
}
