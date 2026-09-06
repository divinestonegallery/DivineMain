"use client";
import Link from "next/link";
import { KeyRound, ShieldAlert } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import styles from "./catalog-admin.module.css";

export function AdminState({ reason }: { reason: "auth-unconfigured" | "forbidden" | "storage-unavailable" | "loading" }) {
  const content = reason === "auth-unconfigured"
    ? { icon: KeyRound, title: "Activate Clerk to open staff administration.", body: "The product-management system is ready. Add the Clerk keys and sign in with divinestonegallery@gmail.com to become the initial full-access administrator." }
    : reason === "loading"
      ? { icon: KeyRound, title: "Loading administration...", body: "Checking your existing session and staff access." }
    : reason === "forbidden"
      ? { icon: ShieldAlert, title: "This account does not have staff access.", body: "Sign in with the owner email or ask an existing administrator to activate this staff account." }
      : { icon: ShieldAlert, title: "The catalogue database is not ready yet.", body: "Apply the included PostgreSQL migrations, then reload this page." };
  const Icon = content.icon;

  return (
    <section className={styles.adminSection}>
      <div className="site-container">
        <div className={styles.stateCard}>
          <Icon aria-hidden="true" size={30} />
          <h2 className="font-display">{content.title}</h2>
          <p>{content.body}</p>
          {reason === "loading" ? null : reason === "forbidden" ? (
            <Link className={buttonClassName({ size: "lg" })} href="/account">Continue</Link>
          ) : (
            <button className={buttonClassName({ size: "lg" })} type="button" onClick={() => window.dispatchEvent(new CustomEvent("dsg:open-auth"))}>Open login</button>
          )}
        </div>
      </div>
    </section>
  );
}
