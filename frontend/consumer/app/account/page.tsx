// @ts-nocheck
import type { Metadata } from "next";
import { AccountHub } from "@/components/account/account-hub";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { ToastProvider } from "@shared/components/toast";

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
