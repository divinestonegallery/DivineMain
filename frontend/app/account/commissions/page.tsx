// @ts-nocheck
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { CustomerPageShell } from "@/components/Customer/customer-page-shell";
import { CustomerCommissions } from "@/components/Commissions/customer-commissions";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Custom Commissions", robots: { index: false, follow: false } };
export default function Page() { return <CustomerPageShell title="Your custom commissions" eyebrow="Private making journey" intro="Review quotations, reference images, production milestones and approvals in one secure place." note={<><ShieldCheck size={18} /><span>Only you and authorised gallery staff can open these commission records.</span></>}><CustomerCommissions /></CustomerPageShell>; }
