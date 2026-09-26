"use client";

import { AlertTriangle, CheckCircle2, RefreshCw, Search, Star, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@shared/utils/http";
import { useToast } from "@shared/components/toast";
import {
  type AdminList,
  type ReviewRecord,
  reviewStatuses,
  label,
  when,
  asItems,
  statusTone,
} from "@/components/common/admin-records";
import styles from "@/components/common/commerce-operations.module.css";

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

export function ReviewAdmin() {
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
