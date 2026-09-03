// @ts-nocheck
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, History, RefreshCw, ShieldCheck, ShieldOff, UserRoundCog } from "lucide-react";
import { apiRequest } from "@/api/client";
import { useToast } from "@/components/ui/toast";
import styles from "./system-admin.module.css";

type StaffMember = {
  id: number;
  clerk_user_id?: string;
  email?: string;
  name?: string;
  role: "staff" | "admin";
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

type AuditLog = {
  id: number;
  actor_email?: string;
  request_id?: string;
  method?: string;
  path?: string;
  status_code?: number;
  ip_address?: string;
  created_at?: string;
};

type ListResponse<T> = {
  items: T[];
};

function when(value?: string) {
  if (!value) return "Recent";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function SettingsAdmin() {
  return (
    <div className={styles.groups}>
      <section className={styles.panel}>
        <header><div><small>Backend connection</small><h2>Settings are environment-managed</h2></div><Check size={18} /></header>
        <p className={styles.note}>
          This Django backend does not expose a generic admin settings route. Frontend settings are
          now read from environment variables and supported API routes instead of calling a missing
          system endpoint.
        </p>
      </section>
    </div>
  );
}

export function StaffSecurityAdmin() {
  const { showToast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [tab, setTab] = useState<"staff" | "audit">("staff");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffPayload, auditPayload] = await Promise.all([
        apiRequest<ListResponse<StaffMember>>("/api/admin/staff?page_size=50"),
        apiRequest<ListResponse<AuditLog>>("/api/v1/common/operations/audit-logs?page_size=30"),
      ]);
      setStaff(staffPayload.items ?? []);
      setAudit(auditPayload.items ?? []);
    } catch {
      showToast("Staff security records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiRequest<StaffMember>("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email"), role: form.get("role") }),
      });
      event.currentTarget.reset();
      showToast("Staff invitation sent.");
      await load();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Staff invitation could not be sent.");
    }
  }

  async function change(person: StaffMember, body: Record<string, unknown>) {
    try {
      const updated = await apiRequest<StaffMember>(`/api/admin/staff/${person.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setStaff((current) => current.map((item) => item.id === person.id ? updated : item));
      showToast("Staff access updated.");
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Staff access could not be changed.");
    }
  }

  return (
    <>
      <div className={styles.tabs}>
        <button className={tab === "staff" ? styles.active : ""} onClick={() => setTab("staff")}><UserRoundCog size={16} />Staff accounts</button>
        <button className={tab === "audit" ? styles.active : ""} onClick={() => setTab("audit")}><History size={16} />Audit history</button>
        <button onClick={() => void load()} disabled={loading}><RefreshCw size={16} />{loading ? "Loading..." : "Refresh"}</button>
      </div>
      {tab === "staff" ? (
        <section className={styles.panel}>
          <header><div><small>Account security</small><h2>Admin and staff access</h2></div><ShieldCheck size={19} /></header>
          <p className={styles.note}>Staff management uses the existing Django `/api/admin/staff` route and preserves backend authorization rules.</p>
          <form className={styles.settingGrid} onSubmit={invite}>
            <label><span>Email</span><input name="email" type="email" required /></label>
            <label><span>Role</span><select name="role" defaultValue="staff"><option value="staff">Staff</option><option value="admin">Admin</option></select></label>
            <button type="submit">Invite staff</button>
          </form>
          <div className={styles.people}>
            {staff.map((person) => (
              <article key={person.id}>
                <span className={person.is_active ? styles.avatarActive : styles.avatar}>{(person.name || person.email || "?").slice(0, 1).toUpperCase()}</span>
                <div><strong>{person.name || person.email || "Staff member"}</strong><small>{person.email || "No email"} - {person.role}</small></div>
                <em className={person.is_active ? styles.enabled : styles.disabled}>{person.is_active ? "Active" : "Inactive"}</em>
                <button onClick={() => void change(person, { is_active: !person.is_active })}>{person.is_active ? <><ShieldOff size={15} />Disable</> : <><ShieldCheck size={15} />Enable</>}</button>
                <button onClick={() => void change(person, { role: person.role === "admin" ? "staff" : "admin" })}>{person.role === "admin" ? "Make staff" : "Make admin"}</button>
              </article>
            ))}
            {!loading && !staff.length ? <div className={styles.empty}>No staff records found.</div> : null}
          </div>
        </section>
      ) : (
        <section className={styles.panel}>
          <header><div><small>Security record</small><h2>Recent admin activity</h2></div><History size={19} /></header>
          <div className={styles.audit}>
            {audit.map((item) => (
              <article key={item.id}>
                <span>{item.method || "API"} {item.path || "request"}</span>
                <small>{item.actor_email || "Unknown actor"} - {item.status_code || "status pending"}</small>
                <time>{when(item.created_at)}</time>
              </article>
            ))}
            {!loading && !audit.length ? <div className={styles.empty}>No audit log rows found.</div> : null}
          </div>
        </section>
      )}
    </>
  );
}
