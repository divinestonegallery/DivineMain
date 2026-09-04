// @ts-nocheck
import type { Metadata } from "next";
import { ArrowRight, Clock3, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { ToastProvider } from "@/components/ui/toast";
import { brand } from "@/src/config/brand";
import { ContactForm } from "@/components/Contact/contact-form";
import styles from "./contact.module.css";

export const metadata: Metadata = { title: "Contact the Gallery", description: "Speak with Divine Stone Gallery for marble murti selection, custom commissions, pricing, packing and delivery guidance.", alternates: { canonical: "/contact" } };

const whatsappHref = "https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20assistance%20from%20Divine%20Stone%20Gallery.";

export default function ContactPage() {
  return (
    <ToastProvider>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.contactSection}>
          <div className={`${styles.contactLayout} site-container`}>
            <div className={styles.contactIntro}>
              <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
              <p className={styles.eyebrow}>Get in touch</p>
              <h1 className="font-display">Speak directly with our gallery.</h1>
              <p className={styles.lede}>
                Have questions about a murti, custom order, dimensions, pricing or delivery?
                Our team is here to help you choose with confidence.
              </p>

              <div className={styles.contactMethods}>
                <a className={styles.contactCard} href={whatsappHref} target="_blank" rel="noreferrer">
                  <span className={styles.contactIcon}><MessageCircle aria-hidden="true" size={22} /></span>
                  <span>
                    <strong>WhatsApp</strong>
                    <small>Share photos, dimensions and product links</small>
                  </span>
                  <ArrowRight className={styles.cardArrow} aria-hidden="true" size={18} />
                </a>

                <a className={styles.contactCard} href="tel:+919166138566">
                  <span className={styles.contactIcon}><Phone aria-hidden="true" size={21} /></span>
                  <span>
                    <strong>Phone</strong>
                    <small>{brand.phone}</small>
                  </span>
                  <ArrowRight className={styles.cardArrow} aria-hidden="true" size={18} />
                </a>

                <div className={styles.contactCard}>
                  <span className={styles.contactIcon}><MapPin aria-hidden="true" size={21} /></span>
                  <span>
                    <strong>Our location</strong>
                    <small>{brand.location}</small>
                  </span>
                </div>
              </div>

              <div className={styles.galleryNotes}>
                <span><ShieldCheck aria-hidden="true" size={17} /> {brand.heritage}</span>
                <span><Clock3 aria-hidden="true" size={17} /> WhatsApp is the easiest way to leave complete details.</span>
              </div>
            </div>

            <ContactForm />
          </div>
        </section>
      </main>
      <SiteFooter /><CookieConsent />
    </ToastProvider>
  );
}
