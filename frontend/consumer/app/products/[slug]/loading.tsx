import { CookieConsent } from "@/components/layout/cookie-consent";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { ProductDetailSkeleton } from "@/components/product/product-detail-skeleton";
import { ToastProvider } from "@shared/components/toast";
import styles from "./product-page.module.css";

export default function ProductLoading() {
  return (
    <ToastProvider>
      <SiteHeader />
      <main className={styles.productPage} id="main-content" tabIndex={-1}>
        <ProductDetailSkeleton />
      </main>
      <SiteFooter />
      <CookieConsent />
    </ToastProvider>
  );
}
