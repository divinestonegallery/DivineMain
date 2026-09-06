// @ts-nocheck
"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { resetPasswordWithToken } from "@/api/auth";
import styles from "./auth.module.css";

export function ResetPasswordForm({ token }: { token?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (!token) {
      setError("This reset link is missing a valid token.");
      setSubmitting(false);
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      setSubmitting(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      setSubmitting(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    try {
      const result = await resetPasswordWithToken({ token, newPassword });
      event.currentTarget.reset();
      setSuccess(result.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to reset your password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.backendAuthForm} onSubmit={handleSubmit}>
      <h3 className="font-display">Reset Password</h3>
      <p className={styles.authHelpText}>Choose a new password for your Divine Stone Gallery account.</p>

      {!token ? <p className={styles.authError}>This reset link is missing a valid token. Request a new reset link from the sign-in page.</p> : null}

      <label>
        <span>New Password</span>
        <div className={styles.passwordInputWrapper}>
          <input
            name="newPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={submitting || !token}
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            disabled={submitting || !token}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>

      <label>
        <span>Confirm New Password</span>
        <input
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          minLength={8}
          required
          disabled={submitting || !token}
        />
      </label>

      {error ? <p className={styles.authError}>{error}</p> : null}
      {success ? <p className={styles.authSuccess}>{success}</p> : null}

      <button type="submit" disabled={submitting || !token}>{submitting ? "Resetting..." : "Reset Password"}</button>
      <p className={styles.authSwitch}><Link href="/sign-in">Back to Login</Link></p>
    </form>
  );
}
