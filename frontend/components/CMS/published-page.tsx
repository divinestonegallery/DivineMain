// @ts-nocheck
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { WhatsAppAssistance } from "@/components/common/whatsapp-assistance";
import { ToastProvider } from "@/components/ui/toast";
import type { PublishedPage, PublishedSection } from "@/api/cms/public-repository";
import styles from "./published-page.module.css";

type Item = { title?: string; body?: string; href?: string; image?: string };
const devotion: Item[] = [
  { title: "Radha Krishna", body: "Grace in eternal union", href: "/shop?q=Radha%20Krishna", image: "/catalog/radha-krishna-39.jpg" },
  { title: "Ganesha", body: "The auspicious beginning", href: "/shop?q=Ganesha", image: "/catalog/ganesh-24.jpg" },
  { title: "Shiva Parivar", body: "Harmony, strength and devotion", href: "/shop?q=Shiva", image: "/catalog/gauri-shankar-18.jpg" },
  { title: "Lakshmi", body: "Prosperity with sacred beauty", href: "/shop?q=Lakshmi", image: "/catalog/lakshmi-24.jpg" },
];
const featured: Item[] = [
  { title: "Radha Krishna Moorti", body: "39 in · Hand-painted white marble", href: "/products/radha-krishna-39-inch-marble", image: "/catalog/radha-krishna-39.jpg" },
  { title: "Sri Ornate Ganesha", body: "24 in · Makrana marble", href: "/products/ornate-ganesh-24-inch-marble", image: "/catalog/ganesh-24.jpg" },
  { title: "Gauri Shankar Family", body: "18 in · Hand-carved marble", href: "/products/gauri-shankar-family-18-inch-marble", image: "/catalog/gauri-shankar-18.jpg" },
];
const fallbackImages: Record<string, string> = { hero: "/catalog/radha-krishna-39.jpg", "custom-commission": "/catalog/ram-darbar-24.jpg", "family-legacy": "/catalog/lakshmi-ganesh-saraswati-12.jpg" };

function items(section: PublishedSection) {
  const fallback = section.sectionKey === "shop-by-devotion" ? devotion : section.sectionKey === "featured-works" ? featured : [];
  try { const parsed = JSON.parse(section.contentJson) as unknown; return Array.isArray(parsed) && parsed.length ? parsed.slice(0, 30) as Item[] : fallback; }
  catch { return fallback; }
}
function customerFacingLabel(label: string) {
  return /^commission a (murti|moorti)$/i.test(label.trim()) ? "Customize Your Moorti" : label;
}

function action(label: string | null, href: string | null, secondary = false) { return label && href ? <Link className={secondary ? styles.secondary : styles.primary} href={href}>{customerFacingLabel(label)}<ArrowRight size={15} /></Link> : null; }

function Block({ section, first, homeHero }: { section: PublishedSection; first: boolean; homeHero: boolean }) {
  const rows = items(section); const image = section.mediaPath ?? fallbackImages[section.sectionKey] ?? (first ? fallbackImages.hero : null);
  if (section.blockType === "hero") return (
    <section className={`${styles.hero} ${homeHero ? styles.videoHero : ""}`} data-tone={section.styleVariant}>
      {homeHero ? (
        <>
          <video
            className={styles.heroVideo}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster="/brand/home-hero-poster.jpg"
            aria-hidden="true"
            tabIndex={-1}
          >
            <source src="/brand/home-hero.mp4" type="video/mp4" />
          </video>
          <span className={styles.heroVeil} aria-hidden="true" />
        </>
      ) : null}
      <div className="site-container">
        <div className={styles.heroCopy}>
          <small>{section.eyebrow}</small>
          <h1 className="font-display">{section.heading}</h1>
          <p>{section.body}</p>
          <div className={styles.actions}>{action(section.ctaLabel, section.ctaHref)}{action(section.secondaryCtaLabel, section.secondaryCtaHref, true)}</div>
          <span className={styles.proof}><Sparkles size={16} />Fourth-generation marble atelier · Alwar, Rajasthan</span>
        </div>
        {!homeHero && image ? <div className={styles.heroImage}><Image src={image} alt={section.mediaAltText ?? section.heading ?? "Divine Stone Gallery marble moorti"} fill loading="eager" sizes="(max-width: 850px) 100vw, 48vw" /></div> : null}
      </div>
    </section>
  );
  if (section.blockType === "collection" || section.blockType === "feature_grid" || section.blockType === "faq") return <section className={styles.section} data-tone={section.styleVariant}><div className="site-container"><header className={styles.heading}><div><small>{section.eyebrow}</small><h2 className="font-display">{section.heading}</h2></div><p>{section.body}</p></header><div className={section.blockType === "faq" ? styles.faq : styles.cards}>{rows.map((item, index) => { const content = <>{item.image ? <span className={styles.cardImage}><Image src={item.image} alt={item.title ?? ""} fill sizes="(max-width: 700px) 50vw, 25vw" /></span> : null}<strong className="font-display">{item.title}</strong><p>{item.body}</p></>; return item.href ? <Link href={item.href} key={`${item.title}-${index}`}>{content}</Link> : <article key={`${item.title}-${index}`}>{content}</article>; })}</div><div className={styles.sectionAction}>{action(section.ctaLabel, section.ctaHref)}</div></div></section>;
  return <section className={styles.split} data-tone={section.styleVariant} data-media={section.mediaPosition}><div className="site-container">{image ? <div className={styles.splitImage}><Image src={image} alt={section.mediaAltText ?? section.heading ?? "Marble sculpture"} fill sizes="(max-width: 850px) 100vw, 48vw" /></div> : null}<div className={styles.splitCopy}><small>{section.eyebrow}</small><h2 className="font-display">{section.heading}</h2><p>{section.body}</p><div className={styles.actions}>{action(section.ctaLabel, section.ctaHref)}{action(section.secondaryCtaLabel, section.secondaryCtaHref, true)}</div></div></div></section>;
}

export function PublishedPageView({ page, animateLogo = false, protectedContent }: { page: PublishedPage; animateLogo?: boolean; protectedContent?: ReactNode }) {
  return <ToastProvider><SiteHeader animateLogo={animateLogo} /><main id="main-content" tabIndex={-1}>{page.sections.map((section, index) => <Block section={section} first={index === 0} homeHero={page.slug === "home" && index === 0} key={section.id} />)}{protectedContent}</main><SiteFooter /><WhatsAppAssistance elevated={page.slug === "home"} /><CookieConsent /></ToastProvider>;
}
