// @ts-nocheck
import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { getPublicCatalog } from "@/api/catalog/repository";
import { CustomerPageShell } from "@/components/Customer/customer-page-shell";
import { EnquiryBagView } from "@/components/Customer/enquiry-bag-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Enquiry Bag", description: "Collect Divine Stone Gallery marble works and request availability, pricing and delivery guidance together.", alternates: { canonical: "/cart" }, robots: { index: false, follow: true } };

export default async function CartPage() {
  const products = await getPublicCatalog();
  return <CustomerPageShell title="Your enquiry bag" eyebrow="A considered shortlist" intro="Collect the works you would like priced and discussed together, then send one clear request to the gallery." note={<><MessageCircle aria-hidden="true" size={18} /><span>This is an enquiry bag, not an instant checkout. Signed-out choices merge into your secure account after sign-in; the gallery then confirms availability, final pricing, packing and delivery.</span></>}><EnquiryBagView products={products} /></CustomerPageShell>;
}
