"use client";

import { AlertTriangle, CheckCircle2, FileText, Hammer, Mail, RefreshCw, RotateCcw, Search, X, ZoomIn, ZoomOut } from "lucide-react";
import { FormEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@shared/utils/http";
import { useToast } from "@shared/components/toast";
import {
  type AdminPagination,
  type AdminList,
  type NormalizedAdminList,
  type ContactRequestRecord,
  type CustomizeRequestRecord,
  type CustomerRequestRecord,
  contactStatuses,
  customizeStatuses,
  contactTransitions,
  customizeTransitions,
  requestPageSize,
  label,
  when,
  asAdminList,
  statusTone,
} from "@/components/common/admin-records";
import styles from "@/components/common/commerce-operations.module.css";

function requestTitle(item: CustomerRequestRecord) {
  return item.name || item.customer_name || item.email || item.customer_email || `${item.kind === "customize" ? "Custom request" : "Contact request"} #${item.id}`;
}

function requestDetailsText(item: CustomerRequestRecord) {
  return item.kind === "contact" ? item.message || "No message supplied." : item.description || "No customization description supplied.";
}

function allowedRequestStatuses(item: CustomerRequestRecord) {
  if (item.kind === "contact") return contactTransitions[item.status] ?? contactStatuses;
  return customizeTransitions[item.status] ?? customizeStatuses;
}

function requestListUrl(path: string, page: number, status: string) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(requestPageSize),
  });
  if (status !== "all") params.set("status", status);
  return `${path}?${params.toString()}`;
}

