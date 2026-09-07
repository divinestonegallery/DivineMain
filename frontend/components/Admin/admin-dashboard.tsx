"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Boxes, Gem, Hammer, Mail, RefreshCw, ShieldCheck, Star, Tags } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getAdminDashboardSummary } from "./dashboard-repository";
import { AdminPageHeader } from "./admin-page-header";
import { AdminShell } from "./admin-shell";
import { AdminState } from "./admin-state";
import { SignIn, useUser } from "@/components/Auth/auth-facade";
import styles from "./admin-dashboard.module.css";

type DashboardSummary = Awaited<ReturnType<typeof getAdminDashboardSummary>>;
type CountablePayload = { pagination?: { total_items?: number }; items?: unknown[] };

function count(payload: CountablePayload) {
  return payload?.pagination?.total_items ?? payload?.items?.length ?? 0;
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

function DashboardContent() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSummary(await getAdminDashboardSummary());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The administration data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(task);
  }, [load]);

  return (
    <AdminShell>
      <AdminPageHeader title="Good morning, gallery team" description="A live view of the catalogue and customer conversations coming from the Django admin API." actions={<button className={styles.refresh} type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> {loading ? "Loading" : "Refresh"}</button>} />
      {error ? <div className={styles.error}><AlertTriangle size={18} /><span>{error}</span></div> : null}
      <section className={styles.metrics} aria-label="Administration summary">
        <article><Boxes size={20} /><span><small>Total Products</small><strong>{summary ? count(summary.products) : "-"}</strong><em>{summary ? `${summary.products.items.filter((item) => item.status === "active").length} in this view active` : "Loading"}</em></span></article>
        <article><Tags size={20} /><span><small>Total Categories</small><strong>{summary ? summary.categories.length : "-"}</strong><em>{summary ? `${summary.categories.filter((item) => item.is_active !== false).length} active` : "Loading"}</em></span></article>
        <article><Gem size={20} /><span><small>Total Deities</small><strong>{summary ? summary.deities.length : "-"}</strong><em>{summary ? `${summary.deities.filter((item) => item.is_active !== false).length} active` : "Loading"}</em></span></article>
        <article><Gem size={20} /><span><small>Total Materials</small><strong>{summary ? summary.materials.length : "-"}</strong><em>{summary ? `${summary.materials.filter((item) => item.is_active !== false).length} active` : "Loading"}</em></span></article>
        <article><Star size={20} /><span><small>Pending Reviews</small><strong>{summary ? count(summary.pendingReviews) : "-"}</strong><em>{summary ? `${count(summary.reviews)} recent reviews` : "Loading"}</em></span></article>
        <article><Mail size={20} /><span><small>New Customer Requests</small><strong>{summary ? count(summary.newMessages) : "-"}</strong><em>{summary ? `${count(summary.messages)} recent contact records` : "Loading"}</em></span></article>
        <article><Hammer size={20} /><span><small>Active Custom Commissions</small><strong>{summary ? summary.customRequests.items.filter((item) => !["accepted", "closed"].includes(item.status)).length : "-"}</strong><em>{summary ? `${count(summary.customRequests)} custom requests` : "Loading"}</em></span></article>
        <article><ShieldCheck size={20} /><span><small>Total Staff</small><strong>{summary ? count(summary.staff) : "-"}</strong><em>{summary ? `${summary.staff.items.filter((item) => item.is_active !== false).length} in this view active` : "Loading"}</em></span></article>
      </section>
      <section className={styles.columns}>
        <div className={styles.panel}>
          <div className={styles.panelHeading}><div><small>Latest catalogue</small><h2>Products</h2></div><Link href="/admin/product">Open products <ArrowUpRight size={15} /></Link></div>
          {summary?.products.items.length ? <ul>{summary.products.items.map((item) => <li key={item.id}><span><strong>{item.name}</strong><small>{item.updated_at ? new Date(item.updated_at).toLocaleDateString("en-IN") : "Recently updated"}</small></span><em>{label(item.status)}</em></li>)}</ul> : <p className={styles.empty}>{loading ? "Loading products..." : "No products were returned by the backend."}</p>}
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeading}><div><small>Customer conversations</small><h2>Recent enquiries</h2></div><Link href="/admin/customer-requests">Open requests <ArrowUpRight size={15} /></Link></div>
          {summary?.customRequests.items.length ? <ul>{summary.customRequests.items.map((item) => <li key={item.id}><span><strong>{item.name || item.customer_name || `Request #${item.id}`}</strong><small>{item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "Recently received"}</small></span><em>{label(item.status)}</em></li>)}</ul> : <p className={styles.empty}>{loading ? "Loading requests..." : "No custom requests were returned by the backend."}</p>}
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeading}><div><small>Moderation queue</small><h2>Reviews</h2></div><Link href="/admin/review">Open reviews <ArrowUpRight size={15} /></Link></div>
          {summary?.reviews.items.length ? <ul>{summary.reviews.items.map((item) => <li key={item.id}><span><strong>{item.product_name || `Review #${item.id}`}</strong><small>{item.customer_name || "Customer"}{item.rating ? ` - ${item.rating}/5` : ""}</small></span><em>{label(item.status)}</em></li>)}</ul> : <p className={styles.empty}>{loading ? "Loading reviews..." : "No reviews were returned by the backend."}</p>}
        </div>
      </section>
      <section className={styles.links}><Link href="/admin/category"><Boxes size={18} /><span><strong>Catalogue structure</strong><small>Manage categories, materials and deities</small></span><ArrowUpRight size={16} /></Link><Link href="/admin/staff"><ShieldCheck size={18} /><span><strong>Staff and security</strong><small>Available to administrator-role accounts</small></span><ArrowUpRight size={16} /></Link></section>
    </AdminShell>
  );
}

export function AdminDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) return <AdminShell><AdminState reason="loading" /></AdminShell>;
  if (!isSignedIn) return <AdminShell><section className={styles.auth}><div><small>Gallery administration</small><h1>Sign in to continue</h1><p>Use the existing account flow. Your backend role determines whether this workspace is available.</p></div><SignIn fallbackRedirectUrl="/admin" /></section></AdminShell>;
  if (!["staff", "admin"].includes(user?.role)) return <AdminShell><AdminState reason="forbidden" /></AdminShell>;
  return <DashboardContent />;
}
