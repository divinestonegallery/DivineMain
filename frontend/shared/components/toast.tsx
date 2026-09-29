// @ts-nocheck
"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import styles from "./ui.module.css";

type ToastApi = { showToast: (message: string) => void };
const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const showToast = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(null), 3500);
  }, []);
  const value = useMemo(() => ({ showToast }), [showToast]);

  return <ToastContext.Provider value={value}>
    {children}
    {message ? <div className={styles.toast} role="status">
      <CheckCircle2 aria-hidden="true" size={19} />
      <span>{message}</span>
      <button type="button" aria-label="Dismiss notification" onClick={() => setMessage(null)}><X aria-hidden="true" size={17} /></button>
    </div> : null}
  </ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
