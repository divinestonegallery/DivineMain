"use client";

import { useAuth, useUser } from "@/components/auth/auth-facade";
import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { useAuthConfigured } from "./auth-provider";
import authStyles from "./auth.module.css";

export function AccountControl({ className }: { className?: string }) {
  const configured = useAuthConfigured();

  if (!configured) {
    return (
      <button 
        type="button"
        className={className} 
        onClick={() => window.dispatchEvent(new CustomEvent("dsg:open-auth"))}
        aria-label="Sign in to your account"
      >
        <CircleUserRound aria-hidden="true" size={21} strokeWidth={1.6} />
      </button>
    );
  }

  return <ConfiguredAccountControl className={className} />;
}

function ConfiguredAccountControl({ className }: { className?: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  if (!isLoaded) return null;

  return (
    isSignedIn ? (
        <Link className={className} href="/account" aria-label="Open customer account" title="My Account">
          <span className={authStyles.userButton} aria-hidden="true">
            {String(user?.name || user?.email || "Account").slice(0, 1).toUpperCase()}
          </span>
        </Link>
    ) : (
      <button
        type="button"
        className={className}
        onClick={() => window.dispatchEvent(new CustomEvent("dsg:open-auth"))}
        aria-label="Sign in to your account"
      >
        <CircleUserRound aria-hidden="true" size={21} strokeWidth={1.6} />
      </button>
    )
  );
}

export function MobileAccountControl({ activeClassName, defaultClassName }: { activeClassName?: string; defaultClassName?: string }) {
  const configured = useAuthConfigured();
  
  if (!configured) {
    return (
      <button 
        type="button" 
        className={defaultClassName} 
        onClick={() => window.dispatchEvent(new CustomEvent("dsg:open-auth"))}
      >
        <CircleUserRound aria-hidden="true" size={20} />
        <span>Account</span>
      </button>
    );
  }

  return <ConfiguredMobileAccountControl activeClassName={activeClassName} defaultClassName={defaultClassName} />;
}

function ConfiguredMobileAccountControl({ activeClassName, defaultClassName }: { activeClassName?: string; defaultClassName?: string }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <button 
        type="button" 
        className={defaultClassName} 
        onClick={() => window.dispatchEvent(new CustomEvent("dsg:open-auth"))}
      >
        <CircleUserRound aria-hidden="true" size={20} />
        <span>Account</span>
      </button>
    );
  }

  return (
    <Link className={activeClassName || defaultClassName} href="/account" aria-current={activeClassName ? "page" : undefined}>
      <CircleUserRound aria-hidden="true" size={20} />
      <span>Account</span>
    </Link>
  );
}
