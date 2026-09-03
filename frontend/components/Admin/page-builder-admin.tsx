// @ts-nocheck
"use client";

import Link from "next/link";
import { Blocks, ExternalLink, LayoutTemplate } from "lucide-react";
import styles from "./page-builder-admin.module.css";

export function PageBuilderAdmin() {
  return (
    <section className={styles.builder}>
      <aside className={styles.pageRail}>
        <header><div><small>Website</small><strong>Static pages</strong></div><LayoutTemplate size={17} /></header>
        <nav>
          <button className={styles.selectedPage}><span><strong>Homepage</strong><small>Connected through application home data</small></span><em className={styles.published}>Live</em></button>
        </nav>
      </aside>
      <div className={styles.canvas}>
        <header className={styles.canvasHeader}>
          <div><small>Backend connection</small><h2 className="font-display">Page builder route unavailable</h2></div>
          <div><Link className={styles.secondary} href="/" target="_blank">View site <ExternalLink size={14} /></Link></div>
        </header>
        <div className={styles.empty}>
          <Blocks size={28} />
          <h3 className="font-display">Homepage content is implemented in the frontend.</h3>
          <p>
            This Django backend does not expose page, section, version, or CMS editing endpoints.
            The admin page-builder no longer sends requests to missing routes.
          </p>
        </div>
      </div>
    </section>
  );
}
