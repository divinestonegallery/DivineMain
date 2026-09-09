// @ts-nocheck
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDollarSign, MessageCircle, PackageCheck, RefreshCw, Search, ShoppingBag, Truck, UserRoundCheck } from "lucide-react";
import { apiRequest } from "@/api/client";
import { useToast } from "@/components/ui/toast";
import styles from "./commerce-operations.module.css";

type ContactMessage = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: "new" | "contacted" | "closed";
  created_at?: string;
};

type ListResponse<T> = {
  items: T[];
};

const label = (value?: string) => (value || "not set").replaceAll("_", " ");
const contactStatuses = ["new", "contacted", "closed"];

function tone(value: string) {
  if (value === "closed") return styles.good;
  if (value === "contacted") return styles.pending;
  return styles.bad;
}

function ContactMessageRow({ item, refresh }: { item: ContactMessage; refresh: () => Promise<void> }) {
  const { showToast } = useToast();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const status = new FormData(event.currentTarget).get("status")?.toString() || item.status;
    try {
      await apiRequest<ContactMessage>(`/api/admin/contact/message/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      showToast("Message status updated.");
      await refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Message status could not be updated.");
    }
  }

  return (
    <details className={styles.record}>
      <summary>
        <span className={styles.identity}><strong>{item.name}</strong><small>{item.email}{item.phone ? ` - ${item.phone}` : ""}</small></span>
        <span>{item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "Recent"}</span>
        <span className={`${styles.pill} ${tone(item.status)}`}>{label(item.status)}</span>
        <MessageCircle size={16} />
      </summary>
      <div className={styles.recordBody}>
        <p>{item.message}</p>
        <form className={styles.fieldGrid} onSubmit={save}>
          <label><span>Status</span><select name="status" defaultValue={item.status}>{contactStatuses.map((status) => <option value={status} key={status}>{label(status)}</option>)}</select></label>
          <div className={styles.actions}><button className={styles.primary} type="submit">Save status</button></div>
        </form>
      </div>
    </details>
  );
}

export function OrdersAdmin() {
  const { showToast } = useToast();
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiRequest<ListResponse<ContactMessage>>("/api/admin/contact/message?page_size=50");
      setItems(payload.items ?? []);
    } catch {
      showToast("Contact enquiries could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => !needle || `${item.name} ${item.email} ${item.phone} ${item.message}`.toLowerCase().includes(needle));
  }, [items, query]);

  return (
    <section className={styles.section}>
      <div className={styles.metrics}>
        <article><ShoppingBag size={19} /><span><small>Enquiries</small><strong>{items.length}</strong></span></article>
        <article><AlertTriangle size={19} /><span><small>New</small><strong>{items.filter((item) => item.status === "new").length}</strong></span></article>
        <article><CheckCircle2 size={19} /><span><small>Contacted</small><strong>{items.filter((item) => item.status === "contacted").length}</strong></span></article>
        <article><PackageCheck size={19} /><span><small>Closed</small><strong>{items.filter((item) => item.status === "closed").length}</strong></span></article>
      </div>
      <div className={styles.toolbar}>
        <label><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search enquiries" /></label>
        <button className={styles.secondary} onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} />{loading ? "Loading..." : "Refresh"}</button>
      </div>
      <div className={styles.list}>
        {filtered.map((item) => <ContactMessageRow key={item.id} item={item} refresh={refresh} />)}
        {!loading && !filtered.length ? <p className={styles.empty}>No contact enquiries found.</p> : null}
      </div>
    </section>
  );
}

function UnavailableCommercePanel({ title, icon: Icon, body }: { title: string; icon: any; body: string }) {
  return (
    <section className={styles.section}>
      <div className={styles.metrics}>
        <article><Icon size={19} /><span><small>{title}</small><strong>Not exposed</strong></span></article>
      </div>
      <p className={styles.empty}>{body} The frontend no longer calls unavailable commerce routes.</p>
    </section>
  );
}

export function CustomersAdmin() {
  return <UnavailableCommercePanel title="Customers" icon={UserRoundCheck} body="The backend exposes current profile and staff records, but not a customer-management list." />;
}

export function PaymentsAdmin() {
  return <UnavailableCommercePanel title="Payments" icon={CircleDollarSign} body="Payment capture, Razorpay verification, refunds and payment history APIs are not included in this backend." />;
}

export function ShippingAdmin() {
  return <UnavailableCommercePanel title="Shipping" icon={Truck} body="Shipping rates, labels and tracking APIs are not included in this backend." />;
}

export function ReturnsAdmin() {
  return <UnavailableCommercePanel title="Returns" icon={PackageCheck} body="Return-case workflow APIs are not included in this backend." />;
}
