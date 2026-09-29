// @ts-nocheck
"use client";

import Link from "next/link";
import React, { createContext, FormEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ACCESS_TOKEN_KEY, clearAuthSession, getAuthEmailError, getCurrentUser, login, logoutCurrentSession, onAuthSessionChange, register, requestPasswordReset, resetPasswordWithCode, verifySignup as verifySignupApi } from "@/api/auth";
import { markLoginAfterLogout } from "@/components/auth/auth-redirect";
import styles from "./auth.module.css";

const AuthContext = createContext({
  isLoaded: true,
  isSignedIn: false,
  user: null as any,
  refresh: async () => {},
  signIn: async (_credentials: any) => null,
  signUp: async (_credentials: any) => null,
  verifySignup: async (_credentials: any) => null,
  signOut: async () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    userId: context.user?.id || null,
    getToken: async () => (typeof window === "undefined" ? null : window.localStorage.getItem(ACCESS_TOKEN_KEY)),
    signIn: context.signIn,
    signUp: context.signUp,
    verifySignup: context.verifySignup,
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
      // A 401 already removes the stored token. Navigation can abort this
      // request while the token is still valid, and that must not sign the user out.
      const tokenRemains = typeof window !== "undefined" && window.localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!tokenRemains) setUser(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const setUserFromAuthResponse = useCallback((payload: any) => {
    const data = payload?.data ?? payload;
    const nextUser = data?.user ?? data?.customer ?? null;
    if (!nextUser) return false;

    setUser(nextUser);
    setIsLoaded(true);
    return true;
  }, []);

  const signIn = useCallback(async (credentials: any) => {
    const data = await login(credentials);
    if (!setUserFromAuthResponse(data)) await refresh();
    return data;
  }, [refresh, setUserFromAuthResponse]);

  const signUp = useCallback(async (credentials: any) => {
    const data = await register(credentials);
    // If it requires verification, don't set user or refresh yet
    if (data?.requires_verification) {
      return data;
    }
    if (!setUserFromAuthResponse(data)) await refresh();
    return data;
  }, [refresh, setUserFromAuthResponse]);

  const verifySignup = useCallback(async (credentials: any) => {
    const data = await verifySignupApi(credentials);
    if (!setUserFromAuthResponse(data)) await refresh();
    return data;
  }, [refresh, setUserFromAuthResponse]);

  const signOut = useCallback(async () => {
    setUser(null);
    setIsLoaded(true);
    try {
      await logoutCurrentSession();
    } catch {
      // Local sign-out should still complete if the session has already expired.
    } finally {
      clearAuthSession();
      setUser(null);
      markLoginAfterLogout();
      routerPush?.(afterSignOutUrl);
    }
  }, [afterSignOutUrl, routerPush]);

  useEffect(() => {
    void refresh();
    return onAuthSessionChange(() => void refresh());
  }, [refresh]);

  const value = useMemo(() => ({ isLoaded, isSignedIn: Boolean(user), user, refresh, signIn, signUp, verifySignup, signOut }), [isLoaded, refresh, signIn, signOut, signUp, verifySignup, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function authRedirect(fallback?: string) {
  if (typeof window === "undefined") return fallback || "/account";
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect_url") || params.get("redirect") || fallback || "/account";
}

function goToAuthenticatedPage(nextUrl: string) {
  const current = `${window.location.pathname}${window.location.search}`;
  if (nextUrl === current || nextUrl === window.location.pathname) return;
  window.location.assign(nextUrl);
}

export function SignIn({ signUpUrl = "/sign-up", fallbackRedirectUrl = "/account" }: any) {
  const { signIn } = useContext(AuthContext);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);

    try {
      await signIn({ email: form.get("email"), password: form.get("password") });
      goToAuthenticatedPage(authRedirect(fallbackRedirectUrl));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const emailError = getAuthEmailError(email);

    if (emailError) {
      setError(emailError);
      setSubmitting(false);
      return;
    }

    try {
      const result = await requestPasswordReset(email);
      setResetEmail(email);
      setVerificationId(result.verificationId || "");
      setCodeSent(true);
      setSuccess(result.message || "An OTP has been sent to your email.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Password reset request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function leaveForgotPassword() {
    setForgotMode(false);
    setCodeSent(false);
    setResetEmail("");
    setVerificationId("");
    setError("");
    setSuccess("");
  }

  async function submitResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") || "").trim();
    const newPassword = String(form.get("newPassword") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (!/^\d{6}$/.test(code)) {
      setError("Please enter the 6-digit OTP from your email.");
      setSubmitting(false);
      return;
    }
    if (newPassword.length < 8) {
      setError("Your new password must be at least 8 characters.");
      setSubmitting(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    try {
      const result = await resetPasswordWithCode({
        email: resetEmail,
        code,
        verificationId,
        newPassword,
      });
      setCodeSent(false);
      setForgotMode(false);
      setSuccess(result.message || "Password has been reset successfully. You can now log in with your new password.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Password reset failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (forgotMode && codeSent) {
    return (
      <form key="reset-password" className={styles.backendAuthForm} onSubmit={submitResetPassword}>
        <h3 className="font-display">Reset Password</h3>
        <p className={styles.authHelpText}>Enter the 6-digit code sent to {resetEmail} and choose a new password.</p>
        <label>
          <span>OTP</span>
          <input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required disabled={submitting} />
        </label>
        <label>
          <span>New Password</span>
          <input name="newPassword" type="password" autoComplete="new-password" minLength={8} required disabled={submitting} />
        </label>
        <label>
          <span>Confirm Password</span>
          <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required disabled={submitting} />
        </label>
        {error ? <p className={styles.authError}>{error}</p> : null}
        {success ? <p className={styles.authSuccess}>{success}</p> : null}
        <button type="submit" disabled={submitting}>{submitting ? "Resetting..." : "Reset password"}</button>
        <p className={styles.authSwitch}>
          <button className={styles.inlineAuthAction} type="button" disabled={submitting} onClick={() => { setCodeSent(false); setError(""); setSuccess(""); }}>Request a new code</button>
          {" · "}
          <button className={styles.inlineAuthAction} type="button" disabled={submitting} onClick={leaveForgotPassword}>Back to Login</button>
        </p>
      </form>
    );
  }

  if (forgotMode) {
    return (
      <form key="forgot-password" className={styles.backendAuthForm} onSubmit={submitForgotPassword}>
        <h3 className="font-display">Forgot Password</h3>
        <p className={styles.authHelpText}>Enter your registered email address and we&apos;ll send a reset code.</p>
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required disabled={submitting} defaultValue={resetEmail} />
        </label>
        {error ? <p className={styles.authError}>{error}</p> : null}
        {success ? <p className={styles.authSuccess}>{success}</p> : null}
        <button type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send code"}</button>
        <p className={styles.authSwitch}>Remembered it? <button className={styles.inlineAuthAction} type="button" disabled={submitting} onClick={leaveForgotPassword}>Back to Login</button></p>
      </form>
    );
  }

  return (
    <form key="sign-in" className={styles.backendAuthForm} onSubmit={submit}>
      <h3 className="font-display">Sign in</h3>
      <label>
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className={styles.inlineAuthAction} type="button" onClick={() => { setForgotMode(true); setError(""); setSuccess(""); }}>
        Forgot Password?
      </button>
      {error ? <p className={styles.authError}>{error}</p> : null}
      {success ? <p className={styles.authSuccess}>{success}</p> : null}
      <button type="submit" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}</button>
      <p className={styles.authSwitch}>New here? <Link href={signUpUrl}>Create an account</Link></p>
    </form>
  );
}

export function SignUp({ signInUrl = "/", fallbackRedirectUrl = "/account" }: any) {
  const { signUp, refresh, verifySignup } = useContext(AuthContext);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const result = await signUp({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        password: form.get("password"),
      });
      if (result?.requires_verification) {
        setVerifyEmail(String(form.get("email") || ""));
        return;
      }
      await refresh();
      goToAuthenticatedPage(authRedirect(fallbackRedirectUrl));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Account creation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      await verifySignup({ email: verifyEmail, code: form.get("code") });
      await refresh();
      goToAuthenticatedPage(authRedirect(fallbackRedirectUrl));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (verifyEmail) {
    return (
      <form className={styles.backendAuthForm} onSubmit={submitVerify}>
        <h3 className="font-display">Verify Account</h3>
        <p className={styles.authHelpText}>Enter the 6-digit code sent to {verifyEmail}.</p>
        <label>
          <span>OTP Code</span>
          <input name="code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required disabled={submitting} />
        </label>
        {error ? <p className={styles.authError}>{error}</p> : null}
        <button type="submit" disabled={submitting}>{submitting ? "Verifying..." : "Verify Account"}</button>
        <p className={styles.authSwitch}><button className={styles.inlineAuthAction} type="button" disabled={submitting} onClick={() => { setVerifyEmail(""); setError(""); }}>Back</button></p>
      </form>
    );
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
