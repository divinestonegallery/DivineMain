// @ts-nocheck
import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import styles from "./ui.module.css";

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  id?: string;
};

export function FormField({ label, hint, error, required, id: suppliedId, className = "", ...props }: FieldShellProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = suppliedId ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const messageId = `${id}-message`;

  return (
    <div className={`${styles.field} ${className}`.trim()}>
      <label htmlFor={id}>{label}{required ? <span aria-hidden="true"> *</span> : null}</label>
      <input id={id} required={required} aria-invalid={Boolean(error)} aria-describedby={hint || error ? messageId : undefined} {...props} />
      {error ? <p className={styles.fieldError} id={messageId}>{error}</p> : hint ? <p id={messageId}>{hint}</p> : null}
    </div>
  );
}

export function TextareaField({ label, hint, error, required, id: suppliedId, className = "", ...props }: FieldShellProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = suppliedId ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const messageId = `${id}-message`;

  return (
    <div className={`${styles.field} ${className}`.trim()}>
      <label htmlFor={id}>{label}{required ? <span aria-hidden="true"> *</span> : null}</label>
      <textarea id={id} required={required} aria-invalid={Boolean(error)} aria-describedby={hint || error ? messageId : undefined} {...props} />
      {error ? <p className={styles.fieldError} id={messageId}>{error}</p> : hint ? <p id={messageId}>{hint}</p> : null}
    </div>
  );
}

export function SelectField({ label, hint, error, required, id: suppliedId, className = "", children, ...props }: FieldShellProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = suppliedId ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const messageId = `${id}-message`;

  return (
    <div className={`${styles.field} ${className}`.trim()}>
      <label htmlFor={id}>{label}{required ? <span aria-hidden="true"> *</span> : null}</label>
      <select id={id} required={required} aria-invalid={Boolean(error)} aria-describedby={hint || error ? messageId : undefined} {...props}>
        {children}
      </select>
      {error ? <p className={styles.fieldError} id={messageId}>{error}</p> : hint ? <p id={messageId}>{hint}</p> : null}
    </div>
  );
}
