// @ts-nocheck
import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { ResetPasswordQueryForm } from "@/components/Auth/reset-password-query-form";
import styles from "@/components/Auth/auth.module.css";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your Divine Stone Gallery account password.",
  alternates: { canonical: "/reset-password" },
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1" id="main-content" tabIndex={-1}>
        <section className={styles.authSection}>
          <div className={`${styles.resetLayout} site-container`}>
            <div className={styles.authPanel}>
              <Suspense fallback={null}>
                <ResetPasswordQueryForm />
              </Suspense>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
