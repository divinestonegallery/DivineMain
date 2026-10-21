"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Bell, ClipboardList, RefreshCw, Search } from "lucide-react";
import { ApiError, apiRequest } from "@shared/utils/http";
import { useToast } from "@shared/components/toast";
import {
  type AdminList,
  type AdminPagination,
  asAdminList,
  label,
  requestPageSize,
  statusTone,
  when,
} from "@/components/common/admin-records";
import styles from "@/components/common/commerce-operations.module.css";

type Person = { id: number; name?: string | null; email?: string | null; role?: string };
type LeadStatus = "new" | "contacted" | "qualified" | "quoted" | "won" | "lost";
type LeadRecord = {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  summary?: string;
  source?: string;
  touchpoint?: string;
  landing_path?: string;
  utm_source?: string;
  utm_campaign?: string;
  google_ads?: {
    form_id?: string;
    campaign_id?: string;
    gcl_id?: string;
    submitted_at?: string | null;
  } | null;
  status: LeadStatus;
  lost_reason?: string;
  assigned_to?: Person | null;
  created_by?: Person | null;
  follow_up_at?: string | null;
  allowed_statuses?: LeadStatus[];
  notes?: LeadNote[];
  created_at?: string;
  updated_at?: string;
};
type LeadNote = { id: number; body: string; author?: Person | null; created_at?: string };
type LeadActivity = {
  id: number;
  action: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  actor?: Person | null;
  created_at?: string;
};
type LeadAccess = { id: number; role: string; permissions: string[] };
type DuplicateWarning = {
  code: string;
  matches: Array<{ uid: string; name: string; status: string; city?: string; source?: string }>;
  hidden_match_count: number;
};
type LeadNotification = {
  id: number;
  kind: string;
  title: string;
  message: string;
  lead_uid?: string;
  read_at?: string | null;
  created_at?: string;
};

const statuses: LeadStatus[] = ["new", "contacted", "qualified", "quoted", "won", "lost"];

function allows(access: LeadAccess | null, code: string) {
  return Boolean(access?.permissions?.includes(code));
}

function personName(person?: Person | null) {
  return person?.name || person?.email || "Unassigned";
}

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function leadQuery(page: number, status: string, followUp: string, search: string, source: string, assignment: string) {
  const params = new URLSearchParams({ page: String(page), page_size: String(requestPageSize) });
  if (status !== "all") params.set("status", status);
  if (followUp !== "all") params.set("follow_up", followUp);
  if (source !== "all") params.set("source", source);
  if (assignment === "unassigned") params.set("assignment", "unassigned");
  if (search.trim()) params.set("search", search.trim());
  return `/api/admin/leads?${params.toString()}`;
}

