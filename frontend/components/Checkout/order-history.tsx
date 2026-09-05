// @ts-nocheck
"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, PackageSearch, ShieldCheck } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import styles from "./checkout.module.css";

export function OrderHistory() {
  return (
    <div className={styles.centerCard}>
      <PackageSearch aria-hidden="true" size={30} />
      <h2 className="font-display">Order history is handled by the gallery team.</h2>
      <p>
        This backend exposes product, account, contact, custom-request and admin catalogue APIs.
        Live orders, payments and shipping history are not present, so the frontend no longer calls
        missing order endpoints.
      </p>
      <div className={styles.inlineActions}>
        <Link className={buttonClassName({ size: "lg" })} href="/cart">Review enquiry bag <ArrowRight aria-hidden="true" size={17} /></Link>
        <Link className={buttonClassName({ size: "lg", variant: "outline" })} href="/contact">Contact gallery <MessageCircle aria-hidden="true" size={17} /></Link>
      </div>
      <small className={styles.safetyNote}><ShieldCheck aria-hidden="true" size={14} /> No backend changes were made for unavailable commerce routes.</small>
    </div>
  );
}
