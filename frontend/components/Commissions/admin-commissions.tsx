// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiRequest } from "@/api/client";
import { useToast } from "@/components/ui/toast";
import styles from "./commission-workspace.module.css";

type CustomRequest = {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  city: string;
  pincode?: string;
  approximate_height?: string;
  preferred_material?: string;
  description?: string;
  status: "new" | "contacted" | "quoted" | "accepted" | "closed";
  created_at?: string;
  updated_at?: string;
  customer_name?: string;
  customer_email?: string;
};

type RequestList = {
  items: CustomRequest[];
  pagination?: { total_items?: number };
};

const statuses = ["new", "contacted", "quoted", "accepted", "closed"];
const label = (value?: string) => (value || "not set").replaceAll("_", " ");

export function AdminCommissions() {
  const { showToast } = useToast();
  const [items, setItems] = useState<CustomRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiRequest<RequestList>("/api/admin/contact/customize?page_size=50");
      setItems(payload.items ?? []);
    } catch {
      showToast("The custom request queue could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(item: CustomRequest, status: string) {
    try {
      const updated = await apiRequest<CustomRequest>(`/api/admin/contact/customize/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setItems((current) => current.map((candidate) => candidate.id === item.id ? updated : candidate));
      showToast("Custom request status updated.");
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Status could not be updated.");
    }
  }

  return (
    <section className={styles.section}>
      <div className="site-container">
        <div className={styles.toolbar}>
          <p>{items.length} custom {items.length === 1 ? "request" : "requests"}</p>
          <button onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button>
        </div>
        {loading ? <div className={styles.empty}>Loading custom requests...</div> : !items.length ? <div className={styles.empty}>No custom murti requests yet.</div> : (
          <div className={styles.grid}>
            {items.map((item) => (
              <article className={styles.detailCard} key={item.id}>
                <span className={styles.eyebrow}>Request #{item.id}</span>
                <h2 className="font-display">{item.name || item.customer_name || "Custom murti enquiry"}</h2>
                <p>{item.email || item.customer_email || item.phone || "No contact"} - {item.city}{item.pincode ? ` ${item.pincode}` : ""}</p>
                <div className={styles.summary}>
                  <div><dt>Status</dt><dd>{label(item.status)}</dd></div>
                  <div><dt>Height</dt><dd>{item.approximate_height || "To discuss"}</dd></div>
                  <div><dt>Material</dt><dd>{item.preferred_material || "To discuss"}</dd></div>
                  <div><dt>Created</dt><dd>{item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "Recent"}</dd></div>
                </div>
                {item.description ? <p>{item.description}</p> : null}
                <form className={styles.formCard} onSubmit={(event) => { event.preventDefault(); void updateStatus(item, new FormData(event.currentTarget).get("status")?.toString() || item.status); }}>
                  <label>Status<select name="status" defaultValue={item.status}>{statuses.map((status) => <option value={status} key={status}>{label(status)}</option>)}</select></label>
                  <button type="submit">Save status</button>
                </form>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
