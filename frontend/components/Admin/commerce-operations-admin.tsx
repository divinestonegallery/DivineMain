// @ts-nocheck
"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDollarSign, ExternalLink, PackageCheck, Plus, RefreshCw, Save, Search, ShieldAlert, ShoppingBag, Truck, UserRoundCheck } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import styles from "./commerce-operations.module.css";

type Resource = "orders" | "customers" | "payments" | "shipping" | "returns";

function money(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value / 100);
}

function date(value: number | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(value * 1000) : "—";
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function tone(value: string) {
  if (["paid", "captured", "delivered", "approved", "active", "in_stock", "closed"].includes(value)) return styles.good;
  if (["failed", "cancelled", "rejected", "refunded", "blocked", "exception", "out_of_stock"].includes(value)) return styles.bad;
  return styles.pending;
}

function useCommerceResource<T>(resource: Resource) {
  const { showToast } = useToast();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/commerce/${resource}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setData((await response.json() as { data: T[] }).data);
    } catch {
      showToast(`${resource[0].toUpperCase()}${resource.slice(1)} could not be loaded.`);
    } finally {
      setLoading(false);
    }
  }, [resource, showToast]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/v1/admin/commerce/${resource}`, { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ data: T[] }>; })
      .then((payload) => { if (!cancelled) setData(payload.data); })
      .catch(() => { if (!cancelled) showToast(`${resource[0].toUpperCase()}${resource.slice(1)} could not be loaded.`); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [resource, showToast]);
  return { data, setData, loading, refresh };
}

async function patchResource<T>(resource: Resource, body: Record<string, unknown>) {
  const response = await fetch(`/api/v1/admin/commerce/${resource}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error();
  return (await response.json() as { data: T[] }).data;
}

function Toolbar({ query, setQuery, loading, refresh, children }: { query: string; setQuery: (value: string) => void; loading: boolean; refresh: () => Promise<void>; children?: React.ReactNode }) {
  return <div className={styles.toolbar}><label><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records" /></label>{children}<button className={styles.secondary} onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} />{loading ? "Loading…" : "Refresh"}</button></div>;
}

type Order = {
  id: string; orderNumber: string; userId: string; customerName: string; customerEmail: string | null; customerPhone: string | null;
  status: "approval_pending" | "placed" | "confirmed" | "in_production" | "ready_to_ship" | "shipped" | "delivered" | "cancelled" | "returned";
  paymentStatus: "pending" | "partially_paid" | "paid" | "failed" | "refunded" | "partially_refunded";
  paymentMethod: "online" | "bank_transfer" | "cod"; codApprovalStatus: "not_required" | "pending" | "approved" | "rejected";
  totalPaise: number; currency: string; customerNote: string | null; placedAt: number;
  shippingAddress: { recipientName: string; phoneE164: string; line1: string; city: string; state: string; postalCode: string };
  items: Array<{ id: string; itemName: string; variantName: string; sku: string; quantity: number; lineTotalPaise: number }>;
  payments: Array<{ id: string; status: string; method: string; amountPaise: number }>;
  shipments: Array<{ id: string; status: string; provider: string | null; serviceName: string | null; trackingNumber: string | null }>;
  returns: Array<{ id: string; returnNumber: string; status: string }>;
};

const orderStatuses: Order["status"][] = ["approval_pending", "placed", "confirmed", "in_production", "ready_to_ship", "shipped", "delivered", "cancelled", "returned"];
const paymentStatuses: Order["paymentStatus"][] = ["pending", "partially_paid", "paid", "failed", "refunded", "partially_refunded"];

