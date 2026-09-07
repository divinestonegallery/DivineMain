"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getAuthEmailError, requestPasswordReset } from "@/api/auth";
import { useAuth } from "@/components/Auth/auth-facade";
import styles from "./auth.module.css";

type AuthModalMode = "login" | "signup" | "forgot";

const modalCopy: Record<AuthModalMode, { title: string; subtitle: string }> = {
  login: { title: "Welcome Back", subtitle: "Sign in to continue" },
  signup: { title: "Create Account", subtitle: "Join us and start shopping" },
  forgot: { title: "Forgot Password", subtitle: "Enter your registered email address and we'll help you reset your password." },
};

export function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  const { isSignedIn, refresh, signIn, signUp } = useAuth();
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);

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
      setSuccess(result.message || "If an account exists with this email address, password reset instructions have been generated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Password reset request failed.");
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
              src="/brand/Divine%20_stone_gallery.png"
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
              ) : (
                <form className={styles.modalForm} onSubmit={handleForgotPassword}>
                  <label>
                    <span>Email Address</span>
                    <input name="email" type="email" required autoComplete="email" disabled={loading} />
                  </label>

                  {error && <div className={styles.modalError}>{error}</div>}
                  {success && <div className={styles.modalSuccess}>{success}</div>}

                  <button type="submit" className={styles.modalSubmit} disabled={loading}>
                    {loading ? "Sending..." : "SEND RESET LINK"}
                  </button>

                  <div className={styles.modalFooter}>
                    <p>Remembered your password? <button type="button" onClick={() => switchMode("login")}>Back to Login</button></p>
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
