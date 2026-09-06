// @ts-nocheck
"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Hammer,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { requestPasswordReset, updateCurrentUserProfile } from "@/api/auth";
import { AccountBootstrap } from "@/components/Auth/account-bootstrap";
import { useAuth, useUser } from "@/components/Auth/auth-facade";
import { useAuthConfigured } from "@/components/Auth/auth-provider";
import { Button, buttonClassName } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import styles from "./customer-page.module.css";

type AccountSection = "profile" | "personal" | "address" | "password" | "security";

const profileSections: Array<{ id: AccountSection; label: string; icon: ReactNode }> = [
  { id: "profile", label: "My Profile", icon: <UserRound aria-hidden="true" size={18} /> },
  { id: "personal", label: "Personal Information", icon: <Mail aria-hidden="true" size={18} /> },
  { id: "address", label: "Address", icon: <MapPin aria-hidden="true" size={18} /> },
];

const secureSections: Array<{ id: AccountSection; label: string; icon: ReactNode }> = [
  { id: "password", label: "Change Password", icon: <KeyRound aria-hidden="true" size={18} /> },
  { id: "security", label: "Account Security", icon: <ShieldCheck aria-hidden="true" size={18} /> },
];

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function profileData(user: any) {
  return user?.user ?? user ?? {};
}

