// @ts-nocheck
import type { Metadata } from "next";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";
import { ResetPasswordForm } from "@/components/Auth/reset-password-form";
import styles from "@/components/Auth/auth.module.css";

type ResetSearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your Divine Stone Gallery account password.",
  alternates: { canonical: "/reset-password" },
  robots: { index: false, follow: false },
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0]?.trim() ?? "" : value?.trim() ?? "";
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: ResetSearchParams }) {
  const params = await searchParams;
  const token = firstParam(params.token) || firstParam(params.reset_token) || firstParam(params.t);

  return (
    <>
      <SiteHeader />
      <main className="flex-1" id="main-content" tabIndex={-1}>
        <section className={styles.authSection}>
          <div className={`${styles.resetLayout} site-container`}>
            <div className={styles.authPanel}>
              <ResetPasswordForm token={token} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
