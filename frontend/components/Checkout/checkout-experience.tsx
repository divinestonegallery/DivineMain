// @ts-nocheck
"use client";

import { useAuth } from "@/components/Auth/auth-facade";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, BadgeIndianRupee, CheckCircle2, CreditCard, Landmark, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { buttonClassName, Button } from "@/components/ui/button";
import type { CatalogItem } from "@/components/Catalog/catalog-data";
import { AccountBootstrap } from "@/components/Auth/account-bootstrap";
import { useAuthConfigured } from "@/components/Auth/auth-provider";
import styles from "./checkout.module.css";

type PaymentMethod = "online" | "bank_transfer" | "cod";

type CheckoutPreview = {
  items: Array<{
    productId: string;
    slug: string;
    name: string;
    variantId: string;
    variantName: string;
    sku: string;
    quantity: number;
    unitPricePaise: number | null;
    gstRateBps: number | null;
    heightMm: number;
    widthMm: number | null;
    depthMm: number | null;
    weightGrams: number | null;
    packageLengthMm: number | null;
    packageWidthMm: number | null;
    packageHeightMm: number | null;
    codEligible: boolean;
  }>;
  subtotalPaise: number;
  gstPaise: number;
  chargeableWeightGrams: number;
  cartFingerprint: string;
  currency: "INR";
  issues: Array<{ code: string; productId?: string; message: string }>;
  commerciallyReady: boolean;
  phoneVerified: boolean;
};

type ShippingOption = {
  quoteId: string;
  serviceName: string;
  shippingPaise: number;
  totalPaise: number;
  estimatedDeliveryDays: number | null;
  expiresAt: number;
};

type ShippingValidation = {
  status: "not_ready" | "manual_review" | "quoted";
  preview: CheckoutPreview;
  paymentIssues: Array<{ code: string; message: string }>;
  options: ShippingOption[];
  message?: string;
  postalCode: string;
  paymentMethod: PaymentMethod;
};

type PlacedOrder = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: PaymentMethod;
  totalPaise: number;
};

type RazorpayPaymentSession = {
  provider: "razorpay";
  keyId: string;
  providerOrderId: string;
  amountPaise: number;
  currency: string;
  orderNumber: string;
  prefill: { name: string; email: string | null; contact: string | null };
};

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckout = {
  open(): void;
  on(event: "payment.failed", handler: (response: unknown) => void): void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-razorpay-checkout]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Secure payment could not be loaded.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error("Secure payment could not be loaded."));
    };
    document.head.appendChild(script);
  });
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value / 100);
}

function UnconfiguredCheckout() {
  return <div className={styles.centerCard}><ShieldCheck aria-hidden="true" size={30} /><h2 className="font-display">Secure checkout is ready for account activation.</h2><p>Add the private Clerk, PostgreSQL and Shiprocket settings before accepting customer orders.</p><Link className={buttonClassName({ size: "lg" })} href="/account">Open account setup <ArrowRight aria-hidden="true" size={17} /></Link></div>;
}

