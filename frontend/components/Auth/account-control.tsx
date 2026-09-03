// @ts-nocheck
"use client";

import { Show, UserButton, useAuth } from "@/components/Auth/auth-facade";
import Link from "next/link";
import { CircleUserRound, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthConfigured } from "./auth-provider";
import { apiUrl } from "@/api/client";

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
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let active = true;
    void getToken()
      .then((token) => fetch(apiUrl("/api/admin/staff?page_size=1"), {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      }))
      .then(async (response) => {
        if (!response.ok) return false;
        return true;
      })
      .then((authorized) => { if (active) setIsAdmin(authorized); })
      .catch(() => { if (active) setIsAdmin(false); });

    return () => { active = false; };
  }, [getToken, isLoaded, isSignedIn]);

  return (
    <>
      <Show when="signed-out">
        <button 
          type="button"
          className={className} 
          onClick={() => window.dispatchEvent(new CustomEvent("dsg:open-auth"))}
          aria-label="Sign in to your account"
        >
          <CircleUserRound aria-hidden="true" size={21} strokeWidth={1.6} />
        </button>
      </Show>
      <Show when="signed-in">
        <>
          {isAdmin ? (
            <Link className={className} href="/admin" aria-label="Open admin dashboard" title="Admin dashboard">
              <LayoutDashboard aria-hidden="true" size={21} strokeWidth={1.6} />
            </Link>
          ) : null}
          <span className={className} aria-label="Open customer account menu">
            <UserButton
              userProfileMode="modal"
              appearance={{ elements: { avatarBox: { width: "25px", height: "25px" } } }}
            />
          </span>
        </>
      </Show>
    </>
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
  
  if (!isLoaded || !isSignedIn) {
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
