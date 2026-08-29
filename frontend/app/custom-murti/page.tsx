// @ts-nocheck
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Gem,
  HandHeart,
  MessageCircle,
  PackageCheck,
  Palette,
  PencilRuler,
  Ruler,
  Sparkles,
} from "lucide-react";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { WhatsAppAssistance } from "@/components/common/whatsapp-assistance";
import { Accordion } from "@/components/ui/accordion";
import { buttonClassName } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import { ConsultationForm } from "@/components/CustomMurti/consultation-form";
import { getPublishedPage } from "@/api/cms/public-repository";
import { PublishedPageView } from "@/components/CMS/published-page";
import styles from "./custom-murti.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("custom-murti");
  return { title: page?.seoTitle ? { absolute: page.seoTitle } : "Custom Marble Murti Commission", description: page?.seoDescription ?? "Commission a custom hand-carved marble murti with Divine Stone Gallery's fourth-generation master moortikars in Alwar, Rajasthan.", alternates: { canonical: "/custom-murti" } };
}
export const dynamic = "force-dynamic";

const process = [
  { number: "01", title: "Share your vision", copy: "Tell us the deity, placement, approximate dimensions and the feeling you want the finished work to carry." },
  { number: "02", title: "Shape the details", copy: "We discuss proportions, marble, posture, ornamentation, finish and practical considerations for your space." },
  { number: "03", title: "Approve before carving", copy: "The direction is confirmed with you before our moortikars begin shaping the marble." },
  { number: "04", title: "Follow its journey", copy: "Our gallery remains your point of contact through carving, finishing, protective packing and delivery planning." },
] as const;

const faqItems = [
  { id: "begin", title: "What information do I need to begin?", content: <p>A deity or subject, approximate height and intended placement are enough for the first conversation. We can help refine the remaining decisions.</p> },
  { id: "exact", title: "Can you create an exact copy of another artist's murti?", content: <p>Reference images can help explain posture, expression and ornamentation. Our gallery will guide you toward an original work shaped within our family&apos;s craft tradition.</p> },
  { id: "updates", title: "Will I receive progress updates?", content: <p>For commissioned work, the gallery can discuss suitable progress milestones with you when the scope and making schedule are confirmed.</p> },
  { id: "delivery", title: "How is a large murti delivered?", content: <p>Packing and delivery are planned around the work&apos;s final dimensions, weight and destination. The available arrangement is explained before confirmation.</p> },
] as const;

function ConsultationSection() {
  return <section className={styles.formSection} id="consultation"><div className={`${styles.formLayout} site-container`}><div className={styles.formIntro}><p className={styles.eyebrow}>Your first brief</p><h2 className="font-display">Start with what you already know.</h2><p>A few details help our gallery understand the direction. Nothing entered here is a final commitment.</p><div className={styles.formImage}><Image src="/catalog/gauri-shankar-18.jpg" alt="Custom Gauri Shankar family marble work" fill sizes="(max-width: 900px) 100vw, 40vw" /></div><ul><li><HandHeart aria-hidden="true" size={18} /> Personal consultation</li><li><Sparkles aria-hidden="true" size={18} /> Details refined together</li><li><PackageCheck aria-hidden="true" size={18} /> Packing and delivery planning</li></ul></div><ConsultationForm /></div></section>;
}

function StaticCustomMurtiPage() {
  return (
    <ToastProvider>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero}>
          <div className="site-container">
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Custom Murti" }]} />
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>A sacred work, made personally</p>
                <h1 className="font-display">Your vision,{" "}<span>shaped in marble.</span></h1>
                <p>Customize Your Moorti around your deity, sacred space and preferred expression—guided personally by our fourth-generation family atelier.</p>
                <div className={styles.heroActions}>
                  <a className={buttonClassName({ size: "lg" })} href="#consultation">Begin your consultation <ArrowRight aria-hidden="true" size={18} /></a>
                  <a className={buttonClassName({ variant: "outline", size: "lg" })} href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20to%20discuss%20a%20custom%20murti." target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" size={18} /> Ask on WhatsApp</a>
                </div>
                <div className={styles.heroProof}>
                  <span><BadgeCheck aria-hidden="true" size={18} /> Fourth-generation guidance</span>
                  <span><HandHeart aria-hidden="true" size={18} /> One-to-one consultation</span>
                </div>
              </div>

              <div className={styles.heroVisual}>
                <div className={styles.heroImage}>
                  <Image src="/catalog/ram-darbar-24.jpg" alt="Hand-carved Ram Darbar marble commission" fill priority sizes="(max-width: 900px) 100vw, 48vw" />
                </div>
                <div className={styles.heroCard}>
                  <Sparkles aria-hidden="true" size={20} />
                  <span><strong className="font-display">Designed around your space</strong><small>Home mandir · Temple · Sacred installation</small></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.possibilitiesSection}>
          <div className="site-container">
            <div className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}>Made with intention</p><h2 className="font-display">Every important detail can begin with a conversation.</h2></div>
              <p>You do not need to know every technical choice. Share what matters to you, and our gallery will guide the decisions.</p>
            </div>
            <div className={styles.possibilityGrid}>
              <article><Ruler aria-hidden="true" /><h3 className="font-display">Scale and placement</h3><p>Proportions considered for a home mandir, temple or larger sacred setting.</p></article>
              <article><Gem aria-hidden="true" /><h3 className="font-display">Marble selection</h3><p>Guidance on the stone and visual character suitable for the chosen form.</p></article>
              <article><PencilRuler aria-hidden="true" /><h3 className="font-display">Posture and detail</h3><p>Discuss expression, ornaments, accompanying figures, base and symbolic elements.</p></article>
              <article><Palette aria-hidden="true" /><h3 className="font-display">Finish and colour</h3><p>Choose natural white marble, painted detail or a restrained decorative finish.</p></article>
            </div>
          </div>
        </section>

        <section className={styles.processSection}>
          <div className="site-container">
            <div className={styles.processHeading}>
              <p className={styles.eyebrow}>The commission journey</p>
              <h2 className="font-display">Clear from the first conversation.</h2>
            </div>
            <div className={styles.processGrid}>
              {process.map((step) => <article key={step.number}><span>{step.number}</span><h3 className="font-display">{step.title}</h3><p>{step.copy}</p></article>)}
            </div>
          </div>
        </section>

        <ConsultationSection />

        <section className={styles.faqSection}>
          <div className={`${styles.faqGrid} site-container`}>
            <div><p className={styles.eyebrow}>Before you begin</p><h2 className="font-display">Questions about commissioning</h2><p>For anything more specific, speak directly with our gallery.</p><Link href="/contact">Contact Divine Stone Gallery <ArrowRight aria-hidden="true" size={16} /></Link></div>
            <Accordion items={[...faqItems]} />
          </div>
        </section>
      </main>
      <SiteFooter />
      <WhatsAppAssistance />
      <CookieConsent />
    </ToastProvider>
  );
}

export default async function CustomMurtiPage() {
  const page = await getPublishedPage("custom-murti");
  return page?.sections.length ? <PublishedPageView page={page} protectedContent={<ConsultationSection />} /> : <StaticCustomMurtiPage />;
}
