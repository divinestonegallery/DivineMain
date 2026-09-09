import { ArrowRight, CircleHelp, MessageCircle } from "lucide-react";
import Link from "next/link";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { buttonClassName } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import styles from "./faq.module.css";

export default function FaqLoading() {
  return (
    <ToastProvider>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero}>
          <div className="site-container">
            <div className={styles.heroInner}>
              <p className={styles.eyebrow}>Gallery assistance</p>
              <h1 className="font-display">Questions, answered simply.</h1>
              <p>Helpful starting answers about choosing, commissioning and caring for a marble murti. For a product-specific answer, speak directly with our gallery.</p>
            </div>
          </div>
        </section>
        <section className={styles.faqSection}>
          <div className="site-container">
            <section className={styles.faqGroup}>
              <div>
                <CircleHelp aria-hidden="true" size={24} />
                <h2 className="font-display">FAQs</h2>
                <p>Loading the latest gallery answers.</p>
              </div>
              <div className={styles.stateCard} role="status" aria-busy="true">Loading FAQs...</div>
            </section>
          </div>
        </section>
        <section className={styles.cta}>
          <div className="site-container">
            <MessageCircle aria-hidden="true" size={26} />
            <p className={styles.eyebrow}>Still have a question?</p>
            <h2 className="font-display">Ask our gallery about your specific work or space.</h2>
            <div>
              <Link className={buttonClassName({ size: "lg" })} href="/contact">Contact the gallery <ArrowRight aria-hidden="true" size={18} /></Link>
              <a className={buttonClassName({ variant: "outline", size: "lg" })} href="https://wa.me/919166138566?text=Namaste%2C%20I%20have%20a%20question%20about%20a%20marble%20murti." target="_blank" rel="noreferrer">Ask on WhatsApp</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <CookieConsent />
    </ToastProvider>
  );
}
