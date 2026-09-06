"use client";

import type { FormEventHandler, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import styles from "./admin-entity-modal.module.css";

export type AdminEntityMode = "create" | "edit";
export type AdminFieldErrors = Record<string, string>;

function messagesFrom(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(messagesFrom);
  if (value && typeof value === "object") return Object.values(value).flatMap(messagesFrom);
  if (value == null) return [];
  return [String(value)];
}

export function parseAdminFormError(reason: unknown, fallback: string) {
  const fieldErrors: AdminFieldErrors = {};
  const details = reason instanceof ApiError ? reason.details : null;

  if (details && typeof details === "object") {
    Object.entries(details as Record<string, unknown>).forEach(([key, value]) => {
      const message = messagesFrom(value).join(" ");
      if (message) fieldErrors[key] = message;
    });
  }

  const message =
    fieldErrors.non_field_errors
    || fieldErrors.detail
    || (reason instanceof Error ? reason.message : fallback);

  return { message, fieldErrors };
}

export function getFieldError(errors: AdminFieldErrors, ...names: string[]) {
  return names.map((name) => errors[name]).find(Boolean);
}

export function AdminEntityModal({
  open,
  mode,
  entityLabel,
  formId,
  children,
  onClose,
  submitting,
  error,
  size = "default",
}: {
  open: boolean;
  mode: AdminEntityMode;
  entityLabel: string;
  formId: string;
  children: ReactNode;
  onClose: () => void;
  submitting: boolean;
  error?: string | null;
  size?: "default" | "wide";
}) {
  const title = `${mode === "create" ? "Create" : "Edit"} ${entityLabel}`;
  const submitText = mode === "create" ? "Create" : "Save Changes";
  const submittingText = mode === "create" ? "Creating..." : "Saving...";
  const close = submitting ? () => undefined : onClose;

  return (
    <Modal open={open} title={title} onClose={close} panelClassName={size === "wide" ? styles.widePanel : ""}>
      <div className={styles.modalContent}>
        {error ? (
          <div className={styles.errorBanner} role="alert">
            <AlertTriangle aria-hidden="true" size={17} />
            <span>{error}</span>
          </div>
        ) : null}
        {children}
        <div className={styles.footer}>
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" form={formId} disabled={submitting}>{submitting ? submittingText : submitText}</Button>
        </div>
      </div>
    </Modal>
  );
}

export function AdminModalForm({
  id,
  onSubmit,
  children,
}: {
  id: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
}) {
  return (
    <form id={id} className={styles.form} onSubmit={onSubmit} noValidate>
      {children}
    </form>
  );
}

export function AdminModalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function AdminFieldGrid({ children }: { children: ReactNode }) {
  return <div className={styles.fieldGrid}>{children}</div>;
}

export function AdminModalField({
  label,
  required = false,
  error,
  hint,
  wide = false,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`${styles.field} ${wide ? styles.fieldWide : ""}`.trim()}>
      <span>{label}{required ? <b className={styles.required}> *</b> : null}</span>
      {children}
      {error ? <p className={styles.fieldError}>{error}</p> : hint ? <p className={styles.hint}>{hint}</p> : null}
    </label>
  );
}

export function AdminCheckboxField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className={styles.checkboxField}>
      {children}
      <span>{label}</span>
      {error ? <p className={styles.fieldError}>{error}</p> : null}
    </label>
  );
}

export function AdminCategoryPicker({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${styles.categoryPicker} ${styles.fieldWide}`}>
      <span>{label}</span>
      <div className={styles.choiceGrid}>{children}</div>
      {error ? <p className={styles.fieldError}>{error}</p> : hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}

export const adminEntityModalStyles = styles;
