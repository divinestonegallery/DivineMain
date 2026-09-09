// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, legalPageStyles as styles } from "@/components/common/legal-page";
import { getPublicBusinessDetails } from "@/src/config/business";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Divine Stone Gallery handles information shared through this website and WhatsApp enquiries.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const business = getPublicBusinessDetails();
  return (
    <LegalPage title="Privacy" eyebrow="Your information" intro="How Divine Stone Gallery collects, uses and protects information when you browse, create an account, place an order or commission a sacred work.">
      <section><h2 className="font-display">Information we handle</h2><p>Depending on how you use the gallery, we may handle your name, verified email address and phone number, account identifier, delivery and billing addresses, enquiry bag, order and payment status, shipping details, customer-support messages, custom-commission requirements, uploaded reference or milestone images, approvals and notification history. Hosting and security systems may also process request time, browser details, network address and diagnostic information.</p></section>
      <section><h2 className="font-display">Why we use it</h2><ul><li>To create and secure your account.</li><li>To calculate delivery, place and fulfil orders, confirm payments and provide invoices.</li><li>To prepare quotations and manage custom-moorti production milestones.</li><li>To send requested transactional updates by email, SMS or WhatsApp.</li><li>To answer questions, prevent misuse, investigate errors and maintain legal or financial records.</li></ul></section>
      <section><h2 className="font-display">Service providers</h2><p>Only when the relevant feature is configured, information may be processed by providers that help operate the service: Clerk for authentication; the selected hosting platform for application delivery; PostgreSQL for structured data; and private S3-compatible storage for media; Razorpay for online payments; Shiprocket and selected couriers for delivery rates and fulfilment; Resend for email; MSG91 for SMS; and Meta for WhatsApp. Payment-card or UPI credentials are entered into Razorpay&apos;s payment experience and are not stored in the Divine Stone Gallery database. Each provider also applies its own terms and privacy practices.</p></section>
      <section><h2 className="font-display">Cookies and device storage</h2><p>Essential account services may use secure session cookies. The site also uses device-local storage for signed-out enquiry-bag items and to remember this privacy notice. We do not currently use advertising trackers. If analytics or marketing cookies are added later, the notice and consent controls must be updated before they are enabled.</p></section>
      <section><h2 className="font-display">Retention and protection</h2><p>We keep information only as long as reasonably needed to provide the requested service, maintain order, tax, payment, security and dispute records, or meet applicable legal obligations. Private commission images require account ownership or staff authorization. Access controls, encrypted connections, provider secrets and audit records are used to reduce risk, although no internet service can promise absolute security.</p></section>
      <section><h2 className="font-display">Your choices and requests</h2><p>You may ask to access or correct your account information, withdraw an optional communication consent, or request deletion where applicable. Some records may need to be retained for completed orders, taxation, fraud prevention, disputes or other legal obligations. WhatsApp updates must not be enabled without your affirmative opt-in, and withdrawing that opt-in stops future optional WhatsApp processing without affecting an order already being fulfilled.</p></section>
      <section className={styles.contactBox}><h2 className="font-display">Privacy contact</h2><p>{business.grievanceOfficerName ? `${business.grievanceOfficerName}, grievance officer. ` : ""}Email <a href={`mailto:${business.grievanceEmail || "divinestonegallery@gmail.com"}`}>{business.grievanceEmail || "divinestonegallery@gmail.com"}</a>, use the <Link href="/contact">contact page</Link>, or call {business.grievancePhone || "+91 91661 38566"}. {business.customerCareHours ? `Customer-care hours: ${business.customerCareHours}. ` : ""}We may verify your identity before acting on a request concerning private account or order information.</p></section>
    </LegalPage>
  );
}
