// @ts-nocheck
import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { CustomerPageShell } from "@/components/Customer/customer-page-shell";
import { OrderAssistanceForm } from "@/components/Customer/order-assistance-form";

export const metadata: Metadata = { title: "Order Assistance", description: "Contact Divine Stone Gallery about an existing enquiry, quotation or order.", alternates: { canonical: "/track-order" }, robots: { index: false, follow: true } };

export default function TrackOrderPage() {
  return <CustomerPageShell title="Track or discuss an order" eyebrow="Order assistance" intro="Share your reference with the gallery for a direct update about an enquiry, quotation, commission or delivery." note={<><LockKeyhole aria-hidden="true" size={18} /><span>The frontend prepares your message but does not store the details. Live order status will appear here after the backend order API is connected.</span></>}><OrderAssistanceForm /></CustomerPageShell>;
}
