// @ts-nocheck
"use client";

import { Mail, MessageCircle, Smartphone } from "lucide-react";
import styles from "@/components/Commissions/commission-workspace.module.css";

export function NotificationAdmin() {
  const providers = [
    { label: "Email", icon: Mail },
    { label: "SMS", icon: Smartphone },
    { label: "WhatsApp", icon: MessageCircle },
  ];

  return (
    <section className={styles.section}>
      <div className="site-container">
        <div className={styles.toolbar}><p>Transactional notifications</p></div>
        <div className={styles.summary}>
          {providers.map(({ label, icon: Icon }) => <div key={label}><Icon size={18} /><dt>{label}</dt><dd>Backend route not exposed</dd></div>)}
        </div>
        <div className={styles.empty}>
          Notification delivery APIs are not part of the current Django route map, so this screen no
          longer calls unavailable notification routes.
        </div>
      </div>
    </section>
  );
}
