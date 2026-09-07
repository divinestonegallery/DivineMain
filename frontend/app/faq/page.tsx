import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CircleHelp, Gem, MessageCircle, PackageCheck, Sparkles } from "lucide-react";
import { getFAQs, type FAQGroups, type FAQItem } from "@/api/faq";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { buttonClassName } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import styles from "./faq.module.css";

export const metadata: Metadata = { title: "Frequently Asked Questions", description: "Answers about Divine Stone Gallery marble murtis, custom commissions, pricing, packing, delivery and care.", alternates: { canonical: "/faq" } };
export const dynamic = "force-dynamic";

const groupDetails: Record<string, { icon: LucideIcon; intro: string }> = {
  "choosing a murti": { icon: Gem, intro: "Products, materials and finding the right form." },
  "custom commissions": { icon: Sparkles, intro: "Creating a sacred work around your requirements." },
  "packing, delivery and care": { icon: PackageCheck, intro: "What happens after a work is selected." },
  general: { icon: CircleHelp, intro: "Helpful answers from the gallery team." },
};

type FAQGroup = {
  title: string;
  icon: LucideIcon;
  intro: string;
  items: AccordionItem[];
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function detailFor(title: string) {
  return groupDetails[title.trim().toLowerCase()] ?? groupDetails.general;
}

function isDisplayableFAQ(item: FAQItem) {
  return Boolean(cleanText(item.question) && cleanText(item.answer));
}

function toAccordionItem(item: FAQItem, groupTitle: string, index: number): AccordionItem {
  return {
    id: String(item.id ?? `${groupTitle}-${index}`),
    title: cleanText(item.question),
    content: <p>{cleanText(item.answer)}</p>,
  };
}

function groupsFromResponse(response: FAQGroups): FAQGroup[] {
  return Object.entries(response ?? {})
    .map(([rawTitle, rawItems]) => {
      const title = cleanText(rawTitle) || "General";
      const detail = detailFor(title);
      return {
        title,
        icon: detail.icon,
        intro: detail.intro,
        items: Array.isArray(rawItems)
          ? rawItems.filter(isDisplayableFAQ).map((item, index) => toAccordionItem(item, title, index))
          : [],
      };
    })
    .filter((group) => group.items.length);
}

function FAQShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero}>
          <div className="site-container">
            <div className={styles.heroInner}>
              <p className={styles.eyebrow}>Gallery assistance</p>
              <h1 className="font-display">Questions, answered simply.</h1>
              <p>Helpful starting answers about choosing, commissioning and caring for a marble murti. For a product-specific answer, speak directly with our gallery.</p>
            </div>
          </div>
        </section>
        <section className={styles.faqSection}>
          <div className="site-container">{children}</div>
        </section>
        <section className={styles.cta}>
          <div className="site-container">
            <MessageCircle aria-hidden="true" size={26} />
            <p className={styles.eyebrow}>Still have a question?</p>
            <h2 className="font-display">Ask our gallery about your specific work or space.</h2>
            <div>
              <Link className={buttonClassName({ size: "lg" })} href="/contact">Contact the gallery <ArrowRight aria-hidden="true" size={18} /></Link>
              <a className={buttonClassName({ variant: "outline", size: "lg" })} href="https://wa.me/919166138566?text=Namaste%2C%20I%20have%20a%20question%20about%20a%20marble%20murti." target="_blank" rel="noreferrer">Ask on WhatsApp</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <CookieConsent />
    </ToastProvider>
  );
}

function FAQState({ title, message }: { title: string; message: string }) {
  return (
    <section className={styles.faqGroup}>
      <div>
        <CircleHelp aria-hidden="true" size={24} />
        <h2 className="font-display">{title}</h2>
        <p>{message}</p>
      </div>
      <div className={styles.stateCard} role="status">{message}</div>
    </section>
  );
}

export default async function FaqPage() {
  let groups: FAQGroup[] = [];
  let hasError = false;

  try {
    groups = groupsFromResponse(await getFAQs());
  } catch {
    hasError = true;
  }

  return (
    <FAQShell>
      {hasError ? <FAQState title="FAQs" message="Unable to load FAQs. Please try again later." /> : null}
      {!hasError && groups.length ? groups.map(({ icon: Icon, title, intro, items }) => (
        <section className={styles.faqGroup} key={title}>
          <div>
            <Icon aria-hidden="true" size={24} />
            <h2 className="font-display">{title}</h2>
            <p>{intro}</p>
          </div>
          <Accordion items={items} />
        </section>
      )) : null}
      {!hasError && !groups.length ? <FAQState title="FAQs" message="No FAQs available at the moment." /> : null}
    </FAQShell>
  );
}
