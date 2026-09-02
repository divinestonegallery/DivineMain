// @ts-nocheck
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  Gem,
  Hand,
  HandHeart,
  Palette,
  PencilRuler,
  Ruler,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { WhatsAppAssistance } from "@/components/common/whatsapp-assistance";
import { buttonClassName } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import { getPublishedPage } from "@/api/cms/public-repository";
import { PublishedPageView } from "@/components/CMS/published-page";
import styles from "./artisans.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("artisans");
  return { title: page?.seoTitle ? { absolute: page.seoTitle } : "Artisans & Marble Murti Craftsmanship", description: page?.seoDescription ?? "Explore the hand-carved marble murti craft practiced by Divine Stone Gallery's fourth-generation master moortikars in Alwar, Rajasthan.", alternates: { canonical: "/artisans" } };
}
export const dynamic = "force-dynamic";

const stages = [
  { icon: PencilRuler, title: "Understanding the sacred form", copy: "The deity, intended placement, scale and desired character establish the direction of the work." },
  { icon: Ruler, title: "Setting the proportions", copy: "The overall balance, posture and relationship between elements are considered before detail takes over." },
  { icon: Gem, title: "Reading the marble", copy: "The stone's natural character is observed so the form can be approached with care and visual coherence." },
  { icon: Hand, title: "Shaping by hand", copy: "The broad silhouette gives way to gesture, drapery, ornaments and increasingly sensitive detail." },
  { icon: Eye, title: "Refining expression", copy: "The face and expression receive careful attention because they carry much of the murti's devotional presence." },
  { icon: Palette, title: "Finishing the work", copy: "Natural-white or painted finishes are completed by hand according to the chosen direction." },
] as const;

