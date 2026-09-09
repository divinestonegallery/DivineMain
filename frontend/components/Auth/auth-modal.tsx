"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { getAuthEmailError, requestPasswordReset, resetPasswordWithCode } from "@/api/auth";
import { useAuth } from "@/components/Auth/auth-facade";
import { consumeLoginAfterLogout } from "@/components/Auth/auth-redirect";
import styles from "./auth.module.css";

type AuthModalMode = "login" | "signup" | "forgot" | "reset";

const modalCopy: Record<AuthModalMode, { title: string; subtitle: string }> = {
  login: { title: "Welcome Back", subtitle: "Sign in to continue" },
  signup: { title: "Create Account", subtitle: "Join us and start shopping" },
  forgot: { title: "Forgot Password", subtitle: "Enter your registered email address and we'll help you reset your password." },
  reset: { title: "Verify OTP", subtitle: "We've sent a verification code to your email." },
};

export function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  const { isSignedIn, refresh, signIn, signUp } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname !== "/" || isSignedIn || !consumeLoginAfterLogout()) return;

    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("dsg:open-auth"));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isSignedIn, pathname]);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      if (!isSignedIn) {
        const detail = (event as CustomEvent<{ pendingPath?: string; reason?: string }>).detail;
        setIsOpen(true);
        setMode("login");
        setPendingPath(detail?.pendingPath ?? null);
        setPrompt(detail?.reason === "custom-murti" ? "Please login or create an account to use Custom Mooti." : "");
        setError("");
        setSuccess("");
        setShowPassword(false);
      }
    };

    window.addEventListener("dsg:open-auth", handleOpen);
    return () => window.removeEventListener("dsg:open-auth", handleOpen);
  }, [isSignedIn]);

  function closeModal() {
    setIsOpen(false);
    setPendingPath(null);
    setPrompt("");
    setResetEmail("");
    setShowPassword(false);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  function switchMode(nextMode: AuthModalMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setShowPassword(false);
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const form = new FormData(e.currentTarget);

    try {
      await signIn({ email: form.get("email"), password: form.get("password") });
      const nextPath = pendingPath;
      closeModal();
      if (nextPath) router.push(nextPath);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Email or password is incorrect.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const form = new FormData(e.currentTarget);

    const password = form.get("password") as string;
    const confirmPassword = form.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      await signUp({
        name: form.get("name"),
        email: form.get("email"),
        password: password,
      });
      await refresh();
      const nextPath = pendingPath;
      closeModal();
      if (nextPath) router.push(nextPath);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Account creation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const emailError = getAuthEmailError(email);

    if (emailError) {
      setError(emailError);
      setLoading(false);
      return;
    }

    try {
      const result = await requestPasswordReset(email);
      setResetEmail(email);
      setMode("reset");
      setSuccess(result.message || "A verification code has been sent to your email.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Password reset request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const form = new FormData(e.currentTarget);
    const code = String(form.get("code") || "").trim();
    const newPassword = String(form.get("newPassword") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (!/^\d{6}$/.test(code)) {
      setError("Please enter the 6-digit verification code from your email.");
      setLoading(false);
      return;
    }

    if (!newPassword) {
      setError("Please enter a new password.");
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("Your new password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your new password.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const result = await resetPasswordWithCode({ email: resetEmail, code, newPassword });
      setMode("login");
      setSuccess(result.message);
      setResetEmail("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to reset your password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const copy = modalCopy[mode];

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <button
        className={styles.modalBackdrop}
        type="button"
        onClick={closeModal}
        aria-label="Close modal overlay"
        tabIndex={-1}
      />
      <div className={styles.modalContainer} ref={modalRef}>
        <div className={styles.modalLayout}>
          <div className={styles.modalImageSection}>
            <Image
              src="/brand/DSG-New.png"
              alt="Divine Murti"
              fill
              className={styles.modalImage}
              priority
            />
            <div className={styles.modalImageOverlay}>
              <h3 className={styles.modalImageText}>
                Bring Divine Beauty<br />Into Your Home
              </h3>
            </div>
          </div>
          <div className={styles.modalContentSection}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>{copy.title}</h2>
                <p className={styles.modalSubtitle}>{prompt || copy.subtitle}</p>
              </div>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={closeModal}
                aria-label="Close authentication modal"
              >
                <X size={24} strokeWidth={1.5} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {mode === "login" ? (
                <form className={styles.modalForm} onSubmit={handleLogin}>
                  <label>
                    <span>Email Address</span>
                    <input name="email" type="email" required autoComplete="email" disabled={loading} />
                  </label>
                  <label>
                    <span>Password</span>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>
                  <button type="button" className={styles.forgotPasswordButton} disabled={loading} onClick={() => switchMode("forgot")}>
                    Forgot Password?
                  </button>

                  {error && <div className={styles.modalError}>{error}</div>}
                  {success && <div className={styles.modalSuccess}>{success}</div>}

                  <button type="submit" className={styles.modalSubmit} disabled={loading}>
                    {loading ? "Signing in..." : "LOGIN"}
                  </button>

                  <div className={styles.modalFooter}>
                    <p>Don&apos;t have an account? <button type="button" onClick={() => switchMode("signup")}>Sign Up</button></p>
                  </div>
                </form>
              ) : mode === "signup" ? (
                <form className={styles.modalForm} onSubmit={handleSignup}>
                  <label>
                    <span>Name</span>
                    <input name="name" type="text" required autoComplete="name" disabled={loading} />
                  </label>
                  <label>
                    <span>Email Address</span>
                    <input name="email" type="email" required autoComplete="email" disabled={loading} />
                  </label>
                  <label>
                    <span>Password</span>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>
                  <label>
                    <span>Confirm Password</span>
                    <input
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </label>

                  {error && <div className={styles.modalError}>{error}</div>}
                  {success && <div className={styles.modalSuccess}>{success}</div>}

                  <button type="submit" className={styles.modalSubmit} disabled={loading}>
                    {loading ? "Creating account..." : "CREATE ACCOUNT"}
                  </button>

                  <div className={styles.modalFooter}>
                    <p>Already have an account? <button type="button" onClick={() => switchMode("login")}>Login</button></p>
                  </div>
                </form>
              ) : mode === "forgot" ? (
                <form className={styles.modalForm} onSubmit={handleForgotPassword}>
                  <label>
                    <span>Email Address</span>
                    <input name="email" type="email" required autoComplete="email" disabled={loading} />
                  </label>

                  {error && <div className={styles.modalError}>{error}</div>}
                  {success && <div className={styles.modalSuccess}>{success}</div>}

                  <button type="submit" className={styles.modalSubmit} disabled={loading}>
                    {loading ? "Sending OTP..." : "SEND OTP"}
                  </button>

                  <div className={styles.modalFooter}>
                    <p>Remembered your password? <button type="button" disabled={loading} onClick={() => switchMode("login")}>Back to Login</button></p>
                  </div>
                </form>
              ) : (
                <form className={styles.modalForm} onSubmit={handleResetPassword}>
                  <p className={styles.authHelpText}>Enter the 6-digit code sent to {resetEmail} and choose a new password.</p>
                  <label>
                    <span>Verification Code</span>
                    <input
                      name="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      autoComplete="one-time-code"
                      required
                      disabled={loading}
                    />
                  </label>
                  <label>
                    <span>New Password</span>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        name="newPassword"
                        type={showPassword ? "text" : "password"}
                        minLength={8}
                        autoComplete="new-password"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>
                  <label>
                    <span>Confirm Password</span>
                    <input
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      minLength={8}
                      autoComplete="new-password"
                      required
                      disabled={loading}
                    />
                  </label>

                  {error && <div className={styles.modalError}>{error}</div>}
                  {success && <div className={styles.modalSuccess}>{success}</div>}

                  <button type="submit" className={styles.modalSubmit} disabled={loading}>
                    {loading ? "Resetting Password..." : "RESET PASSWORD"}
                  </button>

                  <div className={styles.modalFooter}>
                    <p><button type="button" disabled={loading} onClick={() => switchMode("forgot")}>Back</button></p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
