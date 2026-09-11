// @ts-nocheck
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Gem, HeartHandshake, Ruler, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { CookieConsent } from "@/components/common/cookie-consent";
import { ResilientImage } from "@/components/common/resilient-image";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
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
  const [featuredGuide, ...supportingGuides] = guides;

  return (
    <ToastProvider>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hubHero}>
          <div className="site-container">
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Guides" }]} />
            <div className={styles.hubHeroGrid}>
              <div><p className={styles.eyebrow}>Divine Stone Gallery · Practical advice</p><h1 className="font-display">A clear guide to choosing and caring for a marble murti.</h1><p>Understand the stone, choose a proportion that suits your space and look after the work once it reaches your home.</p><nav className={styles.guidePathNav} aria-label="Choose a guide"><span>Read about</span>{guides.map((guide) => <Link href={`/guides/${guide.slug}`} key={guide.slug}>{guide.eyebrow.replace(" guide", "")} <ArrowRight aria-hidden="true" size={14} /></Link>)}</nav></div>
              <aside><BookOpen aria-hidden="true" size={24} /><strong className="font-display">Not sure where to begin?</strong><p>Send us a photograph or a few measurements. Our gallery team can help you choose a sensible starting point.</p><a href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20guidance%20choosing%20or%20caring%20for%20a%20murti." target="_blank" rel="noreferrer">Speak with the gallery <ArrowRight aria-hidden="true" size={16} /></a></aside>
            </div>
          </div>
        </section>

        <section className={styles.guideCardsSection}>
          <div className="site-container">
            <header className={styles.guideSectionIntro}><div><p className={styles.eyebrow}>Before you order</p><h2 className="font-display">Get the practical details right.</h2></div><p>These short notes cover the questions we hear most often from families, collectors and people planning a new mandir.</p></header>
            {featuredGuide ? <article className={styles.featuredGuide}>
              <Link className={styles.featuredGuideImage} href={`/guides/${featuredGuide.slug}`}>
                <ResilientImage src={featuredGuide.image} alt={featuredGuide.imageAlt} fill priority sizes="(max-width: 800px) 100vw, 52vw" fallback={<span className={styles.guideImageFallback} role="img" aria-label="Guide image unavailable">Image coming soon</span>} />
              </Link>
              <div className={styles.featuredGuideCopy}><span className={styles.featuredLabel}>{featuredGuide.eyebrow} · {featuredGuide.readTime}</span><h2 className="font-display"><Link href={`/guides/${featuredGuide.slug}`}>{featuredGuide.title}</Link></h2><p>{featuredGuide.summary}</p><ul>{featuredGuide.highlights.map((item) => <li key={item.label}><strong>{item.value}</strong><span>{item.label}</span></li>)}</ul><Link className={styles.featuredGuideLink} href={`/guides/${featuredGuide.slug}`}>Read this guide <ArrowRight aria-hidden="true" size={16} /></Link></div>
            </article> : null}
            <div className={styles.guideCards}>
              {supportingGuides.map((guide) => { const Icon = iconMap[guide.slug]; return <article key={guide.slug}><Link className={styles.guideCardImage} href={`/guides/${guide.slug}`}><ResilientImage src={guide.image} alt={guide.imageAlt} fill sizes="(max-width: 680px) 100vw, 33vw" fallback={<span className={styles.guideImageFallback} role="img" aria-label="Guide image unavailable">Image coming soon</span>} /></Link><div className={styles.guideCardCopy}><span><Icon aria-hidden="true" size={18} /> {guide.readTime}</span><h2 className="font-display"><Link href={`/guides/${guide.slug}`}>{guide.title}</Link></h2><p>{guide.summary}</p><Link href={`/guides/${guide.slug}`}>Read the guide <ArrowRight aria-hidden="true" size={16} /></Link></div></article>; })}
            </div>
          </div>
        </section>

        <section className={styles.hubCta}>
          <div className="site-container"><Sparkles aria-hidden="true" size={26} /><p className={styles.eyebrow}>Still deciding?</p><h2 className="font-display">A guide can inform you. A conversation can guide you personally.</h2><div><Link className={buttonClassName({ size: "lg" })} href="/shop">Explore the collection <ArrowRight aria-hidden="true" size={18} /></Link><Link className={buttonClassName({ variant: "outline", size: "lg" })} href="/custom-murti">Discuss a custom murti</Link></div></div>
        </section>
      </main>
      <SiteFooter />
      
      <CookieConsent />
    </ToastProvider>
  );
}
