// @ts-nocheck
"use client";

import { SignIn, SignUp } from "@/components/Auth/auth-facade";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useAuthConfigured } from "./auth-provider";
import styles from "./auth.module.css";

const appearance = {
  elements: {
    rootBox: styles.clerkRoot,
    cardBox: styles.clerkCardBox,
    card: styles.clerkCard,
    headerTitle: styles.clerkTitle,
    headerSubtitle: styles.clerkSubtitle,
    formButtonPrimary: styles.clerkPrimaryButton,
    footerActionLink: styles.clerkLink,
    socialButtonsBlockButton: styles.clerkSocialButton,
  },
};

export function AuthGateway({ mode }: { mode: "sign-in" | "sign-up" }) {
  const configured = useAuthConfigured();

  if (!configured) {
    return (
      <section className={styles.unconfigured} aria-labelledby="auth-setup-title">
        <KeyRound aria-hidden="true" size={28} />
        <h2 id="auth-setup-title" className="font-display">
          Secure accounts are being connected.
        </h2>
        <p>
          Clerk has been integrated, but the private account keys still need to be added before
          customer registration can open.
        </p>
        <div className={styles.securityNote}>
          <ShieldCheck aria-hidden="true" size={18} />
          Passwords and OTP codes will be handled by Clerk and are never stored by this website.
        </div>
      </section>
    );
  }

  if (mode === "sign-up") {
    return (
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/account"
        appearance={appearance}
      />
    );
  }

  return (
    <SignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      fallbackRedirectUrl="/account"
      appearance={appearance}
    />
  );
}
