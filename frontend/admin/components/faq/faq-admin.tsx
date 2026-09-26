"use client";

import { AlertTriangle, CheckCircle2, CircleHelp, FileText, Plus, RefreshCw, Search } from "lucide-react";
import { FormEvent, useCallback, useEffect, useId, useMemo, useState } from "react";
import { apiRequest } from "@shared/utils/http";
import {
  type AdminFieldErrors,
  AdminCheckboxField,
  AdminEntityModal,
  AdminFieldGrid,
  AdminModalField,
  AdminModalForm,
  getFieldError,
  parseAdminFormError,
} from "@/components/layout/admin-entity-modal";
import { useToast } from "@shared/components/toast";
import {
  type AdminList,
  type FAQRecord,
  text,
  label,
  when,
  asItems,
} from "@/components/common/admin-records";
import styles from "@/components/common/commerce-operations.module.css";

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

export function FAQsAdmin() {
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
