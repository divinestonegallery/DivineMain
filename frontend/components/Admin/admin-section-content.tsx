"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleHelp, FileText, Hammer, Mail, Plus, RefreshCw, Search, Star, Trash2 } from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/api/client";
import { SignIn, useUser } from "@/components/Auth/auth-facade";
import { useToast } from "@/components/ui/toast";
import { AdminPageHeader } from "./admin-page-header";
import { AdminShell } from "./admin-shell";
import { AdminState } from "./admin-state";
import { CatalogAdmin } from "./catalog-admin";
import { CatalogStructureAdmin } from "./catalog-structure-admin";
import { StaffSecurityAdmin } from "./system-admin";
import dashboardStyles from "./admin-dashboard.module.css";
import styles from "./commerce-operations.module.css";

export const adminSectionSlugs = [
  "overview",
  "category",
  "deity",
  "material",
  "product",
  "review",
  "faqs",
  "customer-requests",
  "staff",
] as const;

export type AdminSectionSlug = (typeof adminSectionSlugs)[number];

type AdminPagination = {
  page?: number;
  page_size?: number;
  total_items?: number;
  total_pages?: number;
};

type AdminList<T> = {
  items?: T[];
  pagination?: AdminPagination;
};

type ReviewRecord = {
  id: number;
  product?: number;
  user?: number;
  product_name?: string;
  customer_name?: string;
  rating?: number;
  comment?: string;
  status: "pending" | "approved" | "rejected";
  is_approved?: boolean;
  created_at?: string;
  updated_at?: string;
};

