import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, BookOpen, MessageCircle, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { WhatsAppAssistance } from "@/components/common/whatsapp-assistance";
import { buttonClassName } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import { getGuide, guides } from "@/components/Guides/guide-data";
import styles from "../guides.module.css";

type GuidePageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "Murti Guide" };
  return { title: guide.title, description: guide.summary, alternates: { canonical: `/guides/${guide.slug}` } };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const related = guides.filter((item) => item.slug !== guide.slug);

  return (
    <ToastProvider>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.articleHero}>
          <div className="site-container">
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Guides", href: "/guides" }, { label: guide.eyebrow }]} />
            <div className={styles.articleHeroGrid}>
              <div className={styles.articleHeroCopy}><p className={styles.eyebrow}>{guide.eyebrow}</p><h1 className="font-display">{guide.title}</h1><p>{guide.summary}</p><span><BookOpen aria-hidden="true" size={17} /> {guide.readTime}</span></div>
              <div className={styles.articleHeroImage}><Image src={guide.image} alt={guide.imageAlt} fill priority sizes="(max-width: 900px) 100vw, 48vw" /></div>
            </div>
          </div>
        </section>

        <section className={styles.highlightsSection} aria-label="Guide at a glance">
          <div className={`${styles.highlightsGrid} site-container`}>
            {guide.highlights.map((item, index) => <article key={item.label}><span>{String(index + 1).padStart(2, "0")}</span><strong className="font-display">{item.value}</strong><h2>{item.label}</h2><p>{item.copy}</p></article>)}
          </div>
        </section>

        <section className={styles.articleBody}>
          <div className={`${styles.articleBodyGrid} site-container`}>
            <aside><span>In this guide</span>{guide.sections.map((section, index) => <a href={`#section-${index + 1}`} key={section.title}>{String(index + 1).padStart(2, "0")} · {section.title}</a>)}<Link href="/guides">All guides <ArrowRight aria-hidden="true" size={15} /></Link></aside>
            <div className={styles.articleSections}>
              {guide.sections.map((section, index) => (
                <section id={`section-${index + 1}`} key={section.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h2 className="font-display">{section.title}</h2>
                  <p>{section.copy}</p>
                  <ul>{section.bullets.map((bullet) => <li key={bullet}><BadgeCheck aria-hidden="true" size={18} /> {bullet}</li>)}</ul>
                </section>
              ))}
              <div className={styles.guideNote}><Sparkles aria-hidden="true" size={21} /><span><strong>Keep in mind</strong><p>{guide.note}</p></span></div>
            </div>
          </div>
        </section>

        <section className={styles.articleCta}>
          <div className="site-container"><MessageCircle aria-hidden="true" size={25} /><p className={styles.eyebrow}>Personal gallery assistance</p><h2 className="font-display">Have a question about your murti or space?</h2><p>Send the gallery a photo, measurement or product link and we will help you understand the next step.</p><a className={buttonClassName({ size: "lg" })} href="https://wa.me/919166138566?text=Namaste%2C%20I%20have%20a%20question%20after%20reading%20one%20of%20your%20murti%20guides." target="_blank" rel="noreferrer">Ask on WhatsApp <ArrowRight aria-hidden="true" size={18} /></a></div>
        </section>

        <section className={styles.relatedGuides}>
          <div className="site-container"><div className={styles.relatedHeading}><div><p className={styles.eyebrow}>Continue learning</p><h2 className="font-display">Related guides</h2></div><Link href="/guides">View guidebook <ArrowRight aria-hidden="true" size={16} /></Link></div><div>{related.map((item) => <Link href={`/guides/${item.slug}`} key={item.slug}><span>{item.eyebrow}</span><strong className="font-display">{item.title}</strong><small>{item.readTime}</small><ArrowRight aria-hidden="true" size={18} /></Link>)}</div></div>
        </section>
      </main>
      <SiteFooter />
      <WhatsAppAssistance />
      <CookieConsent />
    </ToastProvider>
  );
}
