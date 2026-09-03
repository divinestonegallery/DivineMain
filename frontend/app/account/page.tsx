// @ts-nocheck
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getGallerySession, isGalleryAuthConfigured } from "@/api/auth/server";
import { AccountHub } from "@/components/Customer/account-hub";
import { CustomerPageShell } from "@/components/Customer/customer-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery Account",
  description: "Your private Divine Stone Gallery account, orders and commissions.",
  alternates: { canonical: "/account" },
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const authConfigured = isGalleryAuthConfigured();
  const session = authConfigured ? await getGallerySession() : null;

  if (authConfigured && !session) redirect("/sign-in");

  return (
    <CustomerPageShell
      title="Your gallery account"
      eyebrow="Personal gallery space"
      intro="One secure place for addresses, orders and custom-moorti approvals."
      note={
        <>
          <ShieldCheck aria-hidden="true" size={18} />
          <span>
            {authConfigured
              ? "Your identity is verified by Clerk; passwords and OTP codes are never stored by Divine Stone Gallery."
              : "Clerk is integrated. Registration opens as soon as the private application keys are added."}
          </span>
        </>
      }
    >
      <AccountHub />
    </CustomerPageShell>
  );
}