type FAQRecord = {
  id: number;
  question?: string;
  answer?: string;
  category?: string | null;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type CustomerRequestBase = {
  id: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  city?: string;
  pincode?: string | null;
  approximate_height?: string | null;
  preferred_material?: string | null;
  description?: string | null;
  reference_image?: string | null;
  reference_object_key?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ContactRequestRecord = CustomerRequestBase & {
  status: "new" | "contacted" | "closed";
  kind: "contact";
};

type CustomizeRequestRecord = CustomerRequestBase & {
  status: "new" | "contacted" | "quoted" | "accepted" | "closed";
  kind: "customize";
};

type CustomerRequestRecord = ContactRequestRecord | CustomizeRequestRecord;

const sectionDetails: Record<Exclude<AdminSectionSlug, "overview">, { eyebrow: string; title: string; description: string }> = {
  category: {
    eyebrow: "Catalogue structure",
    title: "Category",
    description: "Create and update product categories using the existing Django category API.",
  },
  deity: {
    eyebrow: "Catalogue structure",
    title: "Deity",
    description: "Create and update deity filters and product identity records.",
  },
  material: {
    eyebrow: "Catalogue structure",
    title: "Material",
    description: "Create and update stone and finish material records.",
  },
  product: {
    eyebrow: "Catalogue management",
    title: "Product",
    description: "Manage products, taxonomy assignment, publishing status, images, and catalogue metadata.",
  },
  review: {
    eyebrow: "Customer voice",
    title: "Review",
    description: "Moderate submitted reviews with the backend approval workflow.",
  },
  faqs: {
    eyebrow: "Content management",
    title: "FAQs",
    description: "Create, update, order, publish, and deactivate frequently asked questions.",
  },
  "customer-requests": {
    eyebrow: "Customer conversations",
    title: "Customer Requests",
    description: "Review contact messages and custom moorti enquiries from the existing request APIs.",
  },
  staff: {
    eyebrow: "Access control",
    title: "Staff",
    description: "Invite staff, manage admin access, and review security activity.",
  },
};

const reviewStatuses = ["pending", "approved", "rejected"] as const;
const contactStatuses = ["new", "contacted", "closed"] as const;
const customizeStatuses = ["new", "contacted", "quoted", "accepted", "closed"] as const;
const contactTransitions = {
  new: ["new", "contacted", "closed"],
  contacted: ["contacted", "closed"],
  closed: ["closed"],
};
const customizeTransitions = {
  new: ["new", "contacted", "closed"],
  contacted: ["contacted", "quoted", "closed"],
  quoted: ["quoted", "accepted", "closed"],
  accepted: ["accepted", "closed"],
  closed: ["closed"],
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value);
}

function label(value?: string | null) {
  return text(value).replaceAll("_", " ") || "not set";
}

function when(value?: string) {
  if (!value) return "Recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function asItems<T>(payload: AdminList<T> | T[] | null | undefined) {
  if (!payload) return [];
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

function hasAdminRole(user: unknown) {
  const record = user && typeof user === "object" ? user as Record<string, unknown> : {};
  const nested = record.user && typeof record.user === "object" ? record.user as Record<string, unknown> : {};
  const role = text(record.role ?? nested.role).toLowerCase();
  return role === "staff" || role === "admin";
}

function statusTone(value?: string) {
  if (["approved", "accepted", "closed"].includes(text(value))) return styles.good;
  if (["contacted", "quoted", "pending"].includes(text(value))) return styles.pending;
  return styles.bad;
}

function AdminAccess({ section, children }: { section: AdminSectionSlug; children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const redirect = section === "overview" ? "/admin/overview" : `/admin/${section}`;

  if (!isLoaded) return <AdminShell><AdminState reason="loading" /></AdminShell>;
  if (!isSignedIn) {
    return (
      <AdminShell>
        <section className={dashboardStyles.auth}>
          <div>
            <small>Gallery administration</small>
            <h1>Sign in to continue</h1>
            <p>Use the existing account flow. Your backend role determines whether this workspace is available.</p>
          </div>
          <SignIn fallbackRedirectUrl={redirect} />
        </section>
      </AdminShell>
    );
  }
  if (!hasAdminRole(user)) return <AdminShell><AdminState reason="forbidden" /></AdminShell>;
  return <>{children}</>;
}

function ReviewRow({ item, refresh }: { item: ReviewRecord; refresh: () => Promise<void> }) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const status = new FormData(event.currentTarget).get("status")?.toString() || item.status;
    setSaving(true);
    try {
      await apiRequest<ReviewRecord>(`/api/admin/reviews/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      showToast("Review status updated.");
      await refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Review status could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this review permanently?")) return;
    setSaving(true);
    try {
      await apiRequest(`/api/admin/reviews/${item.id}`, { method: "DELETE" });
      showToast("Review deleted.");
      await refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Review could not be deleted.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className={styles.record}>
      <summary>
        <span className={styles.identity}>
          <strong>{item.product_name || `Review #${item.id}`}</strong>
          <small>{item.customer_name || "Customer"}{item.rating ? ` - ${item.rating}/5` : ""}</small>
        </span>
        <span>{when(item.created_at)}</span>
        <span className={`${styles.pill} ${statusTone(item.status)}`}>{label(item.status)}</span>
        <Star size={16} />
      </summary>
      <div className={styles.recordBody}>
        <p>{item.comment || "No review comment supplied."}</p>
        <form className={styles.fieldGrid} onSubmit={save}>
          <label><span>Status</span><select name="status" defaultValue={item.status}>{reviewStatuses.map((status) => <option value={status} key={status}>{label(status)}</option>)}</select></label>
          <label><span>Product ID</span><input value={item.product ?? ""} readOnly disabled /></label>
          <label><span>Customer ID</span><input value={item.user ?? ""} readOnly disabled /></label>
          <label><span>Approved</span><input value={item.is_approved ? "Yes" : "No"} readOnly disabled /></label>
          <div className={`${styles.actions} ${styles.wide}`}>
            <button className={styles.secondary} type="button" onClick={() => void remove()} disabled={saving}><Trash2 size={15} /> Delete</button>
            <button className={styles.primary} type="submit" disabled={saving}>{saving ? "Saving..." : "Save status"}</button>
          </div>
        </form>
      </div>
    </details>
  );
}

function ReviewAdmin() {
  const { showToast } = useToast();
  const [items, setItems] = useState<ReviewRecord[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ReviewRecord["status"]>("all");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const suffix = status === "all" ? "" : `&status=${encodeURIComponent(status)}`;
      const payload = await apiRequest<AdminList<ReviewRecord> | ReviewRecord[]>(`/api/admin/reviews?page_size=100${suffix}`);
      setItems(asItems(payload));
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Reviews could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [showToast, status]);

  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => !needle || `${item.product_name} ${item.customer_name} ${item.comment} ${item.status}`.toLowerCase().includes(needle));
  }, [items, query]);

  return (
    <section className={styles.section}>
      <div className={styles.metrics}>
        <article><Star size={19} /><span><small>Reviews in view</small><strong>{items.length}</strong></span></article>
        <article><AlertTriangle size={19} /><span><small>Pending</small><strong>{items.filter((item) => item.status === "pending").length}</strong></span></article>
        <article><CheckCircle2 size={19} /><span><small>Approved</small><strong>{items.filter((item) => item.status === "approved").length}</strong></span></article>
        <article><Trash2 size={19} /><span><small>Rejected</small><strong>{items.filter((item) => item.status === "rejected").length}</strong></span></article>
      </div>
      <div className={styles.toolbar}>
        <label><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reviews" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Filter review status">
          <option value="all">All reviews</option>
          {reviewStatuses.map((value) => <option value={value} key={value}>{label(value)}</option>)}
        </select>
        <button className={styles.secondary} type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} />{loading ? "Loading..." : "Refresh"}</button>
      </div>
      <div className={styles.list}>
        {filtered.map((item) => <ReviewRow item={item} refresh={refresh} key={item.id} />)}
        {!loading && !filtered.length ? <p className={styles.empty}>No reviews found.</p> : null}
      </div>
    </section>
  );
}