function OrderRow({ item, onSaved }: { item: Order; onSaved: (data: Order[]) => void }) {
  const { showToast } = useToast();
  const [status, setStatus] = useState(item.status);
  const [paymentStatus, setPaymentStatus] = useState(item.paymentStatus);
  const [codApprovalStatus, setCodApprovalStatus] = useState(item.codApprovalStatus);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try { onSaved(await patchResource<Order>("orders", { id: item.id, status, paymentStatus, codApprovalStatus })); showToast(`${item.orderNumber} updated.`); }
    catch { showToast("The order could not be updated."); }
    finally { setSaving(false); }
  }
  return <details className={styles.record}>
    <summary><span className={styles.identity}><strong>{item.orderNumber}</strong><small>{item.customerName} · {date(item.placedAt)}</small></span><span className={`${styles.pill} ${tone(item.status)}`}>{statusLabel(item.status)}</span><span className={`${styles.pill} ${tone(item.paymentStatus)}`}>{statusLabel(item.paymentStatus)}</span><strong className={styles.amount}>{money(item.totalPaise, item.currency)}</strong></summary>
    <div className={styles.recordBody}>
      <div className={styles.fieldGrid}><label><span>Order stage</span><select value={status} onChange={(event) => setStatus(event.target.value as Order["status"])}>{orderStatuses.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label><label><span>Payment status</span><select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as Order["paymentStatus"])}>{paymentStatuses.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label><label><span>Payment method</span><input value={statusLabel(item.paymentMethod)} disabled /></label><label><span>COD approval</span><select value={codApprovalStatus} onChange={(event) => setCodApprovalStatus(event.target.value as Order["codApprovalStatus"])}><option value="not_required">Not required</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label></div>
      <div className={styles.detailGrid}><section><h3>Customer & delivery</h3><p>{item.customerName}<br />{item.customerEmail ?? "No email"}<br />{item.customerPhone ?? item.shippingAddress.phoneE164}<br />{item.shippingAddress.line1}, {item.shippingAddress.city}, {item.shippingAddress.state} {item.shippingAddress.postalCode}</p>{item.customerNote ? <em>“{item.customerNote}”</em> : null}</section><section><h3>Items</h3>{item.items.map((line) => <p key={line.id}><strong>{line.quantity} × {line.itemName}</strong><br /><small>{line.variantName} · {line.sku} · {money(line.lineTotalPaise)}</small></p>)}</section><section><h3>Operations</h3><p>{item.shipments.length ? `${item.shipments.length} shipment · ${statusLabel(item.shipments[0].status)}` : "No shipment"}<br />{item.payments.length ? `${item.payments.length} payment record` : "No payment record"}<br />{item.returns.length ? `${item.returns.length} return case` : "No return case"}</p></section></div>
      <div className={styles.actions}><Link href="/admin/shipping">Open shipping <ExternalLink size={14} /></Link><button className={styles.primary} onClick={() => void save()} disabled={saving}><Save size={15} />{saving ? "Saving…" : "Save order"}</button></div>
    </div>
  </details>;
}

