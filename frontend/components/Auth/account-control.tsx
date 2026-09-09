"use client";

import { useAuth, useUser } from "@/components/Auth/auth-facade";
import Link from "next/link";
import { CircleUserRound, LayoutDashboard } from "lucide-react";
import { useAuthConfigured } from "./auth-provider";
import authStyles from "./auth.module.css";

function profileRole(user: unknown) {
  const record = user && typeof user === "object" ? user as Record<string, unknown> : {};
  const nested = record.user && typeof record.user === "object" ? record.user as Record<string, unknown> : {};
  return String(record.role ?? nested.role ?? "").toLowerCase();
}

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
  const isAdmin = ["staff", "admin"].includes(profileRole(user));

  if (!isLoaded) return null;

  return (
    isSignedIn ? (
      <>
        {isAdmin ? (
          <Link className={className} href="/admin" aria-label="Open admin dashboard" title="Admin dashboard">
            <LayoutDashboard aria-hidden="true" size={21} strokeWidth={1.6} />
          </Link>
        ) : null}
        <Link className={className} href="/account" aria-label="Open customer account" title="My Account">
          <span className={authStyles.userButton} aria-hidden="true">
            {String(user?.name || user?.email || "Account").slice(0, 1).toUpperCase()}
          </span>
        </Link>
      </>
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
