// @ts-nocheck
"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { getCurrentUser, requestPasswordReset, updateCurrentUserProfile } from "@/api/auth";
import { AccountBootstrap } from "@/components/Auth/account-bootstrap";
import { useAuth, useUser } from "@/components/Auth/auth-facade";
import { useAuthConfigured } from "@/components/Auth/auth-provider";
import { Button, buttonClassName } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import styles from "./customer-page.module.css";

type AccountSection = "profile" | "password";

const profileSections: Array<{ id: AccountSection; label: string; icon: ReactNode }> = [
  { id: "profile", label: "My Profile", icon: <UserRound aria-hidden="true" size={18} /> },
];

const secureSections: Array<{ id: AccountSection; label: string; icon: ReactNode }> = [
  { id: "password", label: "Change Password", icon: <KeyRound aria-hidden="true" size={18} /> },
];

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function profileData(user: any) {
  return user?.user ?? user ?? {};
}

function displayValue(value: unknown, fallback = "Not provided") {
  const text = cleanText(value);
  return text || fallback;
}

function profileInitial(user: any) {
  const profile = profileData(user);
  const label = cleanText(profile.name) || cleanText(profile.email) || "G";
  return label.slice(0, 1).toUpperCase();
}

function FeedbackMessage({ type, children }: { type: "success" | "error"; children: ReactNode }) {
  return (
    <p className={`${styles.accountFeedback} ${type === "error" ? styles.accountFeedbackError : styles.accountFeedbackSuccess}`} role={type === "error" ? "alert" : "status"}>
      {type === "error" ? <AlertCircle aria-hidden="true" size={16} /> : <CheckCircle2 aria-hidden="true" size={16} />}
      <span>{children}</span>
    </p>
  );
}

function AccountNavButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={styles.accountNavItem} type="button" aria-current={active ? "page" : undefined} onClick={onClick}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

