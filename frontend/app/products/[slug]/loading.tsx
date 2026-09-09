import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { ToastProvider } from "@/components/ui/toast";
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
