"use client";

import { AlertTriangle, CheckCircle2, CircleHelp, FileText, Hammer, Mail, Plus, RefreshCw, RotateCcw, Search, Star, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import { FormEvent, PointerEvent, ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/api/client";
import {
  AdminCheckboxField,
  AdminEntityModal,
  AdminFieldGrid,
  type AdminFieldErrors,
  AdminModalField,
  AdminModalForm,
  getFieldError,
  parseAdminFormError,
} from "@/components/Admin/admin-entity-modal";
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
  "contact",
  "custom-mooti",
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

type NormalizedAdminList<T> = {
  items: T[];
  pagination: AdminPagination;
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

const sectionDetails: Record<Exclude<AdminSectionSlug, "overview">, { title: string }> = {
  category: {
    title: "Category",
  },
  deity: {
    title: "Deity",
  },
  material: {
    title: "Material",
  },
  product: {
    title: "Product",
  },
  review: {
    title: "Review",
  },
  faqs: {
    title: "FAQs",
  },
  contact: {
    title: "Contact",
  },
  "custom-mooti": {
    title: "Custom Mooti",
  },
  staff: {
    title: "Staff",
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
const requestPageSize = 25;

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

function asAdminList<T>(payload: AdminList<T> | T[] | null | undefined, page: number, pageSize = requestPageSize): NormalizedAdminList<T> {
  const items = asItems(payload);
  if (!payload || Array.isArray(payload)) {
    return {
      items,
      pagination: {
        page,
        page_size: pageSize,
        total_items: items.length,
        total_pages: items.length ? 1 : 0,
      },
    };
  }
  return {
    items,
    pagination: payload.pagination ?? {
      page,
      page_size: pageSize,
      total_items: items.length,
      total_pages: items.length ? 1 : 0,
    },
  };
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

function validateFaqForm(question: string, answer: string, displayOrder: string) {
  const fieldErrors: AdminFieldErrors = {};
  if (!question) fieldErrors.question = "Question is required.";
  else if (question.length < 5) fieldErrors.question = "Question must be at least 5 characters.";
  if (!answer) fieldErrors.answer = "Answer is required.";
  else if (answer.length < 5) fieldErrors.answer = "Answer must be at least 5 characters.";
  const order = Number(displayOrder || 0);
  if (!Number.isFinite(order) || order < 0) fieldErrors.display_order = "Display order must be 0 or greater.";
  return fieldErrors;
}

function CreateFAQModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const { showToast } = useToast();
  const formId = useId();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AdminFieldErrors>({});

  const trimmedQuestion = question.trim();
  const trimmedAnswer = answer.trim();
  const isValid = !Object.keys(validateFaqForm(trimmedQuestion, trimmedAnswer, displayOrder)).length;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const nextFieldErrors = validateFaqForm(trimmedQuestion, trimmedAnswer, displayOrder);
    setError(null);
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;

    setSubmitting(true);
    try {
      await apiRequest<FAQRecord>("/api/admin/faqs", {
        method: "POST",
        body: JSON.stringify({
          question: trimmedQuestion,
          answer: trimmedAnswer,
          category: category.trim(),
          display_order: Number(displayOrder || 0),
          is_active: isActive,
        }),
      });
      showToast("FAQ created.");
      onClose();
      await onCreated();
    } catch (reason) {
      const nextError = parseAdminFormError(reason, "FAQ could not be created.");
      setError(nextError.message);
      setFieldErrors(nextError.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminEntityModal
      open
      mode="create"
      entityLabel="FAQ"
      formId={formId}
      onClose={onClose}
      submitting={submitting}
      error={error}
      submitLabel="Create FAQ"
      submitDisabled={!isValid}
    >
      <AdminModalForm id={formId} onSubmit={submit}>
        <AdminFieldGrid>
          <AdminModalField label="Question" required wide error={getFieldError(fieldErrors, "question")}>
            <textarea
              name="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Enter the FAQ question"
              rows={3}
              disabled={submitting}
              aria-invalid={Boolean(getFieldError(fieldErrors, "question"))}
            />
          </AdminModalField>
          <AdminModalField label="Answer" required wide error={getFieldError(fieldErrors, "answer")}>
            <textarea
              name="answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Enter the FAQ answer"
              rows={6}
              disabled={submitting}
              aria-invalid={Boolean(getFieldError(fieldErrors, "answer"))}
            />
          </AdminModalField>
          <AdminModalField label="Category" error={getFieldError(fieldErrors, "category")}>
            <input
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="General"
              disabled={submitting}
              aria-invalid={Boolean(getFieldError(fieldErrors, "category"))}
            />
          </AdminModalField>
          <AdminModalField label="Display order" error={getFieldError(fieldErrors, "display_order")} hint="Lower numbers appear first.">
            <input
              name="display_order"
              type="number"
              min="0"
              value={displayOrder}
              onChange={(event) => setDisplayOrder(event.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(getFieldError(fieldErrors, "display_order"))}
            />
          </AdminModalField>
          <AdminCheckboxField label="Active" error={getFieldError(fieldErrors, "is_active")}>
            <input
              name="is_active"
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              disabled={submitting}
            />
          </AdminCheckboxField>
        </AdminFieldGrid>
      </AdminModalForm>
    </AdminEntityModal>
  );
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
        <button className={styles.primary} type="button" onClick={() => setCreating(true)}><Plus size={15} /> Create New FAQ</button>
      </div>
      {creating ? <CreateFAQModal onClose={() => setCreating(false)} onCreated={refresh} /> : null}
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

function requestListUrl(path: string, page: number, status: string) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(requestPageSize),
  });
  if (status !== "all") params.set("status", status);
  return `${path}?${params.toString()}`;
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

function ReferenceImageViewer({ src }: { src: string }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef({ startX: 0, startY: 0, originX: 0, originY: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [fitScale, setFitScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [available, setAvailable] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setNaturalSize({ width: 0, height: 0 });
    setFitScale(1);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
    setAvailable(true);
    setExpanded(false);
  }, [src]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  function fitImageToViewport() {
    const image = imageRef.current;
    const viewport = viewportRef.current;
    if (!image?.naturalWidth || !image.naturalHeight || !viewport) return;

    const nextFitScale = Math.min(
      1,
      viewport.clientWidth / image.naturalWidth,
      viewport.clientHeight / image.naturalHeight,
    );
    setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
    setFitScale(nextFitScale);
    setScale(nextFitScale);
    setOffset({ x: 0, y: 0 });
  }

  useEffect(() => {
    if (!expanded) return;
    const frame = window.requestAnimationFrame(fitImageToViewport);
    const handleResize = () => fitImageToViewport();
    window.addEventListener("resize", handleResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, [expanded, src]);

  useEffect(() => {
    if (!expanded) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expanded]);

  function reset() {
    setScale(fitScale);
    setOffset({ x: 0, y: 0 });
    viewportRef.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  function changeZoom(direction: number) {
    setScale((current) => {
      const step = fitScale * 0.25;
      const next = Math.min(fitScale * 4, Math.max(fitScale, current + direction * step));
      setOffset((currentOffset) => next === fitScale ? { x: 0, y: 0 } : clampOffset(currentOffset, next));
      return next;
    });
  }

  function clampOffset(next: { x: number; y: number }, nextScale = scale) {
    const viewport = viewportRef.current;
    if (!viewport) return next;
    const zoomRatio = nextScale / fitScale;
    const maxX = viewport.clientWidth * Math.max(0, zoomRatio - 1) / 2;
    const maxY = viewport.clientHeight * Math.max(0, zoomRatio - 1) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    changeZoom(event.deltaY < 0 ? 1 : -1);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (scale <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, originX: offset.x, originY: offset.y };
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setOffset(clampOffset({
      x: dragRef.current.originX + event.clientX - dragRef.current.startX,
      y: dragRef.current.originY + event.clientY - dragRef.current.startY,
    }));
  }

  function stopDragging(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }

  if (!available) return <p className={styles.referenceUnavailable}>Reference image unavailable</p>;

  return (
    <div className={`${styles.referenceViewer} ${expanded ? styles.referenceViewerExpanded : ""}`.trim()}>
      {expanded ? <button className={styles.referenceClose} type="button" onClick={() => setExpanded(false)} aria-label="Close expanded reference image" title="Close"><X size={18} /></button> : null}
      <div
        ref={viewportRef}
        className={`${styles.referenceViewport} ${dragging ? styles.referenceViewportDragging : ""}`.trim()}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onClick={() => { if (scale === fitScale) setExpanded(true); }}
        title={scale > 1 ? "Drag to inspect the reference image" : "Click to expand or scroll to zoom"}
      >
        <img
          className={styles.referenceImage}
          src={src}
          alt="Customer reference"
          draggable={false}
          ref={imageRef}
          onLoad={fitImageToViewport}
          onError={() => setAvailable(false)}
          style={expanded && naturalSize.width && naturalSize.height
            ? {
                width: naturalSize.width * scale,
                height: naturalSize.height * scale,
                maxWidth: "none",
                maxHeight: "none",
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }
            : { transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale / fitScale})` }}
        />
      </div>
      <div className={styles.referenceControls} aria-label="Reference image controls">
        <button type="button" onClick={() => changeZoom(-1)} disabled={scale <= fitScale} aria-label="Zoom out" title="Zoom out"><ZoomOut size={14} /></button>
        <button type="button" onClick={reset} disabled={scale === fitScale && offset.x === 0 && offset.y === 0} aria-label="Reset image" title="Reset image"><RotateCcw size={14} /></button>
        <button type="button" onClick={() => changeZoom(1)} disabled={scale >= fitScale * 4} aria-label="Zoom in" title="Zoom in"><ZoomIn size={14} /></button>
      </div>
    </div>
  );
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
              <ReferenceImageViewer src={item.reference_image || item.reference_object_key || ""} />
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

function ContactAdmin() {
  const { showToast } = useToast();
  const [list, setList] = useState<NormalizedAdminList<ContactRequestRecord>>(() => asAdminList<ContactRequestRecord>([], 1));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ContactRequestRecord["status"]>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiRequest<AdminList<Omit<ContactRequestRecord, "kind">> | Array<Omit<ContactRequestRecord, "kind">>>(
        requestListUrl("/api/admin/contact/message", page, status),
      );
      const normalized = asAdminList(payload, page);
      setList({
        ...normalized,
        items: normalized.items.map((item): ContactRequestRecord => ({ ...item, kind: "contact" })),
      });
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Contact messages could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, showToast, status]);

  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return list.items.filter((item) => !needle || `${requestTitle(item)} ${item.email} ${item.phone} ${item.message} ${item.status}`.toLowerCase().includes(needle));
  }, [list.items, query]);

  return (
    <section className={styles.section}>
      <div className={styles.metrics}>
        <article><Mail size={19} /><span><small>Messages in view</small><strong>{list.items.length}</strong></span></article>
        <article><AlertTriangle size={19} /><span><small>New</small><strong>{list.items.filter((item) => item.status === "new").length}</strong></span></article>
        <article><CheckCircle2 size={19} /><span><small>Contacted</small><strong>{list.items.filter((item) => item.status === "contacted").length}</strong></span></article>
        <article><FileText size={19} /><span><small>Closed</small><strong>{list.items.filter((item) => item.status === "closed").length}</strong></span></article>
      </div>
      <div className={styles.toolbar}>
        <label><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contacts..." /></label>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
            setPage(1);
          }}
          aria-label="Filter contact status"
        >
          <option value="all">All statuses</option>
          {contactStatuses.map((value) => <option value={value} key={value}>{label(value)}</option>)}
        </select>
        <button className={styles.secondary} type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} />{loading ? "Loading..." : "Refresh"}</button>
      </div>
      <div className={styles.list}>
        {loading ? <p className={styles.empty}>Loading contact messages...</p> : filtered.map((item) => <RequestRow item={item} refresh={refresh} key={`contact-${item.id}`} />)}
        {!loading && !filtered.length ? <p className={styles.empty}>No contact messages found.</p> : null}
      </div>
      <PaginationControls pagination={list.pagination} loading={loading} onPageChange={setPage} />
    </section>
  );
}

function CustomMootiAdmin() {
  const { showToast } = useToast();
  const [list, setList] = useState<NormalizedAdminList<CustomizeRequestRecord>>(() => asAdminList<CustomizeRequestRecord>([], 1));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | CustomizeRequestRecord["status"]>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiRequest<AdminList<Omit<CustomizeRequestRecord, "kind">> | Array<Omit<CustomizeRequestRecord, "kind">>>(
        requestListUrl("/api/admin/contact/customize", page, status),
      );
      const normalized = asAdminList(payload, page);
      setList({
        ...normalized,
        items: normalized.items.map((item): CustomizeRequestRecord => ({ ...item, kind: "customize" })),
      });
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Custom moorti requests could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, showToast, status]);

  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return list.items.filter((item) => !needle || `${requestTitle(item)} ${item.email} ${item.customer_email} ${item.phone} ${item.city} ${item.description} ${item.status}`.toLowerCase().includes(needle));
  }, [list.items, query]);

  return (
    <section className={styles.section}>
      <div className={styles.metrics}>
        <article><Hammer size={19} /><span><small>Requests in view</small><strong>{list.items.length}</strong></span></article>
        <article><AlertTriangle size={19} /><span><small>New</small><strong>{list.items.filter((item) => item.status === "new").length}</strong></span></article>
        <article><FileText size={19} /><span><small>Quoted</small><strong>{list.items.filter((item) => item.status === "quoted").length}</strong></span></article>
        <article><CheckCircle2 size={19} /><span><small>Accepted or Closed</small><strong>{list.items.filter((item) => ["accepted", "closed"].includes(item.status)).length}</strong></span></article>
      </div>
      <div className={styles.toolbar}>
        <label><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search custom moorti requests" /></label>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
            setPage(1);
          }}
          aria-label="Filter custom moorti status"
        >
          <option value="all">All statuses</option>
          {customizeStatuses.map((value) => <option value={value} key={value}>{label(value)}</option>)}
        </select>
        <button className={styles.secondary} type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} />{loading ? "Loading..." : "Refresh"}</button>
      </div>
      <div className={styles.list}>
        {loading ? <p className={styles.empty}>Loading custom moorti requests...</p> : filtered.map((item) => <RequestRow item={item} refresh={refresh} key={`customize-${item.id}`} />)}
        {!loading && !filtered.length ? <p className={styles.empty}>No custom moorti requests found.</p> : null}
      </div>
      <PaginationControls pagination={list.pagination} loading={loading} onPageChange={setPage} />
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
  if (section === "contact") return <ContactAdmin />;
  if (section === "custom-mooti") return <CustomMootiAdmin />;
  if (section === "staff") return <StaffSecurityAdmin />;
  return null;
}

export function AdminSectionPage({ section }: { section: Exclude<AdminSectionSlug, "overview"> }) {
  const details = sectionDetails[section];

  return (
    <AdminAccess section={section}>
      <AdminShell>
        <AdminPageHeader title={details.title} />
        <SectionBody section={section} />
      </AdminShell>
    </AdminAccess>
  );
}
