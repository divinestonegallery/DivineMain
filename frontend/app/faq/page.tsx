// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gem, MessageCircle, PackageCheck, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { WhatsAppAssistance } from "@/components/common/whatsapp-assistance";
import { Accordion } from "@/components/ui/accordion";
import { buttonClassName } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import styles from "./faq.module.css";

export const metadata: Metadata = { title: "Frequently Asked Questions", description: "Answers about Divine Stone Gallery marble murtis, custom commissions, pricing, packing, delivery and care.", alternates: { canonical: "/faq" } };

const groups = [
  { icon: Gem, title: "Choosing a murti", intro: "Products, materials and finding the right form.", items: [
    { id: "price", title: "Why is pricing available on request?", content: <p>Availability, finish, dimensions, packing and destination can affect the final quote. Contact the gallery with the product name so the current details can be confirmed.</p> },
    { id: "actual", title: "Will the murti look exactly like the photograph?", content: <p>Photography represents the work as clearly as possible, but marble has natural variation and hand-finishing can create subtle differences. Ask for current product details before confirmation.</p> },
    { id: "size", title: "How do I choose the right size?", content: <p>Measure usable height, width and depth, including the base and surrounding objects. Our <Link href="/guides/sizing">sizing guide</Link> gives a starting point, and the gallery can help with your specific space.</p> },
  ] },
  { icon: Sparkles, title: "Custom commissions", intro: "Creating a sacred work around your requirements.", items: [
    { id: "custom-start", title: "What do I need to begin a custom murti enquiry?", content: <p>The deity or subject, approximate height and intended placement are enough to begin. Photos, sketches and finish references can be shared during the WhatsApp consultation.</p> },
    { id: "custom-details", title: "Which details can be discussed?", content: <p>Depending on the form, the gallery can discuss scale, marble, posture, ornamentation, base, accompanying figures and finish before confirming what is possible.</p> },
    { id: "custom-time", title: "How long does a custom murti take?", content: <p>The making schedule depends on size, complexity, finish and current atelier commitments. A timeline should be confirmed by the gallery for the specific commission.</p> },
  ] },
  { icon: PackageCheck, title: "Packing, delivery and care", intro: "What happens after a work is selected.", items: [
    { id: "delivery", title: "How is delivery arranged?", content: <p>Packing and transport are planned according to the work&apos;s dimensions, weight and destination. The available arrangement and quote are shared before confirmation.</p> },
    { id: "arrival", title: "What should I do when the shipment arrives?", content: <p>Inspect the outer packing and work carefully, preserve the packaging until inspection is complete, and photograph any visible issue before moving or installing the murti.</p> },
    { id: "clean", title: "How should I clean a marble murti?", content: <p>Use a clean, dry, soft cloth or brush for routine dusting. Avoid harsh, acidic or abrasive products. Read the <Link href="/guides/care">care guide</Link> and ask before treating stains or painted surfaces.</p> },
  ] },
] as const;

export default function FaqPage() {
  return <ToastProvider><SiteHeader /><main id="main-content" tabIndex={-1}><section className={styles.hero}><div className="site-container"><Breadcrumbs items={[{label:"Home",href:"/"},{label:"FAQ"}]} /><div className={styles.heroInner}><p className={styles.eyebrow}>Gallery assistance</p><h1 className="font-display">Questions, answered simply.</h1><p>Helpful starting answers about choosing, commissioning and caring for a marble murti. For a product-specific answer, speak directly with our gallery.</p></div></div></section><section className={styles.faqSection}><div className="site-container">{groups.map(({icon:Icon,title,intro,items})=><section className={styles.faqGroup} key={title}><div><Icon aria-hidden="true" size={24}/><h2 className="font-display">{title}</h2><p>{intro}</p></div><Accordion items={[...items]} /></section>)}</div></section><section className={styles.cta}><div className="site-container"><MessageCircle aria-hidden="true" size={26}/><p className={styles.eyebrow}>Still have a question?</p><h2 className="font-display">Ask our gallery about your specific work or space.</h2><div><Link className={buttonClassName({size:"lg"})} href="/contact">Contact the gallery <ArrowRight aria-hidden="true" size={18}/></Link><a className={buttonClassName({variant:"outline",size:"lg"})} href="https://wa.me/919166138566?text=Namaste%2C%20I%20have%20a%20question%20about%20a%20marble%20murti." target="_blank" rel="noreferrer">Ask on WhatsApp</a></div></div></section></main><SiteFooter/><CookieConsent/></ToastProvider>;
}
