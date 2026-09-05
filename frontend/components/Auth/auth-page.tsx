// @ts-nocheck
import { CheckCircle2, LockKeyhole, Smartphone } from "lucide-react";
import { AuthGateway } from "./auth-gateway";
import styles from "./auth.module.css";

export function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  return (
    <section className={styles.authSection}>
      <div className={`${styles.authLayout} site-container`}>
        <div className={styles.authPromise}>
          <span>Private gallery account</span>
          <h2 className="font-display">
            {mode === "sign-in" ? "Welcome back to your gallery." : "Create your personal gallery space."}
          </h2>
          <p>
            Save sacred works, keep addresses private, follow orders and approve custom-moorti
            milestones from one secure account.
          </p>
          <ul className={styles.promiseList}>
            <li><Smartphone aria-hidden="true" size={18} /> Phone OTP, email/password or Google</li>
            <li><LockKeyhole aria-hidden="true" size={18} /> Passwords and OTP codes never enter our database</li>
            <li><CheckCircle2 aria-hidden="true" size={18} /> Account required before placing an order</li>
          </ul>
        </div>
        <div className={styles.authPanel}>
          <AuthGateway mode={mode} />
        </div>
      </div>
    </section>
  );
}