function MyProfilePanel({ enabled = true, onProfileLoaded }: { enabled?: boolean; onProfileLoaded: (profile: any) => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    void getCurrentUser()
      .then((currentProfile) => {
        if (!mounted) return;
        setProfile(currentProfile);
        setForm({
          name: cleanText(currentProfile?.name),
          email: cleanText(currentProfile?.email),
          phone: cleanText(currentProfile?.phone),
        });
        onProfileLoaded(currentProfile);
      })
      .catch((reason) => {
        if (mounted) setFeedback({ type: "error", message: reason instanceof Error ? reason.message : "Unable to load your profile." });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [enabled, onProfileLoaded]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    const nextName = cleanText(form.name);
    const nextPhone = cleanText(form.phone);
    const patch: Record<string, string> = {};

    if (nextName !== cleanText(profile.name)) patch.name = nextName;
    if (nextPhone !== cleanText(profile.phone)) patch.phone = nextPhone;

    if (!Object.keys(patch).length) {
      setEditing(false);
      setFeedback({ type: "success", message: "Profile is already up to date." });
      setSaving(false);
      return;
    }

    try {
      const updated = await updateCurrentUserProfile(patch);
      setProfile(updated);
      setForm({
        name: cleanText(updated?.name) || nextName,
        email: cleanText(updated?.email) || form.email,
        phone: cleanText(updated?.phone) || nextPhone,
      });
      onProfileLoaded(updated);
      setEditing(false);
      setFeedback({ type: "success", message: "Profile updated successfully." });
      showToast("Profile updated successfully.");
    } catch (reason) {
      setFeedback({ type: "error", message: reason instanceof Error ? reason.message : "Unable to update your profile." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={styles.accountPanel}>
      <header className={styles.accountPanelHeader}>
        <div>
          <p className={styles.eyebrow}>My Profile</p>
          <h2 className="font-display">{loading ? "Loading profile..." : profile ? `Namaste, ${displayValue(profile.name)}.` : "Profile unavailable"}</h2>
          <p>Manage the profile details connected to your Divine Stone Gallery account.</p>
        </div>
        <span className={styles.accountAvatar}>{loading ? "..." : profile ? profileInitial(profile) : "-"}</span>
      </header>

      {loading ? <div className={styles.profileSummaryGrid} aria-busy="true"><div><strong>Loading profile...</strong></div></div> : null}
      {!loading && profile && !editing ? (
        <>
          <div className={styles.profileSummaryGrid}>
            <div><small>Name</small><strong>{displayValue(profile.name)}</strong></div>
            <div><small>Email Address</small><strong>{displayValue(profile.email)}</strong></div>
            <div><small>Phone Number</small><strong>{displayValue(profile.phone)}</strong></div>
          </div>
          {feedback ? <FeedbackMessage type={feedback.type}>{feedback.message}</FeedbackMessage> : null}
          <Button type="button" size="md" onClick={() => { setFeedback(null); setEditing(true); }}>Edit</Button>
        </>
      ) : null}
      {!loading && profile && editing ? (
        <form className={styles.accountForm} onSubmit={handleSubmit} aria-busy={saving}>
          <label>
            <span>Name</span>
            <input value={form.name} autoComplete="name" maxLength={120} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            <span>Email Address</span>
            <input value={form.email} type="email" autoComplete="email" readOnly aria-describedby="account-email-note" />
            <small id="account-email-note">Email is managed by the existing sign-in profile and cannot be edited here.</small>
          </label>
          <label>
            <span>Phone Number</span>
            <input value={form.phone} type="tel" autoComplete="tel" maxLength={30} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          {feedback ? <FeedbackMessage type={feedback.type}>{feedback.message}</FeedbackMessage> : null}
          <Button type="submit" size="md" disabled={saving}>
            {saving ? <Loader2 className={styles.spinIcon} aria-hidden="true" size={17} /> : null}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      ) : null}
      {!loading && !profile && feedback ? <FeedbackMessage type={feedback.type}>{feedback.message}</FeedbackMessage> : null}
    </article>
  );
}

function ChangePasswordPanel({ user }: { user: any }) {
  const profile = profileData(user);
  const email = cleanText(profile.email);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handlePasswordReset() {
    if (!email) {
      setFeedback({ type: "error", message: "A profile email is required before password reset instructions can be sent." });
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      const result = await requestPasswordReset(email);
      setFeedback({ type: "success", message: result.message });
    } catch (reason) {
      setFeedback({ type: "error", message: reason instanceof Error ? reason.message : "Unable to request a password reset." });
    } finally {
      setSending(false);
    }
  }

  return (
    <article className={styles.accountPanel}>
      <header className={styles.accountPanelHeader}>
        <div>
          <p className={styles.eyebrow}>Change Password</p>
          <h2 className="font-display">Request password reset</h2>
          <p>The backend currently supports password changes through the existing forgot/reset-password flow.</p>
        </div>
      </header>

      <div className={styles.accountNotice}>
        <KeyRound aria-hidden="true" size={21} />
        <div>
          <h3 className="font-display">{email ? email : "No email on this profile"}</h3>
          <p>Use your saved email address to receive password reset instructions from the existing authentication API.</p>
          {feedback ? <FeedbackMessage type={feedback.type}>{feedback.message}</FeedbackMessage> : null}
          <Button type="button" size="md" disabled={sending || !email} onClick={handlePasswordReset}>
            {sending ? <Loader2 className={styles.spinIcon} aria-hidden="true" size={17} /> : null}
            {sending ? "Sending..." : "Send Reset Instructions"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function ConnectedAccountHub() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<AccountSection>("profile");
  const [loggingOut, setLoggingOut] = useState(false);
  const [savedProfile, setSavedProfile] = useState<any>(null);
  const effectiveUser = useMemo(() => (savedProfile ? { ...profileData(user), ...savedProfile } : user), [savedProfile, user]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.dispatchEvent(new CustomEvent("dsg:open-auth"));
    }
  }, [isLoaded, isSignedIn]);

  const panel = useMemo(() => {
    if (!isLoaded) return <MyProfilePanel enabled={false} onProfileLoaded={setSavedProfile} />;
    if (!isSignedIn) {
      return (
        <article className={styles.accountPanel}>
          <div className={styles.accountNotice}>
            <ShieldCheck aria-hidden="true" size={21} />
            <div>
              <h3 className="font-display">Please sign in to view your account.</h3>
              <p>Your private profile opens after authentication is confirmed.</p>
              <button className={buttonClassName({ size: "md" })} type="button" onClick={() => window.dispatchEvent(new CustomEvent("dsg:open-auth"))}>Sign in</button>
            </div>
          </div>
        </article>
      );
    }

    if (activeSection === "password") return <ChangePasswordPanel user={effectiveUser} />;
    return <MyProfilePanel onProfileLoaded={setSavedProfile} />;
  }, [activeSection, effectiveUser, isLoaded, isSignedIn]);

  async function handleLogout() {
    setLoggingOut(true);
    await signOut();
    setLoggingOut(false);
  }

  return (
    <>
      <AccountBootstrap />
      <section className={styles.section}>
        <div className={`${styles.accountLayout} site-container`}>
          <aside className={styles.accountSidebar} aria-label="Account navigation">
            <div className={styles.accountSidebarHeader}>
              <span className={styles.accountAvatar}>{profileInitial(effectiveUser)}</span>
              <div>
                <strong>My Account</strong>
                <small>{displayValue(profileData(effectiveUser).email, "Signed customer")}</small>
              </div>
            </div>

            <nav className={styles.accountNav}>
              {profileSections.map((item) => (
                <AccountNavButton
                  key={item.id}
                  active={activeSection === item.id}
                  icon={item.icon}
                  onClick={() => setActiveSection(item.id)}
                >
                  {item.label}
                </AccountNavButton>
              ))}
              {secureSections.map((item) => (
                <AccountNavButton
                  key={item.id}
                  active={activeSection === item.id}
                  icon={item.icon}
                  onClick={() => setActiveSection(item.id)}
                >
                  {item.label}
                </AccountNavButton>
              ))}
              <button className={`${styles.accountNavItem} ${styles.accountLogout}`} type="button" disabled={loggingOut} onClick={handleLogout}>
                {loggingOut ? <Loader2 className={styles.spinIcon} aria-hidden="true" size={18} /> : <LogOut aria-hidden="true" size={18} />}
                <span>{loggingOut ? "Logging out..." : "Logout"}</span>
              </button>
            </nav>
          </aside>

          <div className={styles.accountContent}>{panel}</div>
        </div>
      </section>
    </>
  );
}

export function AccountHub() {
  const configured = useAuthConfigured();

  if (configured) return <ConnectedAccountHub />;

  return (
    <section className={styles.section}>
      <div className="site-container">
        <article className={styles.accountPanel}>
          <div className={styles.accountNotice}>
            <KeyRound aria-hidden="true" size={21} />
            <div>
              <h3 className="font-display">Secure sign-in is ready for its private keys.</h3>
              <p>The account system is connected in the website. Add the authentication keys to open registration.</p>
              <button className={buttonClassName({ size: "md" })} type="button" onClick={() => window.dispatchEvent(new CustomEvent("dsg:open-auth"))}>Open login</button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
