// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { buttonClassName } from "@shared/components/button";
import { ToastProvider } from "@shared/components/toast";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <ToastProvider>
      <SiteHeader />
      <main className={styles.page} id="main-content" tabIndex={-1}>
        <div className={styles.inner}>
          <span className={styles.code}>404 · Page not found</span>
          <h1 className="font-display">This path does not lead to the gallery.</h1>
          <p>The page may have moved. Return to the collection or speak with our gallery for personal assistance.</p>
          <div className={styles.actions}>
            <Link className={buttonClassName({ size: "lg" })} href="/shop">Explore moorties <ArrowRight aria-hidden="true" size={18} /></Link>
            <Link className={buttonClassName({ variant: "outline", size: "lg" })} href="/contact">Contact the gallery</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </ToastProvider>
  );
}