function StaticArtisansPage() {
  return (
    <ToastProvider>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero}>
          <div className="site-container">
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Artisans & Craft" }]} />
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>The hands behind the form</p>
                <h1 className="font-display">Craft is knowledge{" "}<span>made visible.</span></h1>
                <p>
                  Our fourth-generation master moortikars carry forward a family language of sacred proportion, devotional expression and patient hand-finishing in Alwar, Rajasthan.
                </p>
                <div className={styles.heroProof}>
                  <span><BadgeCheck aria-hidden="true" size={18} /> Family tradition since 1960</span>
                  <span><HandHeart aria-hidden="true" size={18} /> Shaped and finished by hand</span>
                </div>
              </div>

              <div className={styles.heroComposition}>
                <div className={styles.heroImageLarge}><Image src="/catalog/gauri-shankar-18.jpg" alt="Hand-carved Gauri Shankar family marble sculpture" fill priority sizes="(max-width: 900px) 70vw, 36vw" /></div>
                <div className={styles.heroImageSmall}><Image src="/catalog/shreenathji-wall-27.jpg" alt="Detailed hand-painted Shrinathji marble wall sculpture" fill sizes="(max-width: 900px) 38vw, 19vw" /></div>
                <div className={styles.heroStamp}><Sparkles aria-hidden="true" size={18} /><span><strong className="font-display">Fourth generation</strong><small>Master moortikars</small></span></div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.introSection}>
          <div className={`${styles.introGrid} site-container`}>
            <div><p className={styles.eyebrow}>More than technique</p><h2 className="font-display">Learning to see comes before learning to carve.</h2></div>
            <div>
              <p>In a family practice, craft is carried through observation and repetition. It is an understanding of when a curve feels balanced, when an expression feels calm and when ornamentation supports rather than overwhelms the sacred form.</p>
              <p>That sensitivity cannot be separated from the hand. It develops through patient work and through a relationship with the material that deepens across generations.</p>
            </div>
          </div>
        </section>

        <section className={styles.processSection}>
          <div className="site-container">
            <div className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}>From vision to presence</p><h2 className="font-display">The making journey.</h2></div>
              <p>Every murti is different, but these stages describe the care and decisions that shape the work.</p>
            </div>
            <div className={styles.stageGrid}>
              {stages.map(({ icon: Icon, title, copy }, index) => (
                <article key={title}>
                  <div><span>{String(index + 1).padStart(2, "0")}</span><Icon aria-hidden="true" size={22} /></div>
                  <h3 className="font-display">{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.proportionSection}>
          <div className={`${styles.proportionGrid} site-container`}>
            <div className={styles.proportionImage}>
              <Image src="/catalog/radha-krishna-39.jpg" alt="Radha Krishna marble moorties showing balanced sacred proportions" fill sizes="(max-width: 900px) 100vw, 48vw" />
              <span>Full form · 39 inches</span>
            </div>
            <div className={styles.proportionCopy}>
              <ScanSearch aria-hidden="true" size={28} />
              <p className={styles.eyebrow}>Shilp Shastra</p>
              <h2 className="font-display">Proportion holds the form together.</h2>
              <p>Our work is designed in accordance with the sacred principles of Shilp Shastra. Scale and balance guide the relationship between the posture, features, hands, ornaments and base.</p>
              <ul>
                <li><BadgeCheck aria-hidden="true" size={17} /> Overall stance considered first</li>
                <li><BadgeCheck aria-hidden="true" size={17} /> Expression refined with restraint</li>
                <li><BadgeCheck aria-hidden="true" size={17} /> Ornamentation supports the whole form</li>
              </ul>
              <Link href="/our-story">Read our family story <ArrowRight aria-hidden="true" size={17} /></Link>
            </div>
          </div>
        </section>

        <section className={styles.handmadeSection}>
          <div className="site-container">
            <div className={styles.handmadeHeading}>
              <p className={styles.eyebrow}>The character of handwork</p>
              <h2 className="font-display">No two pieces of marble—or two finished works—are exactly alike.</h2>
            </div>
            <div className={styles.handmadeGrid}>
              <article><Gem aria-hidden="true" size={24} /><h3 className="font-display">Natural variation</h3><p>Veining, tone and small characteristics belong to the stone and give each work an individual material presence.</p></article>
              <article><Hand aria-hidden="true" size={24} /><h3 className="font-display">Hand-shaped detail</h3><p>Subtle differences in curves, ornamentation and finishing are part of a process guided by the artisan&apos;s eye and hand.</p></article>
              <article><Eye aria-hidden="true" size={24} /><h3 className="font-display">Individual expression</h3><p>A sacred sculpture is not treated as a mechanical duplicate; expression and harmony are considered within the whole work.</p></article>
            </div>
          </div>
        </section>

        <section className={styles.gallerySection}>
          <div className="site-container">
            <div className={styles.galleryHeading}><div><p className={styles.eyebrow}>The craft, completed</p><h2 className="font-display">Details in devotion.</h2></div><Link href="/shop">Explore all works <ArrowRight aria-hidden="true" size={16} /></Link></div>
            <div className={styles.galleryGrid}>
              <Link href="/products/ornate-ganesh-24-inch-marble"><Image src="/catalog/ganesh-24.jpg" alt="Ornate hand-painted marble Ganesha" fill sizes="(max-width: 680px) 50vw, 33vw" /><span>Ornamentation</span></Link>
              <Link href="/products/lakshmi-mata-24-inch-marble"><Image src="/catalog/lakshmi-24.jpg" alt="Hand-painted Lakshmi Mata marble moorti" fill sizes="(max-width: 680px) 50vw, 33vw" /><span>Expression</span></Link>
              <Link href="/products/ram-darbar-24-inch-marble"><Image src="/catalog/ram-darbar-24.jpg" alt="Natural white Ram Darbar marble set" fill sizes="(max-width: 680px) 50vw, 33vw" /><span>Composition</span></Link>
            </div>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div className="site-container">
            <p className={styles.eyebrow}>Made personally</p>
            <h2 className="font-display">Let our family atelier shape a sacred work for yours.</h2>
            <div><Link className={buttonClassName({ size: "lg" })} href="/custom-murti">Begin a commission <ArrowRight aria-hidden="true" size={18} /></Link><Link className={buttonClassName({ variant: "outline", size: "lg" })} href="/shop">View the collection</Link></div>
          </div>
        </section>
      </main>
      <SiteFooter />
      
      <CookieConsent />
    </ToastProvider>
  );
}

export default async function ArtisansPage() {
  const page = await getPublishedPage("artisans");
  return page?.sections.length ? <PublishedPageView page={page} /> : <StaticArtisansPage />;
}
