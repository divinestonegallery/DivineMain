// @ts-nocheck
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Gem,
  HandHeart,
  MapPin,
  PackageCheck,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { WhatsAppAssistance } from "@/components/common/whatsapp-assistance";
import { buttonClassName } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import { brand } from "@/src/config/brand";
import { getPublishedPage } from "@/api/cms/public-repository";
import { PublishedPageView } from "@/components/CMS/published-page";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("home");
  return { title: page?.seoTitle ? { absolute: page.seoTitle } : undefined, description: page?.seoDescription ?? "Discover authentic hand-carved marble moorties by fourth-generation master moortikars from Alwar, Rajasthan.", alternates: { canonical: "/" } };
}
export const dynamic = "force-dynamic";

const deityCollections = [
  {
    name: "Radha Krishna",
    note: "Grace in eternal union",
    image: "/catalog/radha-krishna-39.jpg",
    href: "/shop?q=Radha%20Krishna",
  },
  {
    name: "Ganesha",
    note: "The auspicious beginning",
    image: "/catalog/ganesh-24.jpg",
    href: "/shop?q=Ganesha",
  },
  {
    name: "Shiva Parivar",
    note: "Harmony, strength and devotion",
    image: "/catalog/gauri-shankar-18.jpg",
    href: "/shop?q=Shiva",
  },
  {
    name: "Lakshmi",
    note: "Prosperity with sacred beauty",
    image: "/catalog/lakshmi-24.jpg",
    href: "/shop?q=Lakshmi",
  },
  {
    name: "Saraswati",
    note: "Wisdom rendered in marble",
    image: "/catalog/saraswati-18.jpg",
    href: "/shop?q=Saraswati",
  },
  {
    name: "Ram Darbar",
    note: "The ideal divine family",
    image: "/catalog/ram-darbar-24.jpg",
    href: "/shop?q=Ram%20Darbar",
  },
] as const;

const featuredWorks = [
  {
    name: "Radha Krishna Moorti",
    detail: "39 in · Hand-painted white marble",
    image: "/catalog/radha-krishna-39.jpg",
    href: "/products/radha-krishna-39-inch-marble",
  },
  {
    name: "Sri Ornate Ganesha",
    detail: "24 in · Makrana marble",
    image: "/catalog/ganesh-24.jpg",
    href: "/products/ornate-ganesh-24-inch-marble",
  },
  {
    name: "Gauri Shankar Family",
    detail: "18 in · Hand-carved marble",
    image: "/catalog/gauri-shankar-18.jpg",
    href: "/products/gauri-shankar-family-18-inch-marble",
  },
  {
    name: "Shrinathji Wall Sculpture",
    detail: "27 in · Hand-painted marble",
    image: "/catalog/shreenathji-wall-27.jpg",
    href: "/products/shrinathji-wall-sculpture-27-inch",
  },
] as const;

const commissionSteps = [
  {
    number: "01",
    title: "Share your vision",
    copy: "Tell us the deity, dimensions, marble, posture and setting you have in mind.",
  },
  {
    number: "02",
    title: "Approve the design",
    copy: "We refine the proportions, ornamentation and finish with you before carving begins.",
  },
  {
    number: "03",
    title: "Follow the creation",
    copy: "Receive milestone updates as your moorti is carved, painted, finished and prepared for delivery.",
  },
] as const;

