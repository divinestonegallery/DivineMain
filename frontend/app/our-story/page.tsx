// @ts-nocheck
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Gem,
  HandHeart,
  Landmark,
  MapPin,
  Ruler,
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
import styles from "./our-story.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("our-story");
  return { title: page?.seoTitle ? { absolute: page.seoTitle } : "Our Story | Four Generations of Marble Murti Craft", description: page?.seoDescription ?? "Discover the family heritage behind Divine Stone Gallery, continuing the tradition of Agnihotri Moorti Art established in Alwar, Rajasthan in 1960.", alternates: { canonical: "/our-story" } };
}
export const dynamic = "force-dynamic";

const values = [
  {
    icon: HandHeart,
    title: "Devotion before decoration",
    copy: "A sacred form must carry feeling as carefully as it carries ornamentation.",
  },
  {
    icon: Ruler,
    title: "Proportion with purpose",
    copy: "Scale, posture and balance are considered in relation to the deity and intended sacred space.",
  },
  {
    icon: Gem,
    title: "Respect for the material",
    copy: "The character of the marble guides how every curve, expression and finish is approached.",
  },
  {
    icon: Sparkles,
    title: "Patience in every detail",
    copy: "Handwork is given the time needed for a calm expression and a considered finish.",
  },
] as const;

function StaticOurStoryPage() {
  return (
    <ToastProvider>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero}>
          <div className="site-container">
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Our Story" }]} />
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>Our family legacy</p>
                <h1 className="font-display">Carved across{" "}<span>four generations.</span></h1>
                <p>
                  Divine Stone Gallery continues the family tradition of Agnihotri Moorti Art, established in 1960 in Alwar, Rajasthan—a practice shaped by devotion, patience and precision.
                </p>
                <div className={styles.heroLocation}>
                  <MapPin aria-hidden="true" size={19} />
                  <span><strong>Alwar, Rajasthan</strong><small>Our family atelier and gallery</small></span>
                </div>
              </div>

              <div className={styles.heroVisual}>
                <div className={styles.heroImage}>
                  <Image src="/brand/krishna-cow-marble.jpg" alt="Hand-carved marble Krishna with cow by Divine Stone Gallery" fill priority sizes="(max-width: 900px) 100vw, 48vw" />
                </div>
                <div className={styles.yearSeal}><strong className="font-display">1960</strong><span>A family tradition begins</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.legacySection}>
          <div className={`${styles.legacyGrid} site-container`}>
            <div className={styles.legacyIntro}>
              <p className={styles.eyebrow}>The thread that continues</p>
              <h2 className="font-display">A new identity, rooted in an enduring practice.</h2>
            </div>
            <div className={styles.legacyStory}>
              <p>
                What began as Agnihotri Moorti Art in 1960 continues today under the name Divine Stone Gallery. The identity is new; the family commitment to sacred sculpture remains the foundation.
              </p>
              <p>
                Across four generations, knowledge has been carried through practice: understanding the marble, observing proportion, shaping expression and knowing that the smallest detail can change the feeling of the whole form.
              </p>
              <blockquote className="font-display">
                “The name moves forward. The devotion within the work remains.”
              </blockquote>
            </div>
          </div>

          <div className={`${styles.timeline} site-container`} aria-label="Divine Stone Gallery heritage timeline">
            <article><span>01</span><strong className="font-display">1960</strong><h3>Agnihotri Moorti Art is established</h3><p>The family sculpture legacy begins in Rajasthan.</p></article>
            <article><span>02</span><strong className="font-display">Four generations</strong><h3>Knowledge passes through practice</h3><p>Methods of proportion, expression and hand-finishing continue within the family.</p></article>
            <article><span>03</span><strong className="font-display">Today</strong><h3>Divine Stone Gallery</h3><p>The tradition continues under a new identity, serving homes, temples and custom commissions.</p></article>
          </div>
        </section>

        <section className={styles.shastraSection}>
          <div className={`${styles.shastraGrid} site-container`}>
            <div className={styles.shastraImage}>
              <Image src="/catalog/ganesh-24.jpg" alt="Ornate Ganesha marble moorti demonstrating balanced sacred form" fill sizes="(max-width: 900px) 100vw, 48vw" />
            </div>
            <div className={styles.shastraCopy}>
              <Landmark aria-hidden="true" size={28} />
              <p className={styles.eyebrow}>Guided by Shilp Shastra</p>
              <h2 className="font-display">Sacred proportion gives form its presence.</h2>
              <p>
                Our work is designed in accordance with the sacred principles of Shilp Shastra. Proportion is not treated as a surface detail; it informs the stance, balance and visual harmony of the murti.
              </p>
              <div>
                <span><BadgeCheck aria-hidden="true" size={18} /> Considered proportions</span>
                <span><BadgeCheck aria-hidden="true" size={18} /> Devotional expression</span>
                <span><BadgeCheck aria-hidden="true" size={18} /> Hand-finished detail</span>
              </div>
              <Link href="/artisans">Meet our craft tradition <ArrowRight aria-hidden="true" size={17} /></Link>
            </div>
          </div>
        </section>

        <section className={styles.valuesSection}>
          <div className="site-container">
            <div className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}>What guides the work</p><h2 className="font-display">Principles we carry forward.</h2></div>
              <p>The legacy is visible not only in what we make, but in how each decision is approached.</p>
            </div>
            <div className={styles.valuesGrid}>
              {values.map(({ icon: Icon, title, copy }, index) => (
                <article key={title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <Icon aria-hidden="true" size={24} />
                  <h3 className="font-display">{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.identitySection}>
          <div className="site-container">
            <div className={styles.identityImage}>
              <Image src="/brand/brand-cover.jpg" alt="Divine Stone Gallery identity and hand-carved Krishna marble moorti" fill sizes="100vw" />
            </div>
            <div className={styles.identityCopy}>
              <div><p className={styles.eyebrow}>Divine Stone Gallery</p><h2 className="font-display">The next chapter of a family tradition.</h2></div>
              <p>Created to bring our heritage, gallery guidance and hand-carved marble work to more sacred spaces—without losing the personal relationship at the heart of a commission.</p>
            </div>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div className="site-container">
            <p className={styles.eyebrow}>Continue the story with us</p>
            <h2 className="font-display">Find a sacred work—or begin one of your own.</h2>
            <div>
              <Link className={buttonClassName({ size: "lg" })} href="/shop">Explore the gallery <ArrowRight aria-hidden="true" size={18} /></Link>
              <Link className={buttonClassName({ variant: "outline", size: "lg" })} href="/custom-murti">Customize Your Moorti</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <WhatsAppAssistance />
      <CookieConsent />
    </ToastProvider>
  );
}

export default async function OurStoryPage() {
  const page = await getPublishedPage("our-story");
  return page?.sections.length ? <PublishedPageView page={page} /> : <StaticOurStoryPage />;
}
