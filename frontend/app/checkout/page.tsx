// @ts-nocheck
import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { getPublicCatalog } from "@/api/catalog/repository";
import { CheckoutExperience } from "@/components/Checkout/checkout-experience";
import { CustomerPageShell } from "@/components/Customer/customer-page-shell";
import styles from "@/components/Customer/customer-page.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Secure Checkout",
  description: "Verify product pricing, GST, stock and delivery readiness before placing a Divine Stone Gallery order.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const products = await getPublicCatalog();
  return (
    <CustomerPageShell
      title="Secure checkout"
      eyebrow="Verified before every order"
      intro="Review price, GST, stock, delivery and payment eligibility before anything is charged or reserved."
      note={<><LockKeyhole aria-hidden="true" size={18} /><span>Final totals are calculated by Divine Stone Gallery on the server. Browser-submitted prices, taxes and shipping charges are never trusted.</span></>}
    >
      <section className={styles.section}>
        <div className="site-container"><CheckoutExperience products={products} /></div>
      </section>
    </CustomerPageShell>
  );
}
