import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Gem, HandHeart, MessageCircle, PackageCheck, Ruler } from "lucide-react";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { buttonClassName } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import { ConsultationForm } from "@/components/CustomMurti/consultation-form";
import styles from "./custom-murti.module.css";

export const metadata: Metadata = {
  title: "Customize Your Moorti",
  description: "Share your custom stone moorti requirements with Divine Stone Gallery's artisan team.",
  alternates: { canonical: "/custom-murti" },
};

const features = [
  { icon: Ruler, title: "Custom Dimensions", copy: "Sized for your mandir, temple or sacred space." },
  { icon: HandHeart, title: "Handcrafted by Artisans", copy: "Guided by our fourth-generation moortikar family." },
  { icon: Gem, title: "Premium Stone Selection", copy: "Material guidance matched to your vision." },
  { icon: PackageCheck, title: "Made to Your Requirements", copy: "Details refined before carving begins." },
] as const;

const whatsappHref = "https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20to%20discuss%20a%20custom%20moorti.";

export default function CustomMurtiPage() {
  return (
    <ToastProvider>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.customizeSection}>
          <div className={`${styles.customizeLayout} site-container`}>
            <div className={styles.customizeIntro}>
              <p className={styles.eyebrow}>Turn Imagination into Reality</p>
              <h1 className="font-display">Customize Your Moorti</h1>
              <p className={styles.lede}>
                Have a specific vision in mind? Share your requirements with us and our artisans will help bring your customized stone moorti to life.
              </p>
              <ul className={styles.featureList}>
                {features.map(({ icon: Icon, title, copy }) => (
                  <li key={title}>
                    <span><Icon aria-hidden="true" size={18} /></span>
                    <strong>{title}</strong>
                    <small>{copy}</small>
                  </li>
                ))}
              </ul>
              <div className={styles.assistStrip}>
                <BadgeCheck aria-hidden="true" size={18} />
                <span>Prefer to talk first?</span>
                <a className={buttonClassName({ variant: "outline", size: "sm" })} href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle aria-hidden="true" size={16} /> WhatsApp <ArrowRight aria-hidden="true" size={15} />
                </a>
              </div>
            </div>

            <ConsultationForm />
          </div>
        </section>
      </main>
      <SiteFooter />
      <CookieConsent />
    </ToastProvider>
  );
}
