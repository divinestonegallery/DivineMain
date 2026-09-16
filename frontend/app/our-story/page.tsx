// @ts-nocheck
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { ToastProvider } from "@/components/ui/toast";
import { getPublishedPage } from "@/api/cms/public-repository";
import { PublishedPageView } from "@/components/CMS/published-page";
import { AboutHero } from "./components/about-hero";
import { OurStorySection } from "./components/our-story-section";
import { VisionSection } from "./components/vision-section";
import { MissionSection } from "./components/mission-section";
import { LeadershipSection } from "./components/leadership-section";
import styles from "./our-story.module.css";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("our-story");
  return { 
    title: page?.seoTitle ? { absolute: page.seoTitle } : "Our Story | Divine Stone Gallery", 
    description: page?.seoDescription ?? "Discover the family heritage, vision, and craftsmanship behind Divine Stone Gallery.", 
    alternates: { canonical: "/our-story" } 
  };
}

export const dynamic = "force-dynamic";

function StaticOurStoryPage() {
  return (
    <ToastProvider>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <div className="site-container" style={{ paddingTop: 'clamp(2rem, 5vw, 4rem)' }}>
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Our Story" }]} />
        </div>

        <AboutHero />
        <OurStorySection />
        <VisionSection />
        <MissionSection />
        <LeadershipSection />

        <section className={styles.finalCta} style={{ paddingBlock: 'clamp(5rem, 9vw, 8rem)', textAlign: 'center', background: 'var(--background)' }}>
          <div className="site-container">
            <p className={styles.eyebrow}>Continue the story with us</p>
            <h2 className="font-display" style={{ maxWidth: '880px', marginInline: 'auto', fontSize: 'clamp(3rem, 5vw, 5.5rem)', margin: '0 0 1.5rem', lineHeight: 1 }}>
              Find a sacred work—or begin one of your own.
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem', marginTop: '1.7rem' }}>
              <Link className={buttonClassName({ size: "lg" })} href="/shop">Explore the gallery <ArrowRight aria-hidden="true" size={18} /></Link>
              <Link className={buttonClassName({ variant: "outline", size: "lg" })} href="/custom-murti">Customize Your Moorti</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <CookieConsent />
    </ToastProvider>
  );
}

export default async function OurStoryPage() {
  const page = await getPublishedPage("our-story");
  return page?.sections.length ? <PublishedPageView page={page} /> : <StaticOurStoryPage />;
}