function StaticHome() {
  return (
    <ToastProvider>
      <SiteHeader animateLogo />
      <main id="main-content" tabIndex={-1}>
        <section className={`${styles.hero} ${styles.videoHero}`}>
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
          <div className={`${styles.heroInner} site-container`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>From Alwar, Rajasthan · Since 1960</p>
              <h1 className="font-display">
                Sacred forms,
                {" "}<span>carved for generations.</span>
              </h1>
              <p className={styles.heroLead}>
                Authentic hand-carved marble moorties shaped by fourth-generation master moortikars and guided by the principles of Shilp Shastra.
              </p>
              <div className={styles.heroActions}>
                <Link className={buttonClassName({ size: "lg" })} href="/shop">
                  Explore moorties <ArrowRight aria-hidden="true" size={18} />
                </Link>
                <Link className={buttonClassName({ variant: "outline", size: "lg" })} href="/custom-murti">
                  Customize Your Moorti
                </Link>
              </div>
              <div className={styles.heroProof}>
                <span><BadgeCheck aria-hidden="true" size={18} /> Fourth-generation atelier</span>
                <span><ShieldCheck aria-hidden="true" size={18} /> Secure delivery</span>
              </div>
            </div>

          </div>
        </section>
        <div className={`${styles.trustBar} site-container`}>
          <div><strong>1960</strong><span>Family legacy established</span></div>
          <div><strong>4th</strong><span>Generation of moortikars</span></div>
          <div><strong>Shilp Shastra</strong><span>Sacred proportions respected</span></div>
          <div><strong>India-wide</strong><span>Protective crated delivery</span></div>
        </div>

        <section className={styles.collectionSection}>
          <div className="site-container">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Shop by devotion</p>
                <h2 className="font-display">Find the form that speaks to you.</h2>
              </div>
              <p>Explore signature forms for home mandirs, temples, gifting and deeply personal commissions.</p>
            </div>
            <div className={styles.deityGrid}>
              {deityCollections.map((collection) => (
                <Link className={styles.deityCard} href={collection.href} key={collection.name}>
                  <Image src={collection.image} alt={`${collection.name} marble moorti collection`} fill sizes="(max-width: 680px) 50vw, (max-width: 1024px) 33vw, 17vw" />
                  <span className={styles.imageVeil} />
                  <span className={styles.deityCardCopy}>
                    <strong className="font-display">{collection.name}</strong>
                    <small>{collection.note}</small>
                  </span>
                  <span className={styles.cardArrow} aria-hidden="true"><ArrowRight size={17} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.featuredSection}>
          <div className="site-container">
            <div className={styles.sectionHeadingRow}>
              <div>
                <p className={styles.eyebrow}>From our gallery</p>
                <h2 className="font-display">Featured works</h2>
              </div>
              <Link href="/shop">View the collection <ArrowRight aria-hidden="true" size={17} /></Link>
            </div>
            <div className={styles.featuredGrid}>
              {featuredWorks.map((work, index) => (
                <article className={styles.workCard} key={work.name}>
                  <Link className={styles.workImage} href={work.href} aria-label={`View ${work.name}`}>
                    <Image src={work.image} alt={work.name} fill sizes="(max-width: 680px) 50vw, (max-width: 1024px) 33vw, 25vw" priority={index === 0} />
                  </Link>
                  <div className={styles.workInfo}>
                    <span>{work.detail}</span>
                    <h3 className="font-display">{work.name}</h3>
                    <Link href={work.href}>View details <ArrowRight aria-hidden="true" size={15} /></Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.customSection}>
          <div className={`${styles.customGrid} site-container`}>
            <div className={styles.customImage}>
              <Image
                src="/catalog/ram-darbar-24.jpg"
                alt="Complete 24-inch Ram Darbar marble moorti set"
                fill
                sizes="(max-width: 900px) 100vw, 54vw"
              />
            </div>
            <div className={styles.customCopy}>
              <p className={styles.eyebrow}>Created only for you</p>
              <h2 className="font-display">A sacred commission, shaped around your vision.</h2>
              <p>
                From a home mandir idol to a large temple installation, our family works with you on scale, expression, posture, marble and ornamentation.
              </p>
              <ul>
                <li><Ruler aria-hidden="true" size={18} /> Made to your dimensions</li>
                <li><Gem aria-hidden="true" size={18} /> Marble and finish guidance</li>
                <li><HandHeart aria-hidden="true" size={18} /> Personal milestone updates</li>
              </ul>
              <Link className={buttonClassName({ variant: "secondary", size: "lg" })} href="/custom-murti">
                Begin a consultation <ArrowRight aria-hidden="true" size={18} />
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.processSection}>
          <div className="site-container">
            <div className={styles.processIntro}>
              <div>
                <p className={styles.eyebrow}>The commission journey</p>
                <h2 className="font-display">Clear, personal and considered.</h2>
              </div>
              <p>One gallery advisor stays with you from the first conversation to the final delivery.</p>
            </div>
            <div className={styles.processGrid}>
              {commissionSteps.map((step) => (
                <article key={step.number}>
                  <span>{step.number}</span>
                  <Sparkles aria-hidden="true" size={22} strokeWidth={1.4} />
                  <h3 className="font-display">{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.heritageSection}>
          <div className={`${styles.heritageGrid} site-container`}>
            <div className={styles.heritageCopy}>
              <p className={styles.eyebrow}>Our family legacy</p>
              <h2 className="font-display">Four generations of faith, patience and precision.</h2>
              <p>
                Divine Stone Gallery continues the tradition of Agnihotri Moorti Art, established in 1960. Every work carries forward a family language of proportion, expression and sensitive hand-finishing.
              </p>
              <div className={styles.heritageLocation}>
                <MapPin aria-hidden="true" size={20} />
                <span><strong>Alwar, Rajasthan</strong><small>Our family atelier and gallery</small></span>
              </div>
              <Link href="/our-story">Discover our story <ArrowRight aria-hidden="true" size={17} /></Link>
            </div>
            <div className={styles.heritageImage}>
              <Image src="/catalog/lakshmi-ganesh-saraswati-12.jpg" alt="Lakshmi, Ganesha and Saraswati marble moorties arranged in a devotional setting" fill sizes="(max-width: 900px) 100vw, 50vw" />
            </div>
          </div>
        </section>

        <section className={styles.assuranceSection} aria-label="Our service promise">
          <div className={`${styles.assuranceGrid} site-container`}>
            <div><BadgeCheck aria-hidden="true" /><span><strong>Authentic craftsmanship</strong><small>Hand-carved by experienced moortikars</small></span></div>
            <div><ShieldCheck aria-hidden="true" /><span><strong>Thoughtful guidance</strong><small>Help with deity, scale, stone and placement</small></span></div>
            <div><PackageCheck aria-hidden="true" /><span><strong>Protective packing</strong><small>Purpose-built crating for safe delivery</small></span></div>
            <div><HandHeart aria-hidden="true" /><span><strong>Personal assistance</strong><small>Speak directly with our gallery team</small></span></div>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div className="site-container">
            <p className={styles.eyebrow}>A more personal way to choose</p>
            <h2 className="font-display">Let us help you find the right moorti.</h2>
            <p>Share your space, preferred deity and approximate size. Our gallery will guide you from there.</p>
            <div>
              <a className={buttonClassName({ size: "lg" })} href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20help%20choosing%20a%20moorti." target="_blank" rel="noreferrer">
                Chat on WhatsApp <ArrowRight aria-hidden="true" size={18} />
              </a>
              <a className={buttonClassName({ variant: "outline", size: "lg" })} href="tel:+919166138566">Call {brand.phone}</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <WhatsAppAssistance elevated />
      <CookieConsent />
    </ToastProvider>
  );
}

export default async function Home() {
  const page = await getPublishedPage("home");
  return page?.sections.length ? <PublishedPageView page={page} animateLogo /> : <StaticHome />;
}
