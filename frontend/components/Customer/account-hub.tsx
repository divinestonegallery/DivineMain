// @ts-nocheck
"use client";

import { useUser } from "@/components/Auth/auth-facade";
import Link from "next/link";
import {
  ArrowRight,
  CircleUserRound,
  Heart,
  KeyRound,
  MessageCircle,
  PackageSearch,
  Hammer,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { AccountBootstrap } from "@/components/Auth/account-bootstrap";
import { useAuthConfigured } from "@/components/Auth/auth-provider";
import { useEnquiryBag, useSavedWorks } from "./device-collections";
import styles from "./customer-page.module.css";

function AccountCards({ status, preferences }: { status: React.ReactNode; preferences?: React.ReactNode }) {
  const savedWorks = useSavedWorks();
  const enquiryBag = useEnquiryBag();

  return (
    <section className={styles.section}>
      <div className={`${styles.accountGrid} site-container`}>
        {status}
        {preferences}
        <article className={styles.accountCard}>
          <Hammer aria-hidden="true" size={22} />
          <h2 className="font-display">Custom commissions</h2>
          <p>Track quotations, reference images, production milestones and approvals.</p>
          <Link href="/account/commissions">View commissions <ArrowRight aria-hidden="true" size={15} /></Link>
        </article>
        <article className={styles.accountCard}>
          <Heart aria-hidden="true" size={22} />
          <strong>{savedWorks.count}</strong>
          <h2 className="font-display">Wishlist</h2>
          <p>Works saved while you explore the collection.</p>
          <Link href="/wishlist">View wishlist <ArrowRight aria-hidden="true" size={15} /></Link>
        </article>
        <article className={styles.accountCard}>
          <ShoppingBag aria-hidden="true" size={22} />
          <strong>{enquiryBag.count}</strong>
          <h2 className="font-display">Enquiry bag</h2>
          <p>Works ready for a combined quotation.</p>
          <Link href="/cart">Open bag <ArrowRight aria-hidden="true" size={15} /></Link>
        </article>
        <article className={styles.accountCard}>
          <PackageSearch aria-hidden="true" size={22} />
          <h2 className="font-display">Orders</h2>
          <p>Review order totals, payment state and fulfilment progress from your private account.</p>
          <Link href="/account/orders">View orders <ArrowRight aria-hidden="true" size={15} /></Link>
        </article>
        <article className={styles.accountCard}>
          <CircleUserRound aria-hidden="true" size={22} />
          <h2 className="font-display">Profile & addresses</h2>
          <p>Manage identity and security from the account menu in the header.</p>
          <Link href="/privacy">How information is handled <ArrowRight aria-hidden="true" size={15} /></Link>
        </article>
      </div>
    </section>
  );
}

function CommunicationPreferences({ user }: { user: any }) {
  const hasPhone = Boolean(user?.phone);
  return (
    <article className={`${styles.accountCard} ${styles.preferenceCard}`}>
      <MessageCircle aria-hidden="true" size={22} />
      <h2 className="font-display">Communication</h2>
      <p>Your account contact details are loaded from the Django customer profile.</p>
      <small>{user?.email ? `Email: ${user.email}` : "No email is saved on this profile."}</small>
      <small>{hasPhone ? `Phone: ${user.phone}` : "Add a phone number during signup to help staff reach you faster."}</small>
    </article>
  );
}

function ConnectedAccountHub() {
  const { isLoaded, user } = useUser();
  const name = user?.name || user?.email || "Gallery customer";
  const emailVerified = Boolean(user?.email);
  const phoneVerified = Boolean(user?.phone);

  return (
    <>
      <AccountBootstrap />
      <AccountCards
        preferences={<CommunicationPreferences user={user} />}
        status={
          <article className={styles.accountStatus}>
            <span className={styles.statusBadge}>
              <ShieldCheck aria-hidden="true" size={15} /> Secure account
            </span>
            <h2 className="font-display">{isLoaded ? `Namaste, ${name}.` : "Opening your gallery…"}</h2>
            <p>
              Your account is connected to a private Divine Stone Gallery customer record.
              {emailVerified || phoneVerified
                ? ` Verified: ${[emailVerified ? "email" : null, phoneVerified ? "phone" : null].filter(Boolean).join(" and ")}.`
                : " Add a verified email or phone number before placing an order."}
            </p>
            <Link href="/shop">Continue exploring <ArrowRight aria-hidden="true" size={15} /></Link>
          </article>
        }
      />
    </>
  );
}

export function AccountHub() {
  const configured = useAuthConfigured();

  if (configured) return <ConnectedAccountHub />;

  return (
    <AccountCards
      status={
        <article className={styles.accountStatus}>
          <span className={styles.statusBadge}><KeyRound aria-hidden="true" size={15} /> Clerk ready</span>
          <h2 className="font-display">Secure sign-in is ready for its private keys.</h2>
          <p>
            The account system is connected in the website. Add the Clerk application keys to open
            phone OTP, email/password and Google registration.
          </p>
          <Link href="/sign-in">View sign-in <ArrowRight aria-hidden="true" size={15} /></Link>
        </article>
      }
    />
  );
}
