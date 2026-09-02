// @ts-nocheck
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, MapPin, MessageCircle, Phone, Ruler, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { WhatsAppAssistance } from "@/components/common/whatsapp-assistance";
import { buttonClassName } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import { brand } from "@/src/config/brand";
import { ContactForm } from "@/components/Contact/contact-form";
import styles from "./contact.module.css";

export const metadata: Metadata = { title: "Contact the Gallery", description: "Speak with Divine Stone Gallery for marble murti selection, custom commissions, pricing, packing and delivery guidance.", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <ToastProvider>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero}>
          <div className="site-container"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} /><div className={styles.heroGrid}><div><p className={styles.eyebrow}>Personal gallery assistance</p><h1 className="font-display">A thoughtful choice begins with a conversation.</h1><p>Ask about a specific work, share your mandir dimensions or begin a custom commission. Our gallery will help you understand the next step.</p><div className={styles.heroActions}><a className={buttonClassName({ size: "lg" })} href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20assistance%20from%20Divine%20Stone%20Gallery." target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" size={18} /> WhatsApp the gallery</a><a className={buttonClassName({ variant: "outline", size: "lg" })} href="tel:+919166138566"><Phone aria-hidden="true" size={18} /> Call {brand.phone}</a></div></div><div className={styles.heroImage}><Image src="/catalog/lakshmi-ganesh-saraswati-12.jpg" alt="Lakshmi, Ganesha and Saraswati marble works from Divine Stone Gallery" fill priority sizes="(max-width: 900px) 100vw, 48vw" /></div></div></div>
        </section>

        <section className={styles.contactSection}><div className={`${styles.contactLayout} site-container`}><div className={styles.contactIntro}><p className={styles.eyebrow}>Choose the easiest way</p><h2 className="font-display">Speak directly with our gallery.</h2><div className={styles.contactMethods}><a href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20assistance%20from%20Divine%20Stone%20Gallery." target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" /><span><strong>WhatsApp</strong><small>Share photos, dimensions and product links</small></span><ArrowRight aria-hidden="true" size={17} /></a><a href="tel:+919166138566"><Phone aria-hidden="true" /><span><strong>Phone</strong><small>{brand.phone}</small></span><ArrowRight aria-hidden="true" size={17} /></a><div><MapPin aria-hidden="true" /><span><strong>Our location</strong><small>{brand.location}</small></span></div></div><p className={styles.responseNote}>Availability and response timing can vary while the gallery team is assisting other clients or overseeing work. WhatsApp is the easiest way to leave complete details.</p></div><ContactForm /></div></section>

        <section className={styles.helpSection}><div className="site-container"><div className={styles.helpHeading}><div><p className={styles.eyebrow}>Helpful before you message</p><h2 className="font-display">Find an answer or prepare your brief.</h2></div></div><div className={styles.helpGrid}><Link href="/faq"><BookOpen aria-hidden="true" /><h3 className="font-display">Frequently asked questions</h3><p>Quick answers about products, commissions, packing and care.</p><span>Read FAQs <ArrowRight aria-hidden="true" size={15} /></span></Link><Link href="/guides/sizing"><Ruler aria-hidden="true" /><h3 className="font-display">Measure your space</h3><p>Prepare the dimensions needed for more useful size guidance.</p><span>Read sizing guide <ArrowRight aria-hidden="true" size={15} /></span></Link><Link href="/custom-murti"><Sparkles aria-hidden="true" /><h3 className="font-display">Custom murti consultation</h3><p>Build a detailed WhatsApp brief for a personal commission.</p><span>Begin a brief <ArrowRight aria-hidden="true" size={15} /></span></Link></div></div></section>
      </main>
      <SiteFooter /><CookieConsent />
    </ToastProvider>
  );
}