function faqPayload(form: FormData) {
  return {
    question: text(form.get("question")),
    answer: text(form.get("answer")),
    category: text(form.get("category")),
    display_order: Number(form.get("display_order") || 0),
    is_active: form.get("is_active") === "on",
  };
}

function FAQRow({ item, refresh }: { item: FAQRecord; refresh: () => Promise<void> }) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest<FAQRecord>(`/api/admin/faqs/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify(faqPayload(new FormData(event.currentTarget))),
      });
      showToast("FAQ updated.");
      await refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "FAQ could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    if (!window.confirm("Deactivate this FAQ?")) return;
    setSaving(true);
    try {
      await apiRequest(`/api/admin/faqs/${item.id}`, { method: "DELETE" });
      showToast("FAQ deactivated.");
      await refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "FAQ could not be deactivated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className={styles.record}>
      <summary>
        <span className={styles.identity}>
          <strong>{item.question || `FAQ #${item.id}`}</strong>
          <small>{item.category || "General"} - order {item.display_order ?? 0}</small>
        </span>
        <span>{when(item.updated_at || item.created_at)}</span>
        <span className={`${styles.pill} ${item.is_active === false ? styles.pending : styles.good}`}>{item.is_active === false ? "Inactive" : "Active"}</span>
        <CircleHelp size={16} />
      </summary>
      <div className={styles.recordBody}>
        <form className={styles.fieldGrid} onSubmit={save}>
          <label className={styles.wide}><span>Question</span><textarea name="question" defaultValue={item.question || ""} required /></label>
          <label className={styles.wide}><span>Answer</span><textarea name="answer" defaultValue={item.answer || ""} required rows={4} /></label>
          <label><span>Category</span><input name="category" defaultValue={item.category || ""} /></label>
          <label><span>Display order</span><input name="display_order" type="number" min="0" defaultValue={item.display_order ?? 0} /></label>
          <label><span>Created</span><input value={when(item.created_at)} readOnly disabled /></label>
          <label className={styles.checkField}><input name="is_active" type="checkbox" defaultChecked={item.is_active !== false} /><span>Active</span></label>
          <div className={`${styles.actions} ${styles.wide}`}>
            <button className={styles.secondary} type="button" onClick={() => void deactivate()} disabled={saving}>Deactivate</button>
            <button className={styles.primary} type="submit" disabled={saving}>{saving ? "Saving..." : "Save FAQ"}</button>
          </div>
        </form>
      </div>
    </details>
  );
}

function FAQsAdmin() {
  const { showToast } = useToast();
  const [items, setItems] = useState<FAQRecord[]>([]);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiRequest<FAQRecord[] | AdminList<FAQRecord>>("/api/admin/faqs");
      setItems(asItems(payload));
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "FAQs could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await apiRequest<FAQRecord>("/api/admin/faqs", {
        method: "POST",
        body: JSON.stringify(faqPayload(new FormData(event.currentTarget))),
      });
      event.currentTarget.reset();
      setCreating(false);
      showToast("FAQ created.");
      await refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "FAQ could not be created.");
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => !needle || `${item.question} ${item.answer} ${item.category}`.toLowerCase().includes(needle));
  }, [items, query]);
  const categoryTotal = new Set(items.map((item) => text(item.category)).filter(Boolean)).size;

  return (
    <section className={styles.section}>
      <div className={styles.metrics}>
        <article><CircleHelp size={19} /><span><small>Total FAQs</small><strong>{items.length}</strong></span></article>
        <article><CheckCircle2 size={19} /><span><small>Active</small><strong>{items.filter((item) => item.is_active !== false).length}</strong></span></article>
        <article><AlertTriangle size={19} /><span><small>Inactive</small><strong>{items.filter((item) => item.is_active === false).length}</strong></span></article>
        <article><FileText size={19} /><span><small>FAQ Categories</small><strong>{categoryTotal}</strong></span></article>
      </div>
      <div className={styles.toolbar}>
        <label><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search FAQs" /></label>
        <button className={styles.secondary} type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} />{loading ? "Loading..." : "Refresh"}</button>
        <button className={styles.primary} type="button" onClick={() => setCreating((value) => !value)}><Plus size={15} /> New FAQ</button>
      </div>
      {creating ? (
        <div className={styles.recordBody}>
          <form className={styles.fieldGrid} onSubmit={create}>
            <label className={styles.wide}><span>Question</span><textarea name="question" required /></label>
            <label className={styles.wide}><span>Answer</span><textarea name="answer" required rows={4} /></label>
            <label><span>Category</span><input name="category" /></label>
            <label><span>Display order</span><input name="display_order" type="number" min="0" defaultValue="0" /></label>
            <label className={styles.checkField}><input name="is_active" type="checkbox" defaultChecked /><span>Active</span></label>
            <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} type="submit">Create FAQ</button></div>
          </form>
        </div>
      ) : null}
      <div className={styles.list}>
        {filtered.map((item) => <FAQRow item={item} refresh={refresh} key={item.id} />)}
        {!loading && !filtered.length ? <p className={styles.empty}>No FAQs found.</p> : null}
      </div>
    </section>
  );
}

