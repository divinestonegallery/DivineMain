// @ts-nocheck
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Gem, HeartHandshake, Ruler, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { WhatsAppAssistance } from "@/components/common/whatsapp-assistance";
import { buttonClassName } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import { guides } from "@/components/Guides/guide-data";
import styles from "./guides.module.css";

export const metadata: Metadata = {
  title: "Marble Murti Guides",
  description: "Practical Divine Stone Gallery guides for choosing marble, selecting the right murti size and caring for hand-carved sacred works.",
  alternates: { canonical: "/guides" },
};

const iconMap = { materials: Gem, sizing: Ruler, care: HeartHandshake } as const;

export default function GuidesPage() {
  return (
    <ToastProvider>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hubHero}>
          <div className="site-container">
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Guides" }]} />
            <div className={styles.hubHeroGrid}>
              <div><p className={styles.eyebrow}>The Divine Stone guidebook</p><h1 className="font-display">Choose thoughtfully.{" "}<span>Care beautifully.</span></h1><p>Simple, practical guidance for understanding marble, finding the right scale and caring for a sacred work over time.</p></div>
              <aside><BookOpen aria-hidden="true" size={24} /><strong className="font-display">Need personal guidance?</strong><p>Share your space and preferences with our gallery for help beyond these guides.</p><a href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20guidance%20choosing%20or%20caring%20for%20a%20murti." target="_blank" rel="noreferrer">Ask the gallery <ArrowRight aria-hidden="true" size={16} /></a></aside>
            </div>
          </div>
        </section>

        <section className={styles.guideCardsSection}>
          <div className={`${styles.guideCards} site-container`}>
            {guides.map((guide) => {
              const Icon = iconMap[guide.slug];
              return (
                <article key={guide.slug}>
                  <Link className={styles.guideCardImage} href={`/guides/${guide.slug}`}><Image src={guide.image} alt={guide.imageAlt} fill sizes="(max-width: 680px) 100vw, 33vw" /></Link>
                  <div className={styles.guideCardCopy}><span><Icon aria-hidden="true" size={18} /> {guide.readTime}</span><h2 className="font-display"><Link href={`/guides/${guide.slug}`}>{guide.title}</Link></h2><p>{guide.summary}</p><Link href={`/guides/${guide.slug}`}>Read the guide <ArrowRight aria-hidden="true" size={16} /></Link></div>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.hubCta}>
          <div className="site-container"><Sparkles aria-hidden="true" size={26} /><p className={styles.eyebrow}>Still deciding?</p><h2 className="font-display">A guide can inform you. A conversation can guide you personally.</h2><div><Link className={buttonClassName({ size: "lg" })} href="/shop">Explore the collection <ArrowRight aria-hidden="true" size={18} /></Link><Link className={buttonClassName({ variant: "outline", size: "lg" })} href="/custom-murti">Discuss a custom murti</Link></div></div>
        </section>
      </main>
      <SiteFooter />
      <WhatsAppAssistance />
      <CookieConsent />
    </ToastProvider>
  );
}