function splitName(name: unknown) {
  const parts = cleanText(name).split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function combineName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

function displayValue(value: unknown, fallback = "Not provided") {
  const text = cleanText(value);
  return text || fallback;
}

function displayDate(value: unknown) {
  const text = cleanText(value);
  if (!text) return "Not available";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
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

function MyProfilePanel({ user, loading }: { user: any; loading: boolean }) {
  const profile = profileData(user);
  const name = displayValue(profile.name, "Gallery customer");
  const email = displayValue(profile.email);
  const phone = displayValue(profile.phone);

  return (
    <article className={styles.accountPanel}>
      <header className={styles.accountPanelHeader}>
        <div>
          <p className={styles.eyebrow}>My Profile</p>
          <h2 className="font-display">{loading ? "Loading profile..." : `Namaste, ${name}.`}</h2>
          <p>Your profile details are loaded from the existing Divine Stone Gallery customer API.</p>
        </div>
        <span className={styles.accountAvatar}>{loading ? "..." : profileInitial(profile)}</span>
      </header>

      <div className={styles.profileSummaryGrid} aria-busy={loading}>
        <div>
          <small>Name</small>
          <strong>{loading ? "Loading..." : name}</strong>
        </div>
        <div>
          <small>Email Address</small>
          <strong>{loading ? "Loading..." : email}</strong>
        </div>
        <div>
          <small>Phone Number</small>
          <strong>{loading ? "Loading..." : phone}</strong>
        </div>
        <div>
          <small>Account Role</small>
          <strong>{loading ? "Loading..." : displayValue(profile.role, "Customer")}</strong>
        </div>
      </div>
    </article>
  );
}

function PersonalInformationPanel({
  user,
  loading,
  onProfileSaved,
  onRefresh,
}: {
  user: any;
  loading: boolean;
  onProfileSaved: (profile: any) => void;
  onRefresh: () => Promise<void>;
}) {
  const profile = profileData(user);
  const { showToast } = useToast();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const parts = splitName(profile.name);
    setForm({
      firstName: parts.firstName,
      lastName: parts.lastName,
      email: cleanText(profile.email),
      phone: cleanText(profile.phone),
    });
  }, [profile.email, profile.name, profile.phone]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    const nextName = combineName(form.firstName, form.lastName);
    const nextPhone = cleanText(form.phone);
    const patch: Record<string, string> = {};

    if (nextName !== cleanText(profile.name)) patch.name = nextName;
    if (nextPhone !== cleanText(profile.phone)) patch.phone = nextPhone;

    if (!Object.keys(patch).length) {
      setFeedback({ type: "success", message: "Your personal information is already up to date." });
      setSaving(false);
      return;
    }

    try {
      const updated = await updateCurrentUserProfile(patch);
      onProfileSaved(updated);
      const parts = splitName(updated?.name ?? nextName);
      setForm({
        firstName: parts.firstName,
        lastName: parts.lastName,
        email: cleanText(updated?.email) || form.email,
        phone: cleanText(updated?.phone) || nextPhone,
      });
      setFeedback({ type: "success", message: "Your profile has been updated." });
      showToast("Profile information saved.");
      await onRefresh().catch(() => {});
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
          <p className={styles.eyebrow}>Personal Information</p>
          <h2 className="font-display">Update Personal Information</h2>
          <p>Only name and phone are editable because those are the fields supported by the current profile update API.</p>
        </div>
      </header>

      <form className={styles.accountForm} onSubmit={handleSubmit} aria-busy={saving || loading}>
        <div className={styles.accountFormGrid}>
          <label>
            <span>First Name</span>
            <input
              value={form.firstName}
              autoComplete="given-name"
              maxLength={120}
              disabled={saving || loading}
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
            />
          </label>
          <label>
            <span>Last Name</span>
            <input
              value={form.lastName}
              autoComplete="family-name"
              maxLength={120}
              disabled={saving || loading}
              onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
            />
          </label>
        </div>

        <label>
          <span>Email Address</span>
          <input value={form.email} type="email" autoComplete="email" readOnly aria-describedby="account-email-note" />
          <small id="account-email-note">Email is managed by the existing sign-in profile and is not editable from this endpoint.</small>
        </label>

        <label>
          <span>Phone Number</span>
          <input
            value={form.phone}
            type="tel"
            autoComplete="tel"
            maxLength={30}
            disabled={saving || loading}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
        </label>

        {feedback ? <FeedbackMessage type={feedback.type}>{feedback.message}</FeedbackMessage> : null}

        <Button type="submit" size="md" disabled={saving || loading}>
          {saving ? <Loader2 className={styles.spinIcon} aria-hidden="true" size={17} /> : null}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </article>
  );
}

function AddressPanel({ user }: { user: any }) {
  const profile = profileData(user);
  const knownAddress = [
    ["Address", profile.address || profile.address_line1 || profile.street_address],
    ["City", profile.city],
    ["State", profile.state],
    ["Postal Code", profile.postal_code || profile.pincode || profile.zip],
    ["Country", profile.country],
  ].filter(([, value]) => cleanText(value));

  return (
    <article className={styles.accountPanel}>
      <header className={styles.accountPanelHeader}>
        <div>
          <p className={styles.eyebrow}>Address</p>
          <h2 className="font-display">Address details</h2>
          <p>Saved address fields are shown here when they are returned by the existing profile API.</p>
        </div>
      </header>

      {knownAddress.length ? (
        <div className={styles.profileSummaryGrid}>
          {knownAddress.map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <strong>{displayValue(value)}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.accountNotice}>
          <MapPin aria-hidden="true" size={21} />
          <div>
            <h3 className="font-display">No saved address fields are available yet.</h3>
            <p>The current backend customer profile returns name, email, phone, role and account status. It does not expose an address save/update endpoint.</p>
            <Link className={buttonClassName({ variant: "outline", size: "md" })} href="/contact">Share address with the gallery</Link>
          </div>
        </div>
      )}
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

function AccountSecurityPanel({ user }: { user: any }) {
  const profile = profileData(user);
  const active = profile.is_active !== false;

  return (
    <article className={styles.accountPanel}>
      <header className={styles.accountPanelHeader}>
        <div>
          <p className={styles.eyebrow}>Account Security</p>
          <h2 className="font-display">Security status</h2>
          <p>Security information is limited to the fields exposed by the existing authenticated profile endpoint.</p>
        </div>
      </header>

      <div className={styles.profileSummaryGrid}>
        <div>
          <small>Profile Status</small>
          <strong>{active ? "Active" : "Inactive"}</strong>
        </div>
        <div>
          <small>Role</small>
          <strong>{displayValue(profile.role, "Customer")}</strong>
        </div>
        <div>
          <small>Created</small>
          <strong>{displayDate(profile.created_at)}</strong>
        </div>
        <div>
          <small>Last Updated</small>
          <strong>{displayDate(profile.updated_at)}</strong>
        </div>
      </div>
    </article>
  );
}

function ConnectedAccountHub() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { refresh, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<AccountSection>("profile");
  const [loggingOut, setLoggingOut] = useState(false);
  const [savedProfile, setSavedProfile] = useState<any>(null);
  const effectiveUser = savedProfile ? { ...profileData(user), ...savedProfile } : user;

  useEffect(() => {
    setSavedProfile(null);
  }, [user?.id, user?.updated_at]);

  const panel = useMemo(() => {
    if (!isLoaded) return <MyProfilePanel user={effectiveUser} loading />;
    if (!isSignedIn) {
      return (
        <article className={styles.accountPanel}>
          <div className={styles.accountNotice}>
            <ShieldCheck aria-hidden="true" size={21} />
            <div>
              <h3 className="font-display">Please sign in to view your account.</h3>
              <p>Your private profile opens after authentication is confirmed.</p>
              <Link className={buttonClassName({ size: "md" })} href="/sign-in">Sign in</Link>
            </div>
          </div>
        </article>
      );
    }

    if (activeSection === "personal") {
      return (
        <PersonalInformationPanel
          user={effectiveUser}
          loading={!isLoaded}
          onProfileSaved={setSavedProfile}
          onRefresh={refresh}
        />
      );
    }
    if (activeSection === "address") return <AddressPanel user={effectiveUser} />;
    if (activeSection === "password") return <ChangePasswordPanel user={effectiveUser} />;
    if (activeSection === "security") return <AccountSecurityPanel user={effectiveUser} />;
    return <MyProfilePanel user={effectiveUser} loading={!isLoaded} />;
  }, [activeSection, effectiveUser, isLoaded, isSignedIn, refresh]);

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
              <Link className={styles.accountNavItem} href="/custom-murti">
                <Hammer aria-hidden="true" size={18} />
                <span>Custom Commissions</span>
                <ExternalLink aria-hidden="true" size={15} />
              </Link>
              <Link className={styles.accountNavItem} href="/contact">
                <MessageCircle aria-hidden="true" size={18} />
                <span>Communication</span>
                <ExternalLink aria-hidden="true" size={15} />
              </Link>
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
              <Link className={buttonClassName({ size: "md" })} href="/sign-in">View sign-in</Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
