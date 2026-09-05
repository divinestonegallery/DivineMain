// @ts-nocheck
"use client";

import Link from "next/link";
import { ArrowRight, Hammer, MessageCircle, ShieldCheck } from "lucide-react";
import styles from "./commission-workspace.module.css";

function CommissionNotice({ detail }: { detail?: string }) {
  return (
    <section className={styles.section}>
      <div className="site-container">
        <div className={styles.empty}>
          <div>
            <Hammer aria-hidden="true" />
            <h2 className="font-display">{detail ? "Custom request tracking is not exposed yet." : "Begin a custom murti request."}</h2>
            <p>
              The current backend accepts custom murti requests through the contact customization
              endpoint. It does not expose customer milestone, media, quotation or approval routes,
              so this page avoids broken commission API calls.
            </p>
            {detail ? <small>Requested reference: {detail}</small> : null}
            <div className={styles.actions}>
              <Link href="/custom-murti#consultation"><MessageCircle size={15} /> Send custom request</Link>
              <Link href="/contact">Contact gallery <ArrowRight size={15} /></Link>
            </div>
            <p className={styles.error}><ShieldCheck size={14} /> No backend changes were made.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CustomerCommissions() {
  return <CommissionNotice />;
}

export function CustomerCommissionDetail({ commissionNumber }: { commissionNumber: string }) {
  return <CommissionNotice detail={commissionNumber} />;
}
