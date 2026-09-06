// @ts-nocheck
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AccountHub } from "@/components/Customer/account-hub";
import { CustomerPageShell } from "@/components/Customer/customer-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your Divine Stone Gallery profile and communication details.",
  alternates: { canonical: "/account" },
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  return (
    <CustomerPageShell
      title="Your gallery account"
      eyebrow="Personal gallery space"
      hideBreadcrumb
      intro="Manage your profile, contact details and gallery communication from one private place."
      note={
        <>
          <ShieldCheck aria-hidden="true" size={18} />
          <span>
            "Your identity is verified by the gallery account service; passwords and OTP codes are never stored by Divine Stone Gallery."
          </span>
        </>
      }
    >
      <AccountHub />
    </CustomerPageShell>
  );
}
