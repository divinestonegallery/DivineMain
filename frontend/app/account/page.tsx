// @ts-nocheck
import type { Metadata } from "next";
import { AccountHub } from "@/components/Customer/account-hub";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { ToastProvider } from "@/components/ui/toast";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your Divine Stone Gallery profile and communication details.",
  alternates: { canonical: "/account" },
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  return (
    <ToastProvider>
      <SiteHeader />
      <AccountHub />
      <SiteFooter />
    </ToastProvider>
  );
}
