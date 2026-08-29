// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, MessageCircle, Play, RefreshCw, Smartphone } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import styles from "@/components/Commissions/commission-workspace.module.css";

type Status = { capabilities: { email: boolean; sms: boolean; whatsapp: boolean }; queue: Array<{ status: string; channel: string; count: number }> };

export function NotificationAdmin() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const load = useCallback(async () => { try { const response = await fetch("/api/v1/admin/notifications", { cache: "no-store" }); if (!response.ok) throw new Error(); setStatus((await response.json() as { data: Status }).data); } catch { showToast("Notification status could not be loaded."); } }, [showToast]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function run() { setRunning(true); try { const response = await fetch("/api/v1/admin/notifications", { method: "POST" }); if (!response.ok) throw new Error(); const payload = await response.json() as { data: { sent: number; failed: number }; status: Status }; setStatus(payload.status); showToast(`${payload.data.sent} sent; ${payload.data.failed} need attention.`); } catch { showToast("The notification run could not be completed."); } finally { setRunning(false); } }
  const providers = [{ key: "email" as const, label: "Resend email", icon: Mail }, { key: "sms" as const, label: "MSG91 SMS", icon: Smartphone }, { key: "whatsapp" as const, label: "Meta WhatsApp", icon: MessageCircle }];
  return <section className={styles.section}><div className="site-container"><div className={styles.toolbar}><p>Transactional message delivery and retry queue</p><div className={styles.actions}><button onClick={() => void load()}><RefreshCw size={15} /> Refresh</button><button className={styles.primary} disabled={running} onClick={() => void run()}><Play size={15} /> {running ? "Processing…" : "Process queue"}</button></div></div><div className={styles.summary}>{providers.map(({ key, label, icon: Icon }) => <div key={key}><Icon size={18} /><dt>{label}</dt><dd>{status?.capabilities[key] ? "Configured" : "Credentials needed"}</dd></div>)}</div><div className={styles.grid} style={{ marginTop: "1rem" }}>{status?.queue.length ? status.queue.map((row) => <article className={styles.card} key={`${row.channel}-${row.status}`}><div><span>{row.channel}</span><h2 className="font-display">{row.status.replaceAll("_", " ")}</h2></div><b className={styles.pill}>{row.count} messages</b></article>) : <div className={styles.empty}>No queued messages yet.</div>}</div></div></section>;
}