function SignedInCheckout({ products }: { products: CatalogItem[] }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [validation, setValidation] = useState<ShippingValidation | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    void getToken()
      .then((token) => fetch("/api/v1/checkout", { headers: token ? { authorization: `Bearer ${token}` } : undefined, cache: "no-store" }))
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ data: CheckoutPreview }>;
      })
      .then((payload) => {
        if (!cancelled) setPreview(payload.data);
      })
      .catch(() => {
        if (!cancelled) setError("Checkout details could not be loaded. Please refresh and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [getToken, isLoaded, isSignedIn]);

  const catalogue = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);
  const selectedOption = validation?.options.find((option) => option.quoteId === selectedQuoteId) ?? null;

  async function readError(response: Response, fallback: string) {
    try {
      const payload = await response.json() as { error?: { message?: string } };
      return payload.error?.message || fallback;
    } catch {
      return fallback;
    }
  }

  async function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setValidation(null);
    setSelectedQuoteId(null);
    const form = new FormData(event.currentTarget);
    try {
      const token = await getToken();
      const response = await fetch("/api/v1/shipping/rates", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ postalCode: form.get("postalCode"), paymentMethod: form.get("paymentMethod") }),
      });
      if (!response.ok) throw new Error(await readError(response, "Live delivery rates could not be loaded."));
      const payload = await response.json() as { data: ShippingValidation };
      setPreview(payload.data.preview);
      setValidation(payload.data);
      setSelectedQuoteId(payload.data.options[0]?.quoteId ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The shipping check could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  async function place(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validation || !selectedQuoteId) return;
    setPlacing(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const shippingAddress = {
      recipientName: form.get("recipientName"),
      phoneE164: form.get("phoneE164"),
      line1: form.get("line1"),
      line2: form.get("line2"),
      landmark: form.get("landmark"),
      city: form.get("city"),
      state: form.get("state"),
      postalCode: validation.postalCode,
      countryCode: "IN",
    };
    try {
      const token = await getToken();
      const response = await fetch("/api/v1/orders", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey.current,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          shippingQuoteId: selectedQuoteId,
          paymentMethod: validation.paymentMethod,
          shippingAddress,
          billingSameAsShipping: true,
          customerNote: form.get("customerNote"),
        }),
      });
      if (!response.ok) throw new Error(await readError(response, "The order could not be placed."));
      const payload = await response.json() as { data: PlacedOrder; paymentSession: RazorpayPaymentSession | null };
      if (validation.paymentMethod === "online") {
        if (!payload.paymentSession) throw new Error("The secure payment session is unavailable. Your order is saved; please try again.");
        await loadRazorpayCheckout();
        const Razorpay = window.Razorpay;
        if (!Razorpay) throw new Error("Secure payment could not be loaded.");
        const paidOrder = await new Promise<PlacedOrder>((resolve, reject) => {
          let settled = false;
          const fail = (message: string) => {
            if (settled) return;
            settled = true;
            reject(new Error(message));
          };
          const checkout = new Razorpay({
            key: payload.paymentSession!.keyId,
            amount: payload.paymentSession!.amountPaise,
            currency: payload.paymentSession!.currency,
            name: "Divine Stone Gallery",
            description: `Order ${payload.paymentSession!.orderNumber}`,
            order_id: payload.paymentSession!.providerOrderId,
            prefill: {
              name: payload.paymentSession!.prefill.name,
              email: payload.paymentSession!.prefill.email || undefined,
              contact: payload.paymentSession!.prefill.contact || undefined,
            },
            theme: { color: "#9b6d2f" },
            modal: {
              ondismiss: () => fail("Payment was not completed. Your order is saved and you can safely try again."),
            },
            handler: async (payment: RazorpaySuccess) => {
              try {
                const verification = await fetch("/api/v1/payments/razorpay/verify", {
                  method: "POST",
                  headers: {
                    "content-type": "application/json",
                    ...(token ? { authorization: `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify({ orderNumber: payload.paymentSession!.orderNumber, ...payment }),
                });
                if (!verification.ok) throw new Error(await readError(verification, "Payment confirmation is still pending."));
                const verified = await verification.json() as { data: PlacedOrder };
                if (!settled) {
                  settled = true;
                  resolve(verified.data);
                }
              } catch (reason) {
                fail(reason instanceof Error ? reason.message : "Payment confirmation is still pending.");
              }
            },
          });
          checkout.on("payment.failed", () => fail("Payment was not completed. Your order is saved and you can safely try again."));
          checkout.open();
        });
        setPlacedOrder(paidOrder);
      } else {
        setPlacedOrder(payload.data);
      }
      idempotencyKey.current = crypto.randomUUID();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The order could not be placed.");
    } finally {
      setPlacing(false);
    }
  }

  if (!isLoaded || loading && !preview) return <div className={styles.centerCard}><span className={styles.spinner} /><h2 className="font-display">Preparing your secure checkout…</h2></div>;
  if (!isSignedIn) return <div className={styles.centerCard}><ShieldCheck aria-hidden="true" size={30} /><h2 className="font-display">Sign in before placing an order.</h2><p>Your account protects addresses, payment status, invoices and order history.</p><Link className={buttonClassName({ size: "lg" })} href="/sign-in?redirect_url=/checkout">Sign in to continue <ArrowRight aria-hidden="true" size={17} /></Link></div>;
  if (placedOrder) return <div className={styles.centerCard}><CheckCircle2 aria-hidden="true" size={34} /><h2 className="font-display">Order {placedOrder.orderNumber} is placed.</h2><p>{placedOrder.paymentMethod === "cod" ? "Your Cash on Delivery request is awaiting gallery approval." : placedOrder.paymentMethod === "online" ? (placedOrder.paymentStatus === "paid" ? "Your online payment is verified and the gallery has received your order." : "Your payment is authorized and is awaiting final confirmation.") : "Your bank-transfer payment is pending. The gallery will share the verified payment instructions."}</p><strong className={styles.placedTotal}>{money(placedOrder.totalPaise)}</strong><Link className={buttonClassName({ size: "lg" })} href="/account/orders">View your orders <ArrowRight aria-hidden="true" size={17} /></Link></div>;
  if (error && !preview) return <div className={styles.centerCard}><AlertTriangle aria-hidden="true" size={30} /><h2 className="font-display">Checkout is temporarily unavailable.</h2><p>{error}</p></div>;
  if (!preview?.items.length) return <div className={styles.centerCard}><PackageCheck aria-hidden="true" size={30} /><h2 className="font-display">Your enquiry bag has no works to check out.</h2><p>Add one or more ready-made works, then return here to verify pricing, GST, stock and delivery.</p><Link className={buttonClassName({ size: "lg" })} href="/shop">Explore the collection <ArrowRight aria-hidden="true" size={17} /></Link></div>;

  const activeIssues = [...preview.issues, ...(validation?.paymentIssues ?? [])];
  return (
    <div className={styles.checkoutGrid}>
      <div className={styles.itemsPanel}>
        <div className={styles.panelHeading}><div><span>Selected works</span><h2 className="font-display">Your order review</h2></div><Link href="/cart">Edit bag</Link></div>
        <div className={styles.items}>{preview.items.map((item) => { const product = catalogue.get(item.productId); return <article className={styles.item} key={item.productId}>{product ? <Link className={styles.itemImage} href={`/products/${product.slug}`}><Image src={product.image} alt={product.imageAlt} fill sizes="92px" /></Link> : null}<div><small>{item.sku} · {item.variantName}</small><h3 className="font-display">{item.name}</h3><p>Quantity {item.quantity}</p></div><strong>{item.unitPricePaise === null ? "Price pending" : money(item.unitPricePaise * item.quantity)}</strong></article>; })}</div>
        {activeIssues.length ? <div className={styles.issueList}><h3><AlertTriangle aria-hidden="true" size={18} /> Details required before ordering</h3>{activeIssues.map((issue, index) => <p key={`${issue.code}-${index}`}>{issue.message}</p>)}</div> : <div className={styles.readyMessage}><CheckCircle2 aria-hidden="true" size={19} /><span>Price, GST, packed dimensions, weight and stock are complete.</span></div>}

        {validation?.status === "quoted" ? <section className={styles.deliveryOptions}><div><span>Live surface delivery</span><h2 className="font-display">Choose a protected delivery rate</h2></div>{validation.options.map((option) => <label key={option.quoteId}><input type="radio" name="shippingQuote" value={option.quoteId} checked={selectedQuoteId === option.quoteId} onChange={() => setSelectedQuoteId(option.quoteId)} /><Truck aria-hidden="true" size={20} /><span><strong>{option.serviceName}</strong><small>{option.estimatedDeliveryDays === null ? "Delivery estimate confirmed after booking" : `Estimated ${option.estimatedDeliveryDays} days`} · valid for 30 minutes</small></span><b>{money(option.shippingPaise)}</b></label>)}</section> : null}
        {validation?.status === "manual_review" ? <div className={styles.issueList}><h3><Truck aria-hidden="true" size={18} /> Protected freight review required</h3><p>{validation.message}</p></div> : null}

        {selectedOption && validation ? <form className={styles.addressForm} onSubmit={place}><div><span>Delivery details</span><h2 className="font-display">Where should we deliver?</h2><p>Billing will initially use the same address. It can be corrected with the gallery before invoicing.</p></div><div className={styles.addressGrid}><label><span>Recipient name</span><input name="recipientName" required maxLength={120} /></label><label><span>Phone number</span><input name="phoneE164" type="tel" required placeholder="+91 98765 43210" /></label><label className={styles.fullField}><span>Address line</span><input name="line1" required maxLength={180} /></label><label><span>Address line 2</span><input name="line2" maxLength={180} /></label><label><span>Landmark</span><input name="landmark" maxLength={180} /></label><label><span>City</span><input name="city" required maxLength={100} /></label><label><span>State</span><input name="state" required maxLength={100} /></label><label><span>Postcode</span><input value={validation.postalCode} readOnly /></label><label className={styles.fullField}><span>Order note</span><textarea name="customerNote" maxLength={1000} placeholder="Placement, access or delivery guidance for the gallery" /></label></div><div className={styles.placeOrderBar}><div><small>Server-verified total</small><strong>{money(selectedOption.totalPaise)}</strong></div><Button size="lg" type="submit" disabled={placing}>{placing ? "Placing securely…" : validation.paymentMethod === "cod" ? "Place COD request" : validation.paymentMethod === "online" ? "Pay securely with Razorpay" : "Place bank-transfer order"}</Button></div></form> : null}
      </div>

      <aside className={styles.summaryPanel}>
        <span className={styles.secureLabel}><ShieldCheck aria-hidden="true" size={15} /> Server-verified totals</span><h2 className="font-display">Checkout readiness</h2>
        <dl><div><dt>Price before GST</dt><dd>{money(preview.subtotalPaise)}</dd></div><div><dt>GST</dt><dd>{preview.commerciallyReady ? money(preview.gstPaise) : "Pending"}</dd></div><div><dt>Shipping</dt><dd>{selectedOption ? money(selectedOption.shippingPaise) : "Calculated separately"}</dd></div><div className={styles.total}><dt>Final total</dt><dd>{selectedOption ? money(selectedOption.totalPaise) : "After shipping"}</dd></div></dl>
        <form className={styles.readinessForm} onSubmit={validate}><label><span>Delivery postcode</span><input name="postalCode" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} required placeholder="6-digit Indian postcode" /></label><fieldset><legend>Preferred payment</legend><label><input type="radio" name="paymentMethod" value="online" required /><CreditCard aria-hidden="true" size={17} /><span>Online payment<small>UPI, cards and netbanking via Razorpay</small></span></label><label><input type="radio" name="paymentMethod" value="bank_transfer" /><Landmark aria-hidden="true" size={17} /><span>Bank transfer<small>Order remains payment pending</small></span></label><label><input type="radio" name="paymentMethod" value="cod" /><BadgeIndianRupee aria-hidden="true" size={17} /><span>Cash on Delivery<small>Verified phone + staff approval</small></span></label></fieldset><Button size="lg" type="submit" disabled={loading}>{loading ? "Checking live rates…" : "Get live delivery rates"}</Button></form>
        {validation?.status === "quoted" ? <div className={styles.shippingNotice}><Truck aria-hidden="true" size={18} /><p>Live Shiprocket surface rates found for {validation.options.length} delivery {validation.options.length === 1 ? "option" : "options"}.</p></div> : null}
        {error ? <p className={styles.formError}>{error}</p> : null}
        <small className={styles.safetyNote}>Rates are calculated from the gallery pickup postcode, your delivery postcode and each work&apos;s packed dimensions, weight, value and payment mode.</small>
      </aside>
    </div>
  );
}

export function CheckoutExperience({ products }: { products: CatalogItem[] }) {
  const configured = useAuthConfigured();
  if (!configured) return <UnconfiguredCheckout />;
  return <><AccountBootstrap /><SignedInCheckout products={products} /></>;
}