export function OrdersAdmin() {
  const { data, setData, loading, refresh } = useCommerceResource<Order>("orders");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("open");
  const items = useMemo(() => data.filter((item) => (filter === "all" || (filter === "open" && !["delivered", "cancelled", "returned"].includes(item.status)) || item.status === filter) && (!query.trim() || `${item.orderNumber} ${item.customerName} ${item.customerEmail} ${item.customerPhone}`.toLowerCase().includes(query.toLowerCase()))), [data, filter, query]);
  const revenue = data.filter((item) => item.paymentStatus === "paid").reduce((total, item) => total + item.totalPaise, 0);
  return <section className={styles.section}><div className={styles.metrics}><article><ShoppingBag size={19} /><span><small>All orders</small><strong>{data.length}</strong></span></article><article><PackageCheck size={19} /><span><small>Open</small><strong>{data.filter((item) => !["delivered", "cancelled", "returned"].includes(item.status)).length}</strong></span></article><article><ShieldAlert size={19} /><span><small>COD approvals</small><strong>{data.filter((item) => item.codApprovalStatus === "pending").length}</strong></span></article><article><CircleDollarSign size={19} /><span><small>Paid revenue</small><strong>{money(revenue)}</strong></span></article></div><Toolbar query={query} setQuery={setQuery} loading={loading} refresh={refresh}><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="open">Open orders</option><option value="all">All orders</option>{orderStatuses.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></Toolbar><div className={styles.list}>{items.map((item) => <OrderRow key={item.id} item={item} onSaved={setData} />)}{!loading && !items.length ? <p className={styles.empty}>No orders match this view.</p> : null}</div></section>;
}

type Customer = { id: string; displayName: string; email: string | null; phoneE164: string | null; status: "active" | "blocked" | "deleted"; preferredLocale: string; emailVerifiedAt: number | null; phoneVerifiedAt: number | null; whatsappTransactionalOptInAt: number | null; orderCount: number; paidRevenuePaise: number; commissionCount: number; addressCount: number; lastOrderAt: number | null; createdAt: number };

function CustomerRow({ item, onSaved }: { item: Customer; onSaved: (data: Customer[]) => void }) {
  const { showToast } = useToast(); const [status, setStatus] = useState(item.status); const [locale, setLocale] = useState(item.preferredLocale); const [saving, setSaving] = useState(false);
  async function save() { setSaving(true); try { onSaved(await patchResource<Customer>("customers", { id: item.id, status, preferredLocale: locale })); showToast(`${item.displayName} updated.`); } catch { showToast("Customer account could not be updated."); } finally { setSaving(false); } }
  return <article className={styles.customerRow}><span className={styles.avatar}>{item.displayName.slice(0, 1).toUpperCase()}</span><div className={styles.identity}><strong>{item.displayName}</strong><small>{item.email ?? "No email"} · {item.phoneE164 ?? "No phone"}</small><em>Joined {date(item.createdAt)}</em></div><span className={`${styles.pill} ${tone(item.status)}`}>{item.status}</span><div className={styles.compactMetric}><small>Orders</small><strong>{item.orderCount}</strong></div><div className={styles.compactMetric}><small>Paid value</small><strong>{money(item.paidRevenuePaise)}</strong></div><div className={styles.compactMetric}><small>Commissions</small><strong>{item.commissionCount}</strong></div><label><span>Account</span><select value={status} onChange={(event) => setStatus(event.target.value as Customer["status"])}><option value="active">Active</option><option value="blocked">Blocked</option><option value="deleted">Deleted</option></select></label><label><span>Language</span><select value={locale} onChange={(event) => setLocale(event.target.value)}><option value="en-IN">English</option><option value="hi-IN">Hindi</option></select></label><button className={styles.primary} onClick={() => void save()} disabled={saving}><Save size={15} />Save</button></article>;
}

export function CustomersAdmin() {
  const { data, setData, loading, refresh } = useCommerceResource<Customer>("customers"); const [query, setQuery] = useState("");
  const items = useMemo(() => data.filter((item) => !query.trim() || `${item.displayName} ${item.email} ${item.phoneE164}`.toLowerCase().includes(query.toLowerCase())), [data, query]);
  return <section className={styles.section}><div className={styles.metrics}><article><UserRoundCheck size={19} /><span><small>Customers</small><strong>{data.length}</strong></span></article><article><ShoppingBag size={19} /><span><small>With orders</small><strong>{data.filter((item) => item.orderCount > 0).length}</strong></span></article><article><CheckCircle2 size={19} /><span><small>Verified email</small><strong>{data.filter((item) => item.emailVerifiedAt).length}</strong></span></article><article><ShieldAlert size={19} /><span><small>Blocked</small><strong>{data.filter((item) => item.status === "blocked").length}</strong></span></article></div><Toolbar query={query} setQuery={setQuery} loading={loading} refresh={refresh} /><div className={styles.list}>{items.map((item) => <CustomerRow key={item.id} item={item} onSaved={setData} />)}{!loading && !items.length ? <p className={styles.empty}>No customers found.</p> : null}</div></section>;
}

type Payment = { id: string; orderNumber: string | null; commissionNumber: string | null; customerName: string | null; customerEmail: string | null; provider: string; providerOrderId: string | null; providerPaymentId: string | null; method: "online" | "bank_transfer" | "cod"; status: "created" | "pending" | "authorized" | "captured" | "failed" | "refunded" | "cancelled"; amountPaise: number; currency: string; bankReference: string | null; failureCode: string | null; failureMessage: string | null; paidAt: number | null; createdAt: number };

function PaymentRow({ item, onSaved }: { item: Payment; onSaved: (data: Payment[]) => void }) {
  const { showToast } = useToast(); const [status, setStatus] = useState(item.status); const [bankReference, setBankReference] = useState(item.bankReference ?? ""); const [providerPaymentId, setProviderPaymentId] = useState(item.providerPaymentId ?? ""); const [saving, setSaving] = useState(false);
  async function save() { setSaving(true); try { onSaved(await patchResource<Payment>("payments", { id: item.id, status, bankReference, providerPaymentId })); showToast("Payment record updated."); } catch { showToast("Payment record could not be updated."); } finally { setSaving(false); } }
  return <details className={styles.record}><summary><span className={styles.identity}><strong>{item.orderNumber ?? item.commissionNumber ?? "Payment"}</strong><small>{item.customerName ?? "Customer"} · {statusLabel(item.method)} · {item.provider}</small></span><span className={`${styles.pill} ${tone(item.status)}`}>{statusLabel(item.status)}</span><strong className={styles.amount}>{money(item.amountPaise, item.currency)}</strong><small>{date(item.createdAt)}</small></summary><div className={styles.recordBody}><div className={styles.fieldGrid}><label><span>Payment status</span><select value={status} onChange={(event) => setStatus(event.target.value as Payment["status"])}>{["created", "pending", "authorized", "captured", "failed", "refunded", "cancelled"].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label><label><span>Bank reference</span><input value={bankReference} onChange={(event) => setBankReference(event.target.value)} placeholder="UTR or bank reference" /></label><label><span>Provider payment ID</span><input value={providerPaymentId} onChange={(event) => setProviderPaymentId(event.target.value)} placeholder="Gateway payment ID" /></label><label><span>Captured at</span><input value={date(item.paidAt)} disabled /></label></div>{item.failureMessage ? <p className={styles.warning}><AlertTriangle size={16} />{item.failureCode}: {item.failureMessage}</p> : null}<div className={styles.actions}><span>Manual status changes are recorded in the audit history.</span><button className={styles.primary} onClick={() => void save()} disabled={saving}><Save size={15} />Save payment</button></div></div></details>;
}

export function PaymentsAdmin() { const { data, setData, loading, refresh } = useCommerceResource<Payment>("payments"); const [query, setQuery] = useState(""); const [filter, setFilter] = useState("all"); const items = useMemo(() => data.filter((item) => (filter === "all" || item.status === filter) && (!query.trim() || `${item.orderNumber} ${item.commissionNumber} ${item.customerName} ${item.bankReference}`.toLowerCase().includes(query.toLowerCase()))), [data, filter, query]); const captured = data.filter((item) => item.status === "captured").reduce((total, item) => total + item.amountPaise, 0); return <section className={styles.section}><div className={styles.metrics}><article><CircleDollarSign size={19} /><span><small>Payments</small><strong>{data.length}</strong></span></article><article><CheckCircle2 size={19} /><span><small>Captured</small><strong>{money(captured)}</strong></span></article><article><AlertTriangle size={19} /><span><small>Pending</small><strong>{data.filter((item) => ["created", "pending", "authorized"].includes(item.status)).length}</strong></span></article><article><ShieldAlert size={19} /><span><small>Failed</small><strong>{data.filter((item) => item.status === "failed").length}</strong></span></article></div><Toolbar query={query} setQuery={setQuery} loading={loading} refresh={refresh}><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option>{["created", "pending", "authorized", "captured", "failed", "refunded", "cancelled"].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></Toolbar><div className={styles.list}>{items.map((item) => <PaymentRow key={item.id} item={item} onSaved={setData} />)}{!loading && !items.length ? <p className={styles.empty}>No payments match this view.</p> : null}</div></section>; }

type Shipment = { id: string; orderNumber: string; customerName: string; customerPhone: string | null; provider: string | null; providerShipmentId: string | null; trackingNumber: string | null; status: "rate_selected" | "booked" | "picked_up" | "in_transit" | "delivered" | "exception" | "cancelled"; serviceName: string | null; shippingPaise: number; chargeableWeightGrams: number; originPostalCode: string; destinationPostalCode: string; estimatedDeliveryAt: number | null; shippedAt: number | null; deliveredAt: number | null; createdAt: number };

function ShipmentRow({ item, onSaved }: { item: Shipment; onSaved: (data: Shipment[]) => void }) { const { showToast } = useToast(); const [status, setStatus] = useState(item.status); const [provider, setProvider] = useState(item.provider ?? "shiprocket"); const [providerShipmentId, setProviderShipmentId] = useState(item.providerShipmentId ?? ""); const [trackingNumber, setTrackingNumber] = useState(item.trackingNumber ?? ""); const [serviceName, setServiceName] = useState(item.serviceName ?? ""); const [estimated, setEstimated] = useState(item.estimatedDeliveryAt ? new Date(item.estimatedDeliveryAt * 1000).toISOString().slice(0, 10) : ""); const [saving, setSaving] = useState(false); async function save() { setSaving(true); try { onSaved(await patchResource<Shipment>("shipping", { id: item.id, status, provider, providerShipmentId, trackingNumber, serviceName, estimatedDeliveryAt: estimated ? Math.floor(new Date(`${estimated}T12:00:00+05:30`).getTime() / 1000) : null })); showToast(`${item.orderNumber} shipment updated.`); } catch { showToast("Shipment could not be updated."); } finally { setSaving(false); } } return <details className={styles.record}><summary><span className={styles.identity}><strong>{item.orderNumber}</strong><small>{item.customerName} · {item.originPostalCode} → {item.destinationPostalCode}</small></span><span className={`${styles.pill} ${tone(item.status)}`}>{statusLabel(item.status)}</span><span>{item.trackingNumber ?? "No tracking number"}</span><strong className={styles.amount}>{money(item.shippingPaise)}</strong></summary><div className={styles.recordBody}><div className={styles.fieldGrid}><label><span>Shipment stage</span><select value={status} onChange={(event) => setStatus(event.target.value as Shipment["status"])}>{["rate_selected", "booked", "picked_up", "in_transit", "delivered", "exception", "cancelled"].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label><label><span>Provider</span><input value={provider} onChange={(event) => setProvider(event.target.value)} /></label><label><span>Shiprocket shipment ID</span><input value={providerShipmentId} onChange={(event) => setProviderShipmentId(event.target.value)} /></label><label><span>Tracking/AWB number</span><input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} /></label><label><span>Courier service</span><input value={serviceName} onChange={(event) => setServiceName(event.target.value)} /></label><label><span>Expected delivery</span><input type="date" value={estimated} onChange={(event) => setEstimated(event.target.value)} /></label></div><div className={styles.detailStrip}><span>Weight: {(item.chargeableWeightGrams / 1000).toFixed(1)} kg</span><span>Shipped: {date(item.shippedAt)}</span><span>Delivered: {date(item.deliveredAt)}</span></div><div className={styles.actions}><span>Marking picked up/in transit or delivered also advances the order automatically.</span><button className={styles.primary} onClick={() => void save()} disabled={saving}><Save size={15} />Save shipment</button></div></div></details>; }

export function ShippingAdmin() { const { data, setData, loading, refresh } = useCommerceResource<Shipment>("shipping"); const [query, setQuery] = useState(""); const items = useMemo(() => data.filter((item) => !query.trim() || `${item.orderNumber} ${item.customerName} ${item.trackingNumber} ${item.providerShipmentId}`.toLowerCase().includes(query.toLowerCase())), [data, query]); return <section className={styles.section}><div className={styles.metrics}><article><Truck size={19} /><span><small>Shipments</small><strong>{data.length}</strong></span></article><article><PackageCheck size={19} /><span><small>In transit</small><strong>{data.filter((item) => ["picked_up", "in_transit"].includes(item.status)).length}</strong></span></article><article><CheckCircle2 size={19} /><span><small>Delivered</small><strong>{data.filter((item) => item.status === "delivered").length}</strong></span></article><article><AlertTriangle size={19} /><span><small>Exceptions</small><strong>{data.filter((item) => item.status === "exception").length}</strong></span></article></div><Toolbar query={query} setQuery={setQuery} loading={loading} refresh={refresh} /><div className={styles.list}>{items.map((item) => <ShipmentRow key={item.id} item={item} onSaved={setData} />)}{!loading && !items.length ? <p className={styles.empty}>No shipments found.</p> : null}</div></section>; }

type ReturnCase = { id: string; returnNumber: string; orderId: string; orderNumber: string; customerName: string; customerEmail: string | null; customerPhone: string | null; status: "requested" | "under_review" | "approved" | "rejected" | "in_transit" | "received" | "refunded" | "closed"; reason: string; customerNote: string | null; staffDecisionNote: string | null; decidedAt: number | null; createdAt: number; items: Array<{ orderItemId: string; itemName: string; variantName: string; sku: string; quantity: number; conditionNote: string | null }> };

function ReturnRow({ item, onSaved }: { item: ReturnCase; onSaved: (data: ReturnCase[]) => void }) { const { showToast } = useToast(); const [status, setStatus] = useState(item.status); const [note, setNote] = useState(item.staffDecisionNote ?? ""); const [saving, setSaving] = useState(false); async function save() { setSaving(true); try { onSaved(await patchResource<ReturnCase>("returns", { id: item.id, status, staffDecisionNote: note })); showToast(`${item.returnNumber} updated.`); } catch { showToast("Return case could not be updated."); } finally { setSaving(false); } } return <details className={styles.record}><summary><span className={styles.identity}><strong>{item.returnNumber}</strong><small>{item.orderNumber} · {item.customerName}</small></span><span className={`${styles.pill} ${tone(item.status)}`}>{statusLabel(item.status)}</span><span>{item.reason}</span><small>{date(item.createdAt)}</small></summary><div className={styles.recordBody}><div className={styles.fieldGrid}><label><span>Return stage</span><select value={status} onChange={(event) => setStatus(event.target.value as ReturnCase["status"])}>{["requested", "under_review", "approved", "rejected", "in_transit", "received", "refunded", "closed"].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label><label className={styles.wide}><span>Staff decision note</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Record inspection, decision and next steps" /></label></div><div className={styles.detailGrid}><section><h3>Customer report</h3><p>{item.customerNote ?? "No additional note."}</p><small>{item.customerEmail ?? item.customerPhone ?? "No contact"}</small></section><section><h3>Returned items</h3>{item.items.map((line) => <p key={line.orderItemId}>{line.quantity} × {line.itemName}<br /><small>{line.variantName} · {line.sku}</small></p>)}</section></div><div className={styles.actions}><span>Marking refunded also updates the linked order and payment status.</span><button className={styles.primary} onClick={() => void save()} disabled={saving}><Save size={15} />Save return</button></div></div></details>; }

export function ReturnsAdmin() { const { showToast } = useToast(); const { data, setData, loading, refresh } = useCommerceResource<ReturnCase>("returns"); const ordersResource = useCommerceResource<Order>("orders"); const [query, setQuery] = useState(""); const [creating, setCreating] = useState(false); const items = useMemo(() => data.filter((item) => !query.trim() || `${item.returnNumber} ${item.orderNumber} ${item.customerName} ${item.reason}`.toLowerCase().includes(query.toLowerCase())), [data, query]); async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const response = await fetch("/api/v1/admin/commerce/returns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }); if (!response.ok) { showToast("Return case could not be opened."); return; } setData((await response.json() as { data: ReturnCase[] }).data); setCreating(false); showToast("Return case opened."); } return <section className={styles.section}><div className={styles.metrics}><article><PackageCheck size={19} /><span><small>Return cases</small><strong>{data.length}</strong></span></article><article><AlertTriangle size={19} /><span><small>Needs review</small><strong>{data.filter((item) => ["requested", "under_review"].includes(item.status)).length}</strong></span></article><article><Truck size={19} /><span><small>In transit</small><strong>{data.filter((item) => item.status === "in_transit").length}</strong></span></article><article><CheckCircle2 size={19} /><span><small>Closed</small><strong>{data.filter((item) => item.status === "closed").length}</strong></span></article></div><Toolbar query={query} setQuery={setQuery} loading={loading} refresh={refresh}><button className={styles.primary} onClick={() => setCreating((value) => !value)}><Plus size={15} />Open return</button></Toolbar>{creating ? <form className={styles.createForm} onSubmit={(event) => void create(event)}><label><span>Order</span><select name="orderId" required><option value="">Choose order</option>{ordersResource.data.map((order) => <option value={order.id} key={order.id}>{order.orderNumber} — {order.customerName}</option>)}</select></label><label><span>Reason</span><input name="reason" required maxLength={500} placeholder="Damage, incorrect item or other reason" /></label><label><span>Customer note</span><input name="customerNote" maxLength={2000} /></label><button className={styles.primary} type="submit"><Plus size={15} />Create case</button></form> : null}<div className={styles.list}>{items.map((item) => <ReturnRow key={item.id} item={item} onSaved={setData} />)}{!loading && !items.length ? <p className={styles.empty}>No return cases found.</p> : null}</div></section>; }
