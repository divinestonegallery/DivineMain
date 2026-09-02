// @ts-nocheck
import { ReactNode } from "react";
import { Breadcrumbs } from "./breadcrumbs";
import { CookieConsent } from "./cookie-consent";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { WhatsAppAssistance } from "./whatsapp-assistance";
import { ToastProvider } from "@/components/ui/toast";
import styles from "./legal-page.module.css";

export function LegalPage({ title, eyebrow, intro, children }: { title: string; eyebrow: string; intro: string; children: ReactNode }) {
  return (
    <ToastProvider>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero}>
          <div className="site-container">
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />
            <div className={styles.heroInner}>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1 className="font-display">{title}</h1>
              <p>{intro}</p>
            </div>
          </div>
        </section>
        <div className={`${styles.content} site-container`}>
          <aside className={styles.updated}>Last updated: 9 August 2026<br />Order-specific written terms take priority where applicable.</aside>
          <div className={styles.sections}>{children}</div>
        </div>
      </main>
      <SiteFooter />
      
      <CookieConsent />
    </ToastProvider>
  );
}

export { styles as legalPageStyles };