function PaginationControls({
  pagination,
  loading,
  onPageChange,
}: {
  pagination?: AdminPagination;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  const page = Math.max(1, pagination?.page ?? 1);
  const totalPages = Math.max(1, pagination?.total_pages ?? 1);
  const totalItems = pagination?.total_items ?? 0;
  if (totalPages <= 1 && !totalItems) return null;
  return (
    <div className={styles.pagination}>
      <button className={styles.secondary} type="button" onClick={() => onPageChange(page - 1)} disabled={loading || page <= 1}>Previous</button>
      <span>Page {page} of {totalPages}{totalItems ? ` - ${totalItems} total` : ""}</span>
      <button className={styles.secondary} type="button" onClick={() => onPageChange(page + 1)} disabled={loading || page >= totalPages}>Next</button>
    </div>
  );
}

function LeadDetail({
  lead,
  access,
  assignees,
  onChanged,
}: {
  lead: LeadRecord;
  access: LeadAccess;
  assignees: Person[];
  onChanged: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [detail, setDetail] = useState<LeadRecord>(lead);
  const [activity, setActivity] = useState<LeadActivity[]>([]);
  const [saving, setSaving] = useState(false);
  const canStatus = allows(access, "leads.update_status");
  const canNote = allows(access, "leads.add_note");
  const canFollowUp = allows(access, "leads.manage_follow_up");
  const canAssign = allows(access, "leads.assign");
  const canActivity = allows(access, "leads.view_activity");

  const loadDetail = useCallback(async () => {
    const [nextLead, nextActivity] = await Promise.all([
      apiRequest<LeadRecord>(`/api/admin/leads/${lead.uid}`),
      canActivity
        ? apiRequest<AdminList<LeadActivity>>(`/api/admin/leads/${lead.uid}/activity`)
        : Promise.resolve({ items: [] }),
    ]);
    setDetail(nextLead);
    setActivity(nextActivity.items ?? []);
  }, [canActivity, lead.uid]);

  useEffect(() => {
    void loadDetail().catch((reason) => {
      showToast(reason instanceof Error ? reason.message : "Lead details could not be loaded.");
    });
  }, [loadDetail, showToast]);

  async function saveLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = String(form.get("status") || detail.status);
    const body: Record<string, unknown> = {};
    if (canStatus && status !== detail.status) {
      body.status = status;
      if (status === "lost") body.lost_reason = String(form.get("lost_reason") || "").trim();
    }
    if (canFollowUp) {
      const nextFollowUp = fromLocalInput(String(form.get("follow_up_at") || ""));
      const currentFollowUp = detail.follow_up_at ? new Date(detail.follow_up_at).toISOString() : null;
      if (nextFollowUp !== currentFollowUp) body.follow_up_at = nextFollowUp;
    }
    if (!Object.keys(body).length) return;
    setSaving(true);
    try {
      await apiRequest(`/api/admin/leads/${lead.uid}`, { method: "PATCH", body: JSON.stringify(body) });
      showToast("Lead updated.");
      await loadDetail();
      await onChanged();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Lead could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body") || "").trim();
    if (!body) return;
    setSaving(true);
    try {
      await apiRequest(`/api/admin/leads/${lead.uid}/notes`, { method: "POST", body: JSON.stringify({ body }) });
      form.reset();
      showToast("Note added.");
      await loadDetail();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Note could not be added.");
    } finally {
      setSaving(false);
    }
  }

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = String(new FormData(event.currentTarget).get("assigned_to") || "");
    setSaving(true);
    try {
      await apiRequest(`/api/admin/leads/${lead.uid}/assignment`, {
        method: "POST",
        body: JSON.stringify({ assigned_to: selected ? Number(selected) : null }),
      });
      showToast("Assignment updated.");
      await loadDetail();
      await onChanged();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Assignment could not be changed.");
    } finally {
      setSaving(false);
    }
  }

  const statusOptions = detail.allowed_statuses?.length ? detail.allowed_statuses : [detail.status];

  return (
    <div className={styles.recordBody}>
      <div className={styles.detailGrid}>
        <section>
          <h3>Contact</h3>
          <p><strong>Email:</strong> {detail.email || "Not supplied"}</p>
          <p><strong>Phone:</strong> {detail.phone || "Not supplied"}</p>
          <p><strong>City:</strong> {detail.city || "Not supplied"}</p>
        </section>
        <section>
          <h3>Enquiry</h3>
          <p>{detail.summary || "No summary supplied."}</p>
          <p><strong>Source:</strong> {label(detail.source)}{detail.touchpoint ? ` · ${label(detail.touchpoint)}` : ""}</p>
          {detail.landing_path ? <p><strong>Page:</strong> {detail.landing_path}</p> : null}
          {detail.utm_source || detail.utm_campaign ? <p><strong>Campaign:</strong> {[detail.utm_source, detail.utm_campaign].filter(Boolean).join(" / ")}</p> : null}
          {detail.google_ads?.campaign_id ? <p><strong>Google campaign:</strong> {detail.google_ads.campaign_id}</p> : null}
          {detail.google_ads?.gcl_id ? <p><strong>Google click ID:</strong> {detail.google_ads.gcl_id}</p> : null}
          <p><strong>Created by:</strong> {personName(detail.created_by)}</p>
        </section>
        <section>
          <h3>Follow-up</h3>
          <p><strong>Due:</strong> {detail.follow_up_at ? when(detail.follow_up_at) : "Not scheduled"}</p>
          {detail.lost_reason ? <p><strong>Loss reason:</strong> {detail.lost_reason}</p> : null}
        </section>
      </div>

      <form className={styles.fieldGrid} onSubmit={saveLead}>
        <label>
          <span>Status</span>
          <select name="status" defaultValue={detail.status} disabled={!canStatus || saving} aria-label="Lead status">
            {statusOptions.map((status) => <option value={status} key={status}>{label(status)}</option>)}
          </select>
        </label>
        <label>
          <span>Loss reason</span>
          <input name="lost_reason" defaultValue={detail.lost_reason || ""} disabled={!canStatus || saving} />
        </label>
        <label>
          <span>Follow-up</span>
          <input name="follow_up_at" type="datetime-local" defaultValue={toLocalInput(detail.follow_up_at)} disabled={!canFollowUp || saving} />
        </label>
        <div className={styles.actions}>
          <button className={styles.primary} type="submit" disabled={saving || (!canStatus && !canFollowUp)}>{saving ? "Saving..." : "Save lead"}</button>
        </div>
      </form>

      {canAssign ? (
        <form className={styles.fieldGrid} onSubmit={assign}>
          <label className={styles.wide}>
            <span>Assign to</span>
            <select name="assigned_to" defaultValue={detail.assigned_to?.id ?? ""} disabled={saving} aria-label="Assign lead">
              <option value="">Unassigned</option>
              {assignees.map((person) => (
                <option value={person.id} key={person.id}>{person.name || person.email}</option>
              ))}
            </select>
          </label>
          <button className={styles.secondary} type="submit" disabled={saving}>Update assignment</button>
        </form>
      ) : <p><strong>Assigned to:</strong> {personName(detail.assigned_to)}</p>}

      <section>
        <h3>Notes</h3>
        {(detail.notes ?? []).map((note) => (
          <p key={note.id}><strong>{personName(note.author)}:</strong> {note.body} <em>{when(note.created_at)}</em></p>
        ))}
        {!detail.notes?.length ? <p>No notes yet.</p> : null}
        {canNote ? (
          <form className={styles.fieldGrid} onSubmit={addNote}>
            <label className={styles.wide}><span>Add a note</span><textarea name="body" rows={3} required /></label>
            <button className={styles.secondary} type="submit" disabled={saving}>Add note</button>
          </form>
        ) : null}
      </section>

      {canActivity ? (
        <section>
          <h3>Activity</h3>
          {activity.map((item) => (
            <p key={item.id}>
              <strong>{label(item.action)}</strong>
              {item.field_name ? ` · ${label(item.field_name)}` : ""}
              {item.old_value || item.new_value ? `: ${item.old_value || "—"} → ${item.new_value || "—"}` : ""}
              {" · "}{personName(item.actor)} · {when(item.created_at)}
            </p>
          ))}
          {!activity.length ? <p>No activity yet.</p> : null}
        </section>
      ) : null}
    </div>
  );
}

export function LeadsAdmin() {
  const { showToast } = useToast();
  const [access, setAccess] = useState<LeadAccess | null>(null);
  const [list, setList] = useState(() => asAdminList<LeadRecord>([], 1));
  const [notifications, setNotifications] = useState<LeadNotification[]>([]);
  const [assignees, setAssignees] = useState<Person[]>([]);
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [assignment, setAssignment] = useState("all");
  const [followUp, setFollowUp] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<DuplicateWarning | null>(null);
  const [pendingCreate, setPendingCreate] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextAccess = await apiRequest<LeadAccess>("/api/admin/leads/access");
      setAccess(nextAccess);
      if (!nextAccess.permissions?.includes("leads.access")) {
        setList(asAdminList<LeadRecord>([], page));
        setNotifications([]);
        return;
      }
      const requests: Array<Promise<unknown>> = [
        apiRequest<AdminList<LeadRecord>>(leadQuery(page, status, followUp, search, source, assignment)),
        apiRequest<AdminList<LeadNotification>>("/api/admin/notifications?page_size=10"),
      ];
      if (nextAccess.permissions.includes("leads.assign")) {
        requests.push(apiRequest<{ items: Person[] }>("/api/admin/leads/assignees"));
      }
      const [leadPayload, notificationPayload, assigneePayload] = await Promise.all(requests);
      setList(asAdminList(leadPayload as AdminList<LeadRecord>, page));
      setNotifications((notificationPayload as AdminList<LeadNotification>).items ?? []);
      setAssignees(assigneePayload ? (assigneePayload as { items: Person[] }).items ?? [] : []);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Leads could not be loaded.";
      setError(message);
      showToast(message);
    } finally {
      setLoading(false);
    }
  }, [assignment, followUp, page, search, showToast, source, status]);

  useEffect(() => {
    const task = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(task);
  }, [load]);

  async function createLead(payload: Record<string, unknown>) {
    try {
      await apiRequest("/api/admin/leads", { method: "POST", body: JSON.stringify(payload) });
      setDuplicate(null);
      setPendingCreate(null);
      showToast("Lead created.");
      await load();
      return true;
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) {
        const warning = reason.details as DuplicateWarning;
        if (warning?.code === "duplicate_warning") {
          setPendingCreate(payload);
          setDuplicate(warning);
          return false;
        }
      }
      showToast(reason instanceof Error ? reason.message : "Lead could not be created.");
      return false;
    }
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload: Record<string, unknown> = {
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      phone: String(data.get("phone") || ""),
      city: String(data.get("city") || ""),
      summary: String(data.get("summary") || ""),
    };
    const followUpValue = String(data.get("follow_up_at") || "");
    if (followUpValue) payload.follow_up_at = fromLocalInput(followUpValue);
    if (allows(access, "leads.assign")) {
      const selected = String(data.get("assigned_to") || "");
      payload.assigned_to = selected ? Number(selected) : null;
    }
    const created = await createLead(payload);
    if (created) form.reset();
  }

  async function markRead(notification: LeadNotification) {
    try {
      await apiRequest(`/api/admin/notifications/${notification.id}/read`, { method: "POST" });
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Notification could not be updated.");
    }
  }

  if (access && !allows(access, "leads.access")) {
    return <p className={styles.empty}>Your account does not have access to the lead desk. An administrator can add you to a security group that includes lead access.</p>;
  }

  return (
    <section className={styles.section}>
      <div className={styles.metrics}>
        <article><ClipboardList size={19} /><span><small>Leads in view</small><strong>{list.pagination.total_items ?? list.items.length}</strong></span></article>
        <article><Bell size={19} /><span><small>Unread reminders</small><strong>{notifications.filter((item) => !item.read_at).length}</strong></span></article>
      </div>

      {notifications.length ? (
        <div className={styles.list}>
          {notifications.map((item) => (
            <article className={styles.record} key={item.id}>
              <div className={styles.recordBody}>
                <p><strong>{item.title}</strong> — {item.message}</p>
                <p>{when(item.created_at)}{item.read_at ? " · Read" : ""}</p>
                {!item.read_at ? <button className={styles.secondary} type="button" onClick={() => void markRead(item)}>Mark read</button> : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {allows(access, "leads.create") ? (
        <form className={styles.createForm} onSubmit={submitCreate}>
          <label><span>Name</span><input name="name" required minLength={2} /></label>
          <label><span>Email</span><input name="email" type="email" /></label>
          <label><span>Phone</span><input name="phone" /></label>
          <label><span>City</span><input name="city" /></label>
          <label className={styles.wide}><span>Interest</span><input name="summary" required minLength={2} /></label>
          <label><span>Follow-up</span><input name="follow_up_at" type="datetime-local" /></label>
          {allows(access, "leads.assign") ? (
            <label>
              <span>Assign to</span>
              <select name="assigned_to" defaultValue={access?.role === "admin" ? "" : access?.id ?? ""} aria-label="Assign new lead">
                {access?.role === "admin" ? <option value="">Leave unassigned</option> : null}
                {assignees.map((person) => <option value={person.id} key={person.id}>{person.name || person.email}</option>)}
              </select>
            </label>
          ) : null}
          <button className={styles.primary} type="submit">Create lead</button>
        </form>
      ) : null}

      {duplicate ? (
        <section className={styles.record} role="alert">
          <div className={styles.recordBody}>
            <p className={styles.warning}>An open lead already matches this email or phone. Creating another lead keeps both enquiries separate.</p>
            {duplicate.matches.map((match) => (
              <p key={match.uid}><strong>{match.name}</strong> · {label(match.status)}{match.city ? ` · ${match.city}` : ""}</p>
            ))}
            {duplicate.hidden_match_count ? <p>{duplicate.hidden_match_count} matching open lead{duplicate.hidden_match_count === 1 ? " is" : "s are"} outside your access.</p> : null}
            <div className={styles.actions}>
              <button className={styles.primary} type="button" onClick={() => pendingCreate && void createLead({ ...pendingCreate, confirm_duplicate: true })}>Create a separate lead</button>
              <button className={styles.secondary} type="button" onClick={() => { setDuplicate(null); setPendingCreate(null); }}>Cancel</button>
            </div>
          </div>
        </section>
      ) : null}

      <div className={styles.toolbar}>
        <label><Search size={17} /><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, email, phone, or interest" aria-label="Search leads" /></label>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter lead status">
          <option value="all">All statuses</option>
          {statuses.map((value) => <option value={value} key={value}>{label(value)}</option>)}
        </select>
        <select value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }} aria-label="Filter lead source">
          <option value="all">All sources</option>
          <option value="manual">Manual</option>
          <option value="website">Website</option>
          <option value="google_ads">Google Ads</option>
        </select>
        <select value={assignment} onChange={(event) => { setAssignment(event.target.value); setPage(1); }} aria-label="Filter assignment">
          <option value="all">All assignees</option>
          <option value="unassigned">Unassigned</option>
        </select>
        <select value={followUp} onChange={(event) => { setFollowUp(event.target.value); setPage(1); }} aria-label="Filter follow-up">
          <option value="all">All follow-ups</option>
          <option value="overdue">Overdue</option>
          <option value="upcoming">Upcoming</option>
        </select>
        <button className={styles.secondary} type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} />{loading ? "Loading..." : "Refresh"}</button>
      </div>

      <div className={styles.list}>
        {loading ? <p className={styles.empty}>Loading leads...</p> : null}
        {!loading && error ? <p className={styles.empty}>{error}</p> : null}
        {!loading && !error && access && list.items.map((lead) => (
          <details className={styles.record} key={lead.uid}>
            <summary>
              <span className={styles.identity}>
                <strong>{lead.name}</strong>
                <small>{label(lead.source)}{lead.touchpoint ? ` · ${label(lead.touchpoint)}` : ""} · {lead.email || "No email"}{lead.phone ? ` · ${lead.phone}` : ""} · {personName(lead.assigned_to)}</small>
              </span>
              <span>{lead.follow_up_at ? when(lead.follow_up_at) : "No follow-up"}</span>
              <span className={`${styles.pill} ${statusTone(lead.status)}`}>{label(lead.status)}</span>
            </summary>
            <LeadDetail lead={lead} access={access} assignees={assignees} onChanged={load} />
          </details>
        ))}
        {!loading && !error && !list.items.length ? <p className={styles.empty}>No leads found.</p> : null}
      </div>
      <PaginationControls pagination={list.pagination} loading={loading} onPageChange={setPage} />
    </section>
  );
}
