import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { CustomerPageShell } from "@/components/Customer/customer-page-shell";
import { CustomerCommissionDetail } from "@/components/Commissions/customer-commissions";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commission Journey", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ commissionNumber: string }> }) { const { commissionNumber } = await params; return <CustomerPageShell title="Commission journey" eyebrow="Made personally for you" intro="Follow each major stage and approve the work before the gallery proceeds." note={<><ShieldCheck size={18} /><span>Your approvals are timestamped and retained in the gallery audit record.</span></>}><CustomerCommissionDetail commissionNumber={commissionNumber} /></CustomerPageShell>; }
