// @ts-nocheck
"use client";

import { useAuth } from "@/components/Auth/auth-facade";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Hammer, RefreshCw } from "lucide-react";
import { AccountBootstrap } from "@/components/Auth/account-bootstrap";
import { useAuthConfigured } from "@/components/Auth/auth-provider";
import styles from "./commission-workspace.module.css";

type Commission = { id: string; commissionNumber: string; title: string; deityOrSubject: string; status: string; quotedPricePaise: number | null; gstPaise: number | null; shippingPaise: number | null; advanceAmountPaise: number | null; balanceAmountPaise: number | null; expectedCompletionAt: number | null; createdAt: number; updatedAt: number };
type Media = { id: string; filename: string; contentType: string; altText: string | null };
type Milestone = { id: string; sequence: number; title: string; description: string | null; status: string; customerNote: string | null; staffNote: string | null; media: Media[] };
type Detail = Commission & { requirements: string; preferredMaterial: string; targetHeightMm: number | null; destinationPostalCode: string; references: Media[]; milestones: Milestone[] };
const money = (value: number | null) => value === null ? "Pending" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value / 100);
const label = (value: string) => value.replaceAll("_", " ");

function ConnectedCustomerCommissions() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<Commission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { const token = await getToken(); const response = await fetch("/api/v1/commissions", { headers: token ? { authorization: `Bearer ${token}` } : undefined, cache: "no-store" }); if (!response.ok) throw new Error(); setItems((await response.json() as { data: Commission[] }).data); setError(null); } catch { setError("Your commissions could not be loaded."); }
  }, [getToken]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  return <section className={styles.section}><AccountBootstrap /><div className="site-container"><div className={styles.toolbar}><p>Private requests and production approvals</p><button onClick={() => void load()}><RefreshCw size={15} /> Refresh</button></div>{error ? <p className={styles.error}>{error}</p> : null}{items === null ? <div className={styles.empty}>Loading your commissions…</div> : !items.length ? <div className={styles.empty}><div><Hammer aria-hidden="true" /><h2 className="font-display">No custom commission yet.</h2><p>Begin with the deity, approximate dimensions and destination. The gallery will guide the remaining details.</p><Link href="/custom-murti#consultation">Begin a commission <ArrowRight size={15} /></Link></div></div> : <div className={styles.grid}>{items.map((item) => <article className={styles.card} key={item.id}><div><span>{item.commissionNumber}</span><h2 className="font-display">{item.title}</h2><p>{item.deityOrSubject} · Updated {new Date(item.updatedAt * 1000).toLocaleDateString("en-IN")}</p></div><b className={styles.pill}>{label(item.status)}</b><div><strong className={styles.money}>{money(item.quotedPricePaise === null ? null : item.quotedPricePaise + (item.gstPaise ?? 0) + (item.shippingPaise ?? 0))}</strong><br /><Link href={`/account/commissions/${item.commissionNumber}`}>Open journey <ArrowRight size={13} /></Link></div></article>)}</div>}</div></section>;
}

