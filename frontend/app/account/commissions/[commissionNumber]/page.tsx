import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getGallerySession, isGalleryAuthConfigured } from "@/api/auth/server";
import { CustomerPageShell } from "@/components/Customer/customer-page-shell";
import { CustomerCommissionDetail } from "@/components/Commissions/customer-commissions";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commission Journey", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ commissionNumber: string }> }) { if (isGalleryAuthConfigured() && !(await getGallerySession())) redirect("/sign-in?redirect_url=/account/commissions"); const { commissionNumber } = await params; return <CustomerPageShell title="Commission journey" eyebrow="Made personally for you" intro="Follow each major stage and approve the work before the gallery proceeds." note={<><ShieldCheck size={18} /><span>Your approvals are timestamped and retained in the gallery audit record.</span></>}><CustomerCommissionDetail commissionNumber={commissionNumber} /></CustomerPageShell>; }
