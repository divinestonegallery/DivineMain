// @ts-nocheck
"use client";

import { useAuth } from "@/components/Auth/auth-facade";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, PackageSearch, ShieldCheck } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { useAuthConfigured } from "@/components/Auth/auth-provider";
import styles from "./checkout.module.css";

type OrderSummary = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: "online" | "bank_transfer" | "cod";
  totalPaise: number;
  currency: string;
  placedAt: number;
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value / 100);
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

function ConnectedOrderHistory() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    void getToken()
      .then((token) => fetch("/api/v1/orders", { headers: token ? { authorization: `Bearer ${token}` } : undefined, cache: "no-store" }))
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ data: OrderSummary[] }>;
      })
      .then((payload) => {
        if (!cancelled) setOrders(payload.data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, [getToken, isLoaded, isSignedIn]);

  if (!isLoaded || orders === null && !failed) return <div className={styles.centerCard}><span className={styles.spinner} /><h2 className="font-display">Opening your orders…</h2></div>;
  if (!isSignedIn) return <div className={styles.centerCard}><ShieldCheck aria-hidden="true" size={30} /><h2 className="font-display">Sign in to view your orders.</h2><Link className={buttonClassName({ size: "lg" })} href="/sign-in?redirect_url=/account/orders">Sign in <ArrowRight aria-hidden="true" size={17} /></Link></div>;
  if (failed) return <div className={styles.centerCard}><PackageSearch aria-hidden="true" size={30} /><h2 className="font-display">Orders could not be loaded.</h2><p>Please refresh the page or contact the gallery for assistance.</p></div>;
  if (!orders?.length) return <div className={styles.centerCard}><PackageSearch aria-hidden="true" size={30} /><h2 className="font-display">No orders yet.</h2><p>Your secure order history will appear here after checkout.</p><Link className={buttonClassName({ size: "lg" })} href="/cart">Review enquiry bag <ArrowRight aria-hidden="true" size={17} /></Link></div>;

  return <div className={styles.orderHistory}>{orders.map((order) => <article key={order.orderNumber}><div><span>{new Date(order.placedAt * 1000).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span><h2 className="font-display">{order.orderNumber}</h2></div><dl><div><dt>Order</dt><dd>{label(order.status)}</dd></div><div><dt>Payment</dt><dd>{label(order.paymentStatus)}</dd></div><div><dt>Method</dt><dd>{label(order.paymentMethod)}</dd></div></dl><strong>{money(order.totalPaise)}</strong></article>)}</div>;
}

export function OrderHistory() {
  const configured = useAuthConfigured();
  if (!configured) return <div className={styles.centerCard}><ShieldCheck aria-hidden="true" size={30} /><h2 className="font-display">Order history activates with secure accounts.</h2><p>Add the Clerk and PostgreSQL environment settings to open private customer orders.</p></div>;
  return <ConnectedOrderHistory />;
}