function requestTitle(item: CustomerRequestRecord) {
  return item.name || item.customer_name || item.email || item.customer_email || `${item.kind === "customize" ? "Custom request" : "Contact request"} #${item.id}`;
}

function requestDetailsText(item: CustomerRequestRecord) {
  return item.kind === "contact" ? item.message || "No message supplied." : item.description || "No customization description supplied.";
}

function allowedRequestStatuses(item: CustomerRequestRecord) {
  if (item.kind === "contact") return contactTransitions[item.status] ?? contactStatuses;
  return customizeTransitions[item.status] ?? customizeStatuses;
}

function RequestRow({ item, refresh }: { item: CustomerRequestRecord; refresh: () => Promise<void> }) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const status = new FormData(event.currentTarget).get("status")?.toString() || item.status;
    setSaving(true);
    try {
      await apiRequest(item.kind === "contact" ? `/api/admin/contact/message/${item.id}` : `/api/admin/contact/customize/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      showToast("Request status updated.");
      await refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Request status could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className={styles.record}>
      <summary>
        <span className={styles.identity}>
          <strong>{requestTitle(item)}</strong>
          <small>{item.kind === "customize" ? "Custom moorti" : "Contact message"} - {item.email || item.customer_email || "No email"}{item.phone ? ` - ${item.phone}` : ""}</small>
        </span>
        <span>{when(item.created_at)}</span>
        <span className={`${styles.pill} ${statusTone(item.status)}`}>{label(item.status)}</span>
        {item.kind === "customize" ? <Hammer size={16} /> : <Mail size={16} />}
      </summary>
      <div className={styles.recordBody}>
        <p>{requestDetailsText(item)}</p>
        <div className={styles.detailGrid}>
          <section>
            <h3>Contact</h3>
            <p><strong>Name:</strong> {requestTitle(item)}</p>
            <p><strong>Email:</strong> {item.email || item.customer_email || "Not supplied"}</p>
            <p><strong>Phone:</strong> {item.phone || "Not supplied"}</p>
          </section>
          <section>
            <h3>Request</h3>
            {item.kind === "customize" ? (
              <>
                <p><strong>City:</strong> {item.city || "Not supplied"}</p>
                <p><strong>Pincode:</strong> {item.pincode || "Not supplied"}</p>
                <p><strong>Height:</strong> {item.approximate_height || "Not supplied"}</p>
                <p><strong>Material:</strong> {item.preferred_material || "Not supplied"}</p>
              </>
            ) : (
              <>
                <p><strong>Type:</strong> Product enquiry/contact</p>
                <p><strong>Received:</strong> {when(item.created_at)}</p>
              </>
            )}
          </section>
          <section>
            <h3>Reference</h3>
            {item.kind === "customize" && (item.reference_image || item.reference_object_key) ? (
              <>
                {item.reference_image ? <p><Link href={item.reference_image} target="_blank">Open reference image</Link></p> : null}
                {item.reference_object_key ? <em>{item.reference_object_key}</em> : null}
              </>
            ) : (
              <p>No reference file supplied.</p>
            )}
          </section>
        </div>
        <form className={styles.fieldGrid} onSubmit={save}>
          <label><span>Status</span><select name="status" defaultValue={item.status}>{allowedRequestStatuses(item).map((status) => <option value={status} key={status}>{label(status)}</option>)}</select></label>
          <label><span>Last update</span><input value={when(item.updated_at || item.created_at)} readOnly disabled /></label>
          <div className={`${styles.actions} ${styles.wide}`}>
            <button className={styles.primary} type="submit" disabled={saving}>{saving ? "Saving..." : "Save status"}</button>
          </div>
        </form>
      </div>
    </details>
  );
}

function CustomerRequestsAdmin() {
  const { showToast } = useToast();
  const [items, setItems] = useState<CustomerRequestRecord[]>([]);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [contacts, customize] = await Promise.all([
        apiRequest<AdminList<Omit<ContactRequestRecord, "kind">> | Array<Omit<ContactRequestRecord, "kind">>>("/api/admin/contact/message?page_size=100"),
        apiRequest<AdminList<Omit<CustomizeRequestRecord, "kind">> | Array<Omit<CustomizeRequestRecord, "kind">>>("/api/admin/contact/customize?page_size=100"),
      ]);
      setItems([
        ...asItems(contacts).map((item): ContactRequestRecord => ({ ...item, kind: "contact" })),
        ...asItems(customize).map((item): CustomizeRequestRecord => ({ ...item, kind: "customize" })),
      ].sort((first, second) => new Date(second.created_at || 0).getTime() - new Date(first.created_at || 0).getTime()));
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Customer requests could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesScope =
        scope === "all"
        || (scope === "contact" && item.kind === "contact")
        || (scope === "customize" && item.kind === "customize")
        || (scope === "new" && item.status === "new")
        || (scope === "open" && !["accepted", "closed"].includes(item.status))
        || (scope === "closed" && ["accepted", "closed"].includes(item.status));
      const matchesQuery = !needle || `${requestTitle(item)} ${item.email} ${item.customer_email} ${item.phone} ${item.city} ${item.message} ${item.description} ${item.status}`.toLowerCase().includes(needle);
      return matchesScope && matchesQuery;
    });
  }, [items, query, scope]);

  return (
    <section className={styles.section}>
      <div className={styles.metrics}>
        <article><Mail size={19} /><span><small>Total Requests</small><strong>{items.length}</strong></span></article>
        <article><AlertTriangle size={19} /><span><small>New</small><strong>{items.filter((item) => item.status === "new").length}</strong></span></article>
        <article><Hammer size={19} /><span><small>Custom Moorti</small><strong>{items.filter((item) => item.kind === "customize").length}</strong></span></article>
        <article><CheckCircle2 size={19} /><span><small>Accepted or Closed</small><strong>{items.filter((item) => ["accepted", "closed"].includes(item.status)).length}</strong></span></article>
      </div>
      <div className={styles.toolbar}>
        <label><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer requests" /></label>
        <select value={scope} onChange={(event) => setScope(event.target.value)} aria-label="Filter customer requests">
          <option value="all">All requests</option>
          <option value="contact">Contact/product enquiries</option>
          <option value="customize">Custom moorti</option>
          <option value="new">New only</option>
          <option value="open">Open workflow</option>
          <option value="closed">Accepted or closed</option>
        </select>
        <button className={styles.secondary} type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} />{loading ? "Loading..." : "Refresh"}</button>
      </div>
      <div className={styles.list}>
        {filtered.map((item) => <RequestRow item={item} refresh={refresh} key={`${item.kind}-${item.id}`} />)}
        {!loading && !filtered.length ? <p className={styles.empty}>No customer requests found.</p> : null}
      </div>
    </section>
  );
}

function SectionBody({ section }: { section: Exclude<AdminSectionSlug, "overview"> }) {
  if (section === "category") return <CatalogStructureAdmin kind="category" />;
  if (section === "deity") return <CatalogStructureAdmin kind="deity" />;
  if (section === "material") return <CatalogStructureAdmin kind="material" />;
  if (section === "product") return <CatalogAdmin />;
  if (section === "review") return <ReviewAdmin />;
  if (section === "faqs") return <FAQsAdmin />;
  if (section === "customer-requests") return <CustomerRequestsAdmin />;
  if (section === "staff") return <StaffSecurityAdmin />;
  return null;
}

export function AdminSectionPage({ section }: { section: Exclude<AdminSectionSlug, "overview"> }) {
  const details = sectionDetails[section];

  return (
    <AdminAccess section={section}>
      <AdminShell>
        <AdminPageHeader eyebrow={details.eyebrow} title={details.title} description={details.description} />
        <SectionBody section={section} />
      </AdminShell>
    </AdminAccess>
  );
}
