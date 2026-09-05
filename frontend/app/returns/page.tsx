// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, legalPageStyles as styles } from "@/components/common/legal-page";
import { getPublicBusinessDetails } from "@/src/config/business";

export const metadata: Metadata = {
  title: "Returns & Damage Guidance",
  description: "Return, cancellation and arrival-damage guidance for Divine Stone Gallery marble works.",
  alternates: { canonical: "/returns" },
};

export default function ReturnsPage() {
  const business = getPublicBusinessDetails();
  return (
    <LegalPage title="Returns & damage guidance" eyebrow="Before and after delivery" intro="Marble works require order-specific arrangements. Review the written quotation and contact the gallery promptly if something is not as agreed.">
      <section><h2 className="font-display">Order-specific terms</h2><p>Eligibility for cancellation, return, replacement or refund depends on whether the work is ready-made or commissioned, its condition, delivery arrangement and the written terms accepted for that order. {business.readyMadeReturnWindowDays ? `Where an approved ready-made return applies, contact the gallery within ${business.readyMadeReturnWindowDays} days of delivery. ` : ""}Do not assume a return is available until the gallery confirms it in writing.</p></section>
      <section><h2 className="font-display">Custom commissions</h2><p>Commissioned work is created to approved requirements and may not be suitable for resale. Cancellation and change requests are therefore handled according to the agreed stage of work, costs already incurred and the written commission terms.</p></section>
      <section><h2 className="font-display">Inspecting delivery</h2><ul><li>Inspect the outer packing before moving or installing the work.</li><li>Photograph labels, packaging and any visible issue clearly.</li><li>Keep all packaging and protective material.</li><li>Contact the gallery before attempting repair or disposal.</li></ul></section>
      <section><h2 className="font-display">Reporting an issue</h2><p>Send the product or order reference, delivery date, description of the issue and clear photographs through WhatsApp {business.damageReportWindowHours ? `within ${business.damageReportWindowHours} hours of delivery` : "as soon as reasonably possible"}. The gallery will review the information against the applicable order and delivery terms.</p></section>
      <section className={styles.contactBox}><h2 className="font-display">Report an arrival issue</h2><p>Use the <Link href="/contact">contact page</Link> or WhatsApp +91 91661 38566 and preserve the complete packaging while the gallery reviews your message.</p></section>
    </LegalPage>
  );
}
