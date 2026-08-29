// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, legalPageStyles as styles } from "@/components/common/legal-page";
import { getPublicBusinessDetails } from "@/src/config/business";

export const metadata: Metadata = {
  title: "Website Terms",
  description: "Website and enquiry terms for Divine Stone Gallery.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const business = getPublicBusinessDetails();
  return (
    <LegalPage title="Website terms" eyebrow="Using this gallery" intro="The conditions for accounts, ready-made orders, individual quotations and custom commissions placed with Divine Stone Gallery.">
      <section><h2 className="font-display">Account and information</h2><p>An account is required to place an online order or submit a private commission request. You are responsible for protecting access to that account and providing accurate contact, address and delivery information. Please contact the gallery immediately if you believe an account or order has been used without authorization.</p></section>
      <section><h2 className="font-display">Catalogue, price and availability</h2><p>Images, measurements and descriptions are prepared carefully but should be reviewed for the specific work. Ready-made product prices are shown before GST and shipping unless the checkout expressly states otherwise. GST and postcode-based shipping are calculated or confirmed separately. Stock, price, tax eligibility and delivery readiness are checked again by the server when an order is placed.</p></section>
      <section><h2 className="font-display">Orders and payment</h2><p>A website order is recorded immediately after successful server validation. Online payment, bank transfer and eligible Cash on Delivery may be offered. Online orders depend on payment authorization; bank-transfer orders remain pending until funds are confirmed; and Cash on Delivery can require a verified phone, courier eligibility and staff approval. We may contact you if stock, payment, delivery access or suspected misuse prevents fulfilment.</p></section>
      <section><h2 className="font-display">Custom commissions</h2><p>A commission request begins a private consultation rather than a fixed-price ready-made purchase. Scope, marble, dimensions, finish, price, GST, shipping, advance, milestones, changes and expected completion are decided for that commission. Work begins only after the required quotation, approvals and advance arrangement are accepted. Approved milestone changes may affect price or timing when the gallery confirms this in writing.</p></section>
      <section><h2 className="font-display">Handmade and natural variation</h2><p>Marble varies naturally in tone, veining and character. Hand carving, painting and finishing also create subtle differences. These are normal qualities of an individually made work unless a written product or commission specification states otherwise.</p></section>
      <section><h2 className="font-display">Delivery, inspection and returns</h2><p>Delivery method, cost and timing depend on packed size, weight, destination, access and courier availability. Inspect the work and packaging on arrival, preserve all packing and promptly report visible damage with photographs. Cancellation, return, replacement and refund eligibility depends on the applicable written order terms and the <Link href="/returns">returns and damage guidance</Link>, subject to rights that cannot lawfully be excluded.</p></section>
      <section><h2 className="font-display">Permitted use</h2><p>Website photographs, writing and branding may not be copied or commercially reused without permission. Do not probe or disrupt the service, bypass access controls, upload harmful material, impersonate another person or submit misleading payment, delivery or commission information.</p></section>
      <section className={styles.contactBox}><h2 className="font-display">Questions or complaints</h2><p>{business.legalName ? `${business.legalName}. ` : ""}{business.address ? `${business.address}. ` : ""}Email <a href={`mailto:${business.grievanceEmail || "divinestonegallery@gmail.com"}`}>{business.grievanceEmail || "divinestonegallery@gmail.com"}</a>, call {business.grievancePhone || "+91 91661 38566"} or <Link href="/contact">contact the gallery</Link>. {business.grievanceOfficerName ? `Grievance officer: ${business.grievanceOfficerName}. ` : ""}Keep your order or commission reference available so the correct record can be reviewed.</p></section>
    </LegalPage>
  );
}
