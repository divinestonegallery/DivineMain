import { CookieConsent } from "@/components/layout/cookie-consent";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { ToastProvider } from "@shared/components/toast";
import styles from "./product-page.module.css";

export default function ProductLoading() {
  return (
    <ToastProvider>
      <SiteHeader />
      <main className={styles.productPage} id="main-content" tabIndex={-1}>
        <section className={`${styles.productState} site-container`} aria-live="polite">
          <h1 className="font-display">Loading product...</h1>
          <p>Preparing the product details from the gallery.</p>
        </section>
      </main>
      <SiteFooter />
      <CookieConsent />
    </ToastProvider>
  );
}
