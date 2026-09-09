// @ts-nocheck
import type { Metadata } from "next";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { ResetPasswordForm } from "@/components/Auth/reset-password-form";
import styles from "@/components/Auth/auth.module.css";

type ResetParams = Promise<{ token?: string }>;

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your Divine Stone Gallery account password.",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordTokenPage({ params }: { params: ResetParams }) {
  const { token } = await params;

  return (
    <>
      <SiteHeader />
      <main className="flex-1" id="main-content" tabIndex={-1}>
        <section className={styles.authSection}>
          <div className={`${styles.resetLayout} site-container`}>
            <div className={styles.authPanel}>
              <ResetPasswordForm token={decodeURIComponent(token || "")} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
