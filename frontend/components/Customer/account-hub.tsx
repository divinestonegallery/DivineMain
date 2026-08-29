// @ts-nocheck
"use client";

import { useAuth, useUser } from "@/components/Auth/auth-facade";
import Link from "next/link";
import { useEffect, useState } from "react";
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

function CommunicationPreferences() {
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<{ phoneVerified: boolean; whatsappTransactionalUpdates: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Loading your communication preference…");

  useEffect(() => {
    let active = true;
    void getToken().then((token) => fetch("/api/v1/me", { headers: token ? { authorization: `Bearer ${token}` } : undefined, cache: "no-store" }))
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const payload = await response.json() as { data: { phoneVerified: boolean; whatsappTransactionalUpdates: boolean } };
        if (active) { setProfile(payload.data); setMessage(""); }
      })
      .catch(() => { if (active) setMessage("Your communication preference could not be loaded."); });
    return () => { active = false; };
  }, [getToken]);

  async function updatePreference() {
    if (!profile || !profile.phoneVerified) return;
    setSaving(true);
    setMessage("");
    try {
      const token = await getToken();
      const response = await fetch("/api/v1/me", {
        method: "PATCH",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ whatsappTransactionalUpdates: !profile.whatsappTransactionalUpdates }),
      });
      if (!response.ok) throw new Error();
      const payload = await response.json() as { data: { whatsappTransactionalUpdates: boolean } };
      setProfile((current) => current ? { ...current, whatsappTransactionalUpdates: payload.data.whatsappTransactionalUpdates } : current);
      setMessage(payload.data.whatsappTransactionalUpdates ? "WhatsApp order and commission updates are enabled." : "WhatsApp updates are disabled.");
    } catch {
      setMessage("Your preference could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={`${styles.accountCard} ${styles.preferenceCard}`}>
      <MessageCircle aria-hidden="true" size={22} />
      <h2 className="font-display">WhatsApp updates</h2>
      <p>Optionally receive order and custom-commission progress messages. These service updates are not marketing, and you can withdraw permission at any time.</p>
      <button
        type="button"
        aria-pressed={profile?.whatsappTransactionalUpdates ?? false}
        disabled={!profile?.phoneVerified || saving}
        onClick={() => void updatePreference()}
      >
        {saving ? "Saving…" : profile?.whatsappTransactionalUpdates ? "Disable WhatsApp updates" : "Enable WhatsApp updates"}
      </button>
      {!profile?.phoneVerified && profile ? <small>Verify your account phone number before enabling WhatsApp.</small> : null}
      {message ? <small role="status">{message}</small> : null}
    </article>
  );
}

function ConnectedAccountHub() {
  const { isLoaded, user } = useUser();
  const name = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || "Gallery customer";
  const emailVerified = user?.primaryEmailAddress?.verification?.status === "verified";
  const phoneVerified = user?.primaryPhoneNumber?.verification?.status === "verified";

  return (
    <>
      <AccountBootstrap />
      <AccountCards
        preferences={<CommunicationPreferences />}
        status={
          <article className={styles.accountStatus}>
            <span className={styles.statusBadge}>
              <ShieldCheck aria-hidden="true" size={15} /> Secure account
            </span>
            <h2 className="font-display">{isLoaded ? `Namaste, ${name}.` : "Opening your gallery…"}</h2>
            <p>
              Your Clerk identity is connected to a private Divine Stone Gallery customer record.
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