function ConnectedCustomerCommissionDetail({ commissionNumber }: { commissionNumber: string }) {
  const { getToken } = useAuth();
  const [item, setItem] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const load = useCallback(async () => { try { const token = await getToken(); const response = await fetch(`/api/v1/commissions/${encodeURIComponent(commissionNumber)}`, { headers: token ? { authorization: `Bearer ${token}` } : undefined, cache: "no-store" }); if (!response.ok) throw new Error(); setItem((await response.json() as { data: Detail }).data); setError(null); } catch { setError("This commission could not be loaded."); } }, [commissionNumber, getToken]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function decide(milestone: Milestone, action: "approve" | "request-changes") { try { const token = await getToken(); const response = await fetch(`/api/v1/commissions/${encodeURIComponent(commissionNumber)}/milestones/${encodeURIComponent(milestone.id)}/${action}`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ note }) }); if (!response.ok) throw new Error(); setItem((await response.json() as { data: Detail }).data); setNote(""); } catch { setError("Your milestone decision could not be saved."); } }
  if (!item) return <section className={styles.section}><div className="site-container"><div className={styles.empty}>{error ?? "Loading commission journey…"}</div></div></section>;
  const total = item.quotedPricePaise === null ? null : item.quotedPricePaise + (item.gstPaise ?? 0) + (item.shippingPaise ?? 0);
  const mediaUrl = (mediaId: string) => `/api/v1/commissions/${encodeURIComponent(item.commissionNumber)}/media/${encodeURIComponent(mediaId)}`;
  return <section className={styles.section}><AccountBootstrap /><div className="site-container"><article className={styles.detailCard}><span className={styles.eyebrow}>{item.commissionNumber}</span><h2 className="font-display">{item.title}</h2><p>{item.requirements}</p><div className={styles.summary}><div><dt>Status</dt><dd>{label(item.status)}</dd></div><div><dt>Total quotation</dt><dd>{money(total)}</dd></div><div><dt>Advance</dt><dd>{money(item.advanceAmountPaise)}</dd></div><div><dt>Balance</dt><dd>{money(item.balanceAmountPaise)}</dd></div><div><dt>Expected completion</dt><dd>{item.expectedCompletionAt ? new Date(item.expectedCompletionAt * 1000).toLocaleDateString("en-IN") : "To confirm"}</dd></div></div>{item.references.length ? <><h3>Reference images</h3><div className={styles.mediaGrid}>{item.references.map((media) => <a href={mediaUrl(media.id)} target="_blank" rel="noreferrer" key={media.id}><Image unoptimized src={mediaUrl(media.id)} alt={media.altText || media.filename} width={400} height={300} /></a>)}</div></> : null}</article><div className={styles.milestones}>{item.milestones.map((milestone) => <article className={styles.milestone} key={milestone.id}><header><div><span className={styles.eyebrow}>Milestone {milestone.sequence}</span><h3 className="font-display">{milestone.title}</h3></div><b className={styles.pill}>{label(milestone.status)}</b></header>{milestone.description ? <p>{milestone.description}</p> : null}{milestone.staffNote ? <p><strong>Gallery note:</strong> {milestone.staffNote}</p> : null}{milestone.media.length ? <div className={styles.mediaGrid}>{milestone.media.map((media) => <a href={mediaUrl(media.id)} target="_blank" rel="noreferrer" key={media.id}><Image unoptimized src={mediaUrl(media.id)} alt={media.altText || media.filename} width={400} height={300} /></a>)}</div> : null}{milestone.status === "submitted" ? <div className={styles.decision}><textarea aria-label="Approval or requested changes note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional approval note, or explain the changes you need" /><div className={styles.actions}><button className={styles.primary} onClick={() => void decide(milestone, "approve")}><CheckCircle2 size={15} /> Approve milestone</button><button disabled={!note.trim()} onClick={() => void decide(milestone, "request-changes")}>Request changes</button></div></div> : null}</article>)}</div>{error ? <p className={styles.error}>{error}</p> : null}</div></section>;
}

function CommissionAuthPending() {
  return <section className={styles.section}><div className="site-container"><div className={styles.empty}><div><Hammer aria-hidden="true" /><h2 className="font-display">Secure commission tracking is ready.</h2><p>Add the private Clerk keys to open customer commission records and approvals.</p><Link href="/custom-murti">View custom moorti service <ArrowRight size={15} /></Link></div></div></div></section>;
}

export function CustomerCommissions() {
  return useAuthConfigured() ? <ConnectedCustomerCommissions /> : <CommissionAuthPending />;
}

export function CustomerCommissionDetail({ commissionNumber }: { commissionNumber: string }) {
  return useAuthConfigured() ? <ConnectedCustomerCommissionDetail commissionNumber={commissionNumber} /> : <CommissionAuthPending />;
}