function PaginationControls({
  pagination,
  loading,
  onPageChange,
}: {
  pagination?: AdminPagination;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  const page = Math.max(1, pagination?.page ?? 1);
  const totalPages = Math.max(1, pagination?.total_pages ?? 1);
  const totalItems = pagination?.total_items ?? 0;

  if (totalPages <= 1 && !totalItems) return null;

  return (
    <div className={styles.pagination}>
      <button className={styles.secondary} type="button" onClick={() => onPageChange(page - 1)} disabled={loading || page <= 1}>Previous</button>
      <span>Page {page} of {totalPages}{totalItems ? ` - ${totalItems} total` : ""}</span>
      <button className={styles.secondary} type="button" onClick={() => onPageChange(page + 1)} disabled={loading || page >= totalPages}>Next</button>
    </div>
  );
}

function ReferenceImageViewer({ src }: { src: string }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef({ startX: 0, startY: 0, originX: 0, originY: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [fitScale, setFitScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [available, setAvailable] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setNaturalSize({ width: 0, height: 0 });
    setFitScale(1);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
    setAvailable(true);
    setExpanded(false);
  }, [src]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  function fitImageToViewport() {
    const image = imageRef.current;
    const viewport = viewportRef.current;
    if (!image?.naturalWidth || !image.naturalHeight || !viewport) return;

    const nextFitScale = Math.min(
      1,
      viewport.clientWidth / image.naturalWidth,
      viewport.clientHeight / image.naturalHeight,
    );
    setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
    setFitScale(nextFitScale);
    setScale(nextFitScale);
    setOffset({ x: 0, y: 0 });
  }

  useEffect(() => {
    if (!expanded) return;
    const frame = window.requestAnimationFrame(fitImageToViewport);
    const handleResize = () => fitImageToViewport();
    window.addEventListener("resize", handleResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, [expanded, src]);

  useEffect(() => {
    if (!expanded) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expanded]);

  function reset() {
    setScale(fitScale);
    setOffset({ x: 0, y: 0 });
    viewportRef.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  function changeZoom(direction: number) {
    setScale((current) => {
      const step = fitScale * 0.25;
      const next = Math.min(fitScale * 4, Math.max(fitScale, current + direction * step));
      setOffset((currentOffset) => next === fitScale ? { x: 0, y: 0 } : clampOffset(currentOffset, next));
      return next;
    });
  }

  function clampOffset(next: { x: number; y: number }, nextScale = scale) {
    const viewport = viewportRef.current;
    if (!viewport) return next;
    const zoomRatio = nextScale / fitScale;
    const maxX = viewport.clientWidth * Math.max(0, zoomRatio - 1) / 2;
    const maxY = viewport.clientHeight * Math.max(0, zoomRatio - 1) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    changeZoom(event.deltaY < 0 ? 1 : -1);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (scale <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, originX: offset.x, originY: offset.y };
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setOffset(clampOffset({
      x: dragRef.current.originX + event.clientX - dragRef.current.startX,
      y: dragRef.current.originY + event.clientY - dragRef.current.startY,
    }));
  }

  function stopDragging(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }

  if (!available) return <p className={styles.referenceUnavailable}>Reference image unavailable</p>;

  return (
    <div className={`${styles.referenceViewer} ${expanded ? styles.referenceViewerExpanded : ""}`.trim()}>
      {expanded ? <button className={styles.referenceClose} type="button" onClick={() => setExpanded(false)} aria-label="Close expanded reference image" title="Close"><X size={18} /></button> : null}
      <div
        ref={viewportRef}
        className={`${styles.referenceViewport} ${dragging ? styles.referenceViewportDragging : ""}`.trim()}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onClick={() => { if (scale === fitScale) setExpanded(true); }}
        title={scale > 1 ? "Drag to inspect the reference image" : "Click to expand or scroll to zoom"}
      >
        {/* Native img is required here because the zoom viewer measures and transforms the element directly. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.referenceImage}
          src={src}
          alt="Customer reference"
          draggable={false}
          ref={imageRef}
          onLoad={fitImageToViewport}
          onError={() => setAvailable(false)}
          style={expanded && naturalSize.width && naturalSize.height
            ? {
                width: naturalSize.width * scale,
                height: naturalSize.height * scale,
                maxWidth: "none",
                maxHeight: "none",
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }
            : { transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale / fitScale})` }}
        />
      </div>
      <div className={styles.referenceControls} aria-label="Reference image controls">
        <button type="button" onClick={() => changeZoom(-1)} disabled={scale <= fitScale} aria-label="Zoom out" title="Zoom out"><ZoomOut size={14} /></button>
        <button type="button" onClick={reset} disabled={scale === fitScale && offset.x === 0 && offset.y === 0} aria-label="Reset image" title="Reset image"><RotateCcw size={14} /></button>
        <button type="button" onClick={() => changeZoom(1)} disabled={scale >= fitScale * 4} aria-label="Zoom in" title="Zoom in"><ZoomIn size={14} /></button>
      </div>
    </div>
  );
}

function RequestRow({ item, refresh }: { item: CustomerRequestRecord; refresh: () => Promise<void> }) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const status = new FormData(event.currentTarget).get("status")?.toString() || item.status;
    setSaving(true);
    try {
      await apiRequest(item.kind === "contact" ? `/api/admin/contact/message/${item.id}` : `/api/admin/contact/customize/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      showToast("Request status updated.");
      await refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Request status could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className={styles.record}>
      <summary>
        <span className={styles.identity}>
          <strong>{requestTitle(item)}</strong>
          <small>{item.kind === "customize" ? "Custom moorti" : "Contact message"} - {item.email || item.customer_email || "No email"}{item.phone ? ` - ${item.phone}` : ""}</small>
        </span>
        <span>{when(item.created_at)}</span>
        <span className={`${styles.pill} ${statusTone(item.status)}`}>{label(item.status)}</span>
        {item.kind === "customize" ? <Hammer size={16} /> : <Mail size={16} />}
      </summary>
      <div className={styles.recordBody}>
        <p>{requestDetailsText(item)}</p>
        <div className={styles.detailGrid}>
          <section>
            <h3>Contact</h3>
            <p><strong>Name:</strong> {requestTitle(item)}</p>
            <p><strong>Email:</strong> {item.email || item.customer_email || "Not supplied"}</p>
            <p><strong>Phone:</strong> {item.phone || "Not supplied"}</p>
          </section>
          <section>
            <h3>Request</h3>
            {item.kind === "customize" ? (
              <>
                <p><strong>City:</strong> {item.city || "Not supplied"}</p>
                <p><strong>Pincode:</strong> {item.pincode || "Not supplied"}</p>
                <p><strong>Height:</strong> {item.approximate_height || "Not supplied"}</p>
                <p><strong>Material:</strong> {item.preferred_material || "Not supplied"}</p>
              </>
            ) : (
              <>
                <p><strong>Type:</strong> Product enquiry/contact</p>
                <p><strong>Received:</strong> {when(item.created_at)}</p>
              </>
            )}
          </section>
          <section>
            <h3>Reference</h3>
            {item.kind === "customize" && (item.reference_image || item.reference_object_key) ? (
              <ReferenceImageViewer src={item.reference_image || item.reference_object_key || ""} />
            ) : (
              <p>No reference file supplied.</p>
            )}
          </section>
        </div>
        <form className={styles.fieldGrid} onSubmit={save}>
          <label><span>Status</span><select name="status" defaultValue={item.status}>{allowedRequestStatuses(item).map((status) => <option value={status} key={status}>{label(status)}</option>)}</select></label>
          <label><span>Last update</span><input value={when(item.updated_at || item.created_at)} readOnly disabled /></label>
          <div className={`${styles.actions} ${styles.wide}`}>
            <button className={styles.primary} type="submit" disabled={saving}>{saving ? "Saving..." : "Save status"}</button>
          </div>
        </form>
      </div>
    </details>
  );
}

export function ContactAdmin() {
  const { showToast } = useToast();
  const [list, setList] = useState<NormalizedAdminList<ContactRequestRecord>>(() => asAdminList<ContactRequestRecord>([], 1));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ContactRequestRecord["status"]>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiRequest<AdminList<Omit<ContactRequestRecord, "kind">> | Array<Omit<ContactRequestRecord, "kind">>>(
        requestListUrl("/api/admin/contact/message", page, status),
      );
      const normalized = asAdminList(payload, page);
      setList({
        ...normalized,
        items: normalized.items.map((item): ContactRequestRecord => ({ ...item, kind: "contact" })),
      });
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Contact messages could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, showToast, status]);

  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return list.items.filter((item) => !needle || `${requestTitle(item)} ${item.email} ${item.phone} ${item.message} ${item.status}`.toLowerCase().includes(needle));
  }, [list.items, query]);

  return (
    <section className={styles.section}>
      <div className={styles.metrics}>
        <article><Mail size={19} /><span><small>Messages in view</small><strong>{list.items.length}</strong></span></article>
        <article><AlertTriangle size={19} /><span><small>New</small><strong>{list.items.filter((item) => item.status === "new").length}</strong></span></article>
        <article><CheckCircle2 size={19} /><span><small>Contacted</small><strong>{list.items.filter((item) => item.status === "contacted").length}</strong></span></article>
        <article><FileText size={19} /><span><small>Closed</small><strong>{list.items.filter((item) => item.status === "closed").length}</strong></span></article>
      </div>
      <div className={styles.toolbar}>
        <label><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contacts..." /></label>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
            setPage(1);
          }}
          aria-label="Filter contact status"
        >
          <option value="all">All statuses</option>
          {contactStatuses.map((value) => <option value={value} key={value}>{label(value)}</option>)}
        </select>
        <button className={styles.secondary} type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} />{loading ? "Loading..." : "Refresh"}</button>
      </div>
      <div className={styles.list}>
        {loading ? <p className={styles.empty}>Loading contact messages...</p> : filtered.map((item) => <RequestRow item={item} refresh={refresh} key={`contact-${item.id}`} />)}
        {!loading && !filtered.length ? <p className={styles.empty}>No contact messages found.</p> : null}
      </div>
      <PaginationControls pagination={list.pagination} loading={loading} onPageChange={setPage} />
    </section>
  );
}

export function CustomMoortiAdmin() {
  const { showToast } = useToast();
  const [list, setList] = useState<NormalizedAdminList<CustomizeRequestRecord>>(() => asAdminList<CustomizeRequestRecord>([], 1));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | CustomizeRequestRecord["status"]>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiRequest<AdminList<Omit<CustomizeRequestRecord, "kind">> | Array<Omit<CustomizeRequestRecord, "kind">>>(
        requestListUrl("/api/admin/contact/customize", page, status),
      );
      const normalized = asAdminList(payload, page);
      setList({
        ...normalized,
        items: normalized.items.map((item): CustomizeRequestRecord => ({ ...item, kind: "customize" })),
      });
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Custom moorti requests could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, showToast, status]);

  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return list.items.filter((item) => !needle || `${requestTitle(item)} ${item.email} ${item.customer_email} ${item.phone} ${item.city} ${item.description} ${item.status}`.toLowerCase().includes(needle));
  }, [list.items, query]);

  return (
    <section className={styles.section}>
      <div className={styles.metrics}>
        <article><Hammer size={19} /><span><small>Requests in view</small><strong>{list.items.length}</strong></span></article>
        <article><AlertTriangle size={19} /><span><small>New</small><strong>{list.items.filter((item) => item.status === "new").length}</strong></span></article>
        <article><FileText size={19} /><span><small>Quoted</small><strong>{list.items.filter((item) => item.status === "quoted").length}</strong></span></article>
        <article><CheckCircle2 size={19} /><span><small>Accepted or Closed</small><strong>{list.items.filter((item) => ["accepted", "closed"].includes(item.status)).length}</strong></span></article>
      </div>
      <div className={styles.toolbar}>
        <label><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search custom moorti requests" /></label>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
            setPage(1);
          }}
          aria-label="Filter custom moorti status"
        >
          <option value="all">All statuses</option>
          {customizeStatuses.map((value) => <option value={value} key={value}>{label(value)}</option>)}
        </select>
        <button className={styles.secondary} type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} />{loading ? "Loading..." : "Refresh"}</button>
      </div>
      <div className={styles.list}>
        {loading ? <p className={styles.empty}>Loading custom moorti requests...</p> : filtered.map((item) => <RequestRow item={item} refresh={refresh} key={`customize-${item.id}`} />)}
        {!loading && !filtered.length ? <p className={styles.empty}>No custom moorti requests found.</p> : null}
      </div>
      <PaginationControls pagination={list.pagination} loading={loading} onPageChange={setPage} />
    </section>
  );
}
