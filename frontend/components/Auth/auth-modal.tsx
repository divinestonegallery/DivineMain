"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { login, register } from "@/api/auth";
import { useAuth } from "@/components/Auth/auth-facade";
import styles from "./auth.module.css";

export function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const { refresh, isSignedIn } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleOpen = () => {
      if (!isSignedIn) {
        setIsOpen(true);
        setMode("login");
        setError("");
      }
    };
    
    window.addEventListener("dsg:open-auth", handleOpen);
    return () => window.removeEventListener("dsg:open-auth", handleOpen);
  }, [isSignedIn]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
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

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    
    try {
      await login({ email: form.get("email"), password: form.get("password") });
      await refresh();
      setIsOpen(false);
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
    const form = new FormData(e.currentTarget);
    
    const password = form.get("password") as string;
    const confirmPassword = form.get("confirmPassword") as string;
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    
    try {
      await register({
        name: form.get("name"),
        email: form.get("email"),
        password: password,
      });
      await refresh();
      setIsOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Account creation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <button 
        className={styles.modalBackdrop} 
        type="button" 
        onClick={() => setIsOpen(false)}
        aria-label="Close modal overlay"
        tabIndex={-1}
      />
      <div className={styles.modalContainer} ref={modalRef}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{mode === "login" ? "Welcome Back" : "Create Account"}</h2>
            <p className={styles.modalSubtitle}>
              {mode === "login" ? "Sign in to continue" : "Join us and start shopping"}
            </p>
          </div>
          <button 
            type="button" 
            className={styles.modalCloseButton} 
            onClick={() => setIsOpen(false)}
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
              
              {error && <div className={styles.modalError}>{error}</div>}
              
              <button type="submit" className={styles.modalSubmit} disabled={loading}>
                {loading ? "Signing in..." : "LOGIN"}
              </button>
              
              <div className={styles.modalFooter}>
                <p>Don&apos;t have an account? <button type="button" onClick={() => { setMode("signup"); setError(""); setShowPassword(false); }}>Sign Up</button></p>
              </div>
            </form>
          ) : (
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
              
              <button type="submit" className={styles.modalSubmit} disabled={loading}>
                {loading ? "Creating account..." : "CREATE ACCOUNT"}
              </button>
              
              <div className={styles.modalFooter}>
                <p>Already have an account? <button type="button" onClick={() => { setMode("login"); setError(""); setShowPassword(false); }}>Login</button></p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
