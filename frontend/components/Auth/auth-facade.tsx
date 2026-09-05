// @ts-nocheck
"use client";

import Link from "next/link";
import React, { createContext, FormEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ACCESS_TOKEN_KEY, clearAuthSession, getCurrentUser, login, onAuthSessionChange, register } from "@/api/auth";
import styles from "./auth.module.css";

const AuthContext = createContext({
  isLoaded: true,
  isSignedIn: false,
  user: null as any,
  refresh: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    userId: context.user?.id || null,
    getToken: async () => (typeof window === "undefined" ? null : window.localStorage.getItem(ACCESS_TOKEN_KEY)),
    signOut: context.signOut,
    refresh: context.refresh,
  };
}

export function useUser() {
  const context = useContext(AuthContext);
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    user: context.user,
  };
}

export function SignedIn({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <>{children}</> : null;
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  return isSignedIn ? null : <>{children}</>;
}

export function Show({ children, when }: { children: ReactNode; when?: "signed-in" | "signed-out" }) {
  const { isSignedIn } = useAuth();
  if (when === "signed-out") return isSignedIn ? null : <>{children}</>;
  return isSignedIn ? <>{children}</> : null;
}

export function UserButton() {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  if (!isSignedIn) return null;

  const label = user?.name || user?.email || "Account";
  return (
    <button className={styles.userButton} type="button" title={`${label} - sign out`} onClick={() => void signOut()}>
      {String(label).slice(0, 1).toUpperCase()}
    </button>
  );
}

export function ClerkProvider({ children, routerPush, afterSignOutUrl = "/" }: { children: ReactNode; [key: string]: any }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);

  const refresh = useCallback(async () => {
    const token = typeof window === "undefined" ? null : window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setUser(null);
      setIsLoaded(true);
      return;
    }

    try {
      setUser(await getCurrentUser());
    } catch {
      clearAuthSession();
      setUser(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const signOut = useCallback(async () => {
    clearAuthSession();
    setUser(null);
    routerPush?.(afterSignOutUrl);
  }, [afterSignOutUrl, routerPush]);

  useEffect(() => {
    void refresh();
    return onAuthSessionChange(() => void refresh());
  }, [refresh]);

  const value = useMemo(() => ({ isLoaded, isSignedIn: Boolean(user), user, refresh, signOut }), [isLoaded, refresh, signOut, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function authRedirect(fallback?: string) {
  if (typeof window === "undefined") return fallback || "/account";
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect_url") || params.get("redirect") || fallback || "/account";
}

export function SignIn({ signUpUrl = "/sign-up", fallbackRedirectUrl = "/account" }: any) {
  const { refresh } = useContext(AuthContext);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      await login({ email: form.get("email"), password: form.get("password") });
      await refresh();
      window.location.href = authRedirect(fallbackRedirectUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.backendAuthForm} onSubmit={submit}>
      <h3 className="font-display">Sign in</h3>
      <label>
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error ? <p className={styles.authError}>{error}</p> : null}
      <button type="submit" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}</button>
      <p className={styles.authSwitch}>New here? <Link href={signUpUrl}>Create an account</Link></p>
    </form>
  );
}

export function SignUp({ signInUrl = "/sign-in", fallbackRedirectUrl = "/account" }: any) {
  const { refresh } = useContext(AuthContext);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      await register({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        password: form.get("password"),
      });
      await refresh();
      window.location.href = authRedirect(fallbackRedirectUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Account creation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.backendAuthForm} onSubmit={submit}>
      <h3 className="font-display">Create account</h3>
      <label>
        <span>Name</span>
        <input name="name" autoComplete="name" required />
      </label>
      <label>
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        <span>Phone</span>
        <input name="phone" type="tel" autoComplete="tel" />
      </label>
      <label>
        <span>Password</span>
        <input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      {error ? <p className={styles.authError}>{error}</p> : null}
      <button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create account"}</button>
      <p className={styles.authSwitch}>Already registered? <Link href={signInUrl}>Sign in</Link></p>
    </form>
  );
}
