// @ts-nocheck
import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { OrderHistory } from "@/components/Checkout/order-history";
import { CustomerPageShell } from "@/components/Customer/customer-page-shell";
import styles from "@/components/Customer/customer-page.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your Orders",
  description: "Review Divine Stone Gallery order and payment progress.",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return <CustomerPageShell title="Your orders" eyebrow="Private order history" intro="Review every placed order, payment state and fulfilment status from your secure account." note={<><PackageSearch aria-hidden="true" size={18} /><span>Order ownership is checked on the server. Customers can access only orders placed from their own verified account.</span></>}><section className={styles.section}><div className="site-container"><OrderHistory /></div></section></CustomerPageShell>;
}
