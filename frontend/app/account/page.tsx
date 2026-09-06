// @ts-nocheck
import type { Metadata } from "next";
import { AccountHub } from "@/components/Customer/account-hub";
import { SiteFooter } from "@/components/common/site-footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your Divine Stone Gallery profile and communication details.",
  alternates: { canonical: "/account" },
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  return (
    <>
      <AccountHub />
      <SiteFooter />
    </>
  );
}
