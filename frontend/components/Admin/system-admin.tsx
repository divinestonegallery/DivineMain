// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, History, Save, ShieldCheck, ShieldOff, UserRoundCog } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import styles from "./system-admin.module.css";

type Setting = { key: string; label: string; group: string; value: string; defaultValue: string; updatedAt: number | null };
type Person = { id: string; email: string | null; displayName: string; userStatus: string; staffId: string | null; staffStatus: "invited" | "active" | "disabled" | null; accessLevel: string | null; createdAt: number };
type Audit = { id: string; actorUserId: string | null; action: string; entityType: string; entityId: string | null; createdAt: number };
type Data = { settings: Setting[]; users: Person[]; audit: Audit[] };

async function patch(body: object) { const response = await fetch("/api/v1/admin/system", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); if (!response.ok) throw new Error(); return (await response.json() as { data: Data }).data; }
function when(timestamp: number) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp * 1000); }

export function SettingsAdmin() {
  const { showToast } = useToast(); const [data, setData] = useState<Data | null>(null); const [values, setValues] = useState<Record<string, string>>({}); const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => { void fetch("/api/v1/admin/system").then((response) => response.json()).then(({ data: value }: { data: Data }) => { setData(value); setValues(Object.fromEntries(value.settings.map((item) => [item.key, item.value]))); }).catch(() => showToast("Settings could not be loaded.")); }, [showToast]);
  const groups = useMemo(() => [...new Set(data?.settings.map((item) => item.group) ?? [])], [data]);
  async function save(item: Setting) { setSaving(item.key); try { setData(await patch({ entity: "setting", key: item.key, value: values[item.key] })); showToast(`${item.label} saved.`); } catch { showToast("Setting could not be saved."); } finally { setSaving(null); } }
  if (!data) return <div className={styles.empty}>Loading gallery settings…</div>;
  return <div className={styles.groups}>{groups.map((group) => <section className={styles.panel} key={group}><header><div><small>Settings group</small><h2>{group}</h2></div><Check size={18} /></header><div className={styles.settingGrid}>{data.settings.filter((item) => item.group === group).map((item) => <label key={item.key}><span>{item.label}</span>{item.value === "true" || item.value === "false" ? <select value={values[item.key]} onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.value }))}><option value="true">Enabled</option><option value="false">Disabled</option></select> : <input value={values[item.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.value }))} />}<button onClick={() => void save(item)} disabled={saving === item.key || values[item.key] === item.value}><Save size={14} />Save</button></label>)}</div></section>)}</div>;
}

export function StaffSecurityAdmin() {
  const { showToast } = useToast(); const [data, setData] = useState<Data | null>(null); const [currentUserId, setCurrentUserId] = useState(""); const [tab, setTab] = useState<"staff" | "audit">("staff");
  useEffect(() => { void fetch("/api/v1/admin/system").then((response) => response.json()).then(({ data: value, currentUserId: current }: { data: Data; currentUserId: string }) => { setData(value); setCurrentUserId(current); }).catch(() => showToast("Staff records could not be loaded.")); }, [showToast]);
  async function change(person: Person) { const status = person.staffStatus === "active" ? "disabled" : "active"; try { setData(await patch({ entity: "staff", userId: person.id, status })); showToast(status === "active" ? `${person.displayName} now has full staff access.` : `${person.displayName} was removed from staff access.`); } catch { showToast("Staff access could not be changed. Your own access cannot be disabled."); } }
  if (!data) return <div className={styles.empty}>Loading staff security…</div>;
  return <><div className={styles.tabs}><button className={tab === "staff" ? styles.active : ""} onClick={() => setTab("staff")}><UserRoundCog size={16} />Staff accounts</button><button className={tab === "audit" ? styles.active : ""} onClick={() => setTab("audit")}><History size={16} />Audit history</button></div>{tab === "staff" ? <section className={styles.panel}><header><div><small>Account security</small><h2>Full-access staff</h2></div><ShieldCheck size={19} /></header><p className={styles.note}>Only activate people you trust. Every active staff member can manage products, orders, customers, content and settings.</p><div className={styles.people}>{data.users.map((person) => <article key={person.id}><span className={person.staffStatus === "active" ? styles.avatarActive : styles.avatar}>{person.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{person.displayName}</strong><small>{person.email ?? "No email"}{person.id === currentUserId ? " · You" : ""}</small></div><em className={person.staffStatus === "active" ? styles.enabled : styles.disabled}>{person.staffStatus === "active" ? "Full access" : "Customer only"}</em><button onClick={() => void change(person)} disabled={person.id === currentUserId}>{person.staffStatus === "active" ? <><ShieldOff size={15} />Disable staff</> : <><ShieldCheck size={15} />Make staff</>}</button></article>)}</div></section> : <section className={styles.panel}><header><div><small>Security record</small><h2>Recent administrative activity</h2></div><History size={19} /></header><div className={styles.audit}>{data.audit.map((item) => <article key={item.id}><span>{item.action.replaceAll(".", " · ")}</span><small>{item.entityType}{item.entityId ? ` · ${item.entityId}` : ""}</small><time>{when(item.createdAt)}</time></article>)}</div></section>}</>;
}
