"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { RefreshCw, UserPlus } from "lucide-react";
import { apiRequest } from "@shared/utils/http";
import { useToast } from "@shared/components/toast";
import styles from "../staff/system-admin.module.css";

type DirectoryUser = {
  id: number;
  email: string;
  name?: string;
  phone?: string;
  is_active: boolean;
  is_employee: boolean;
  employee_id?: number | null;
  employee_role?: "staff" | "admin" | null;
  employee_is_active?: boolean | null;
  login_ready: boolean;
};

type UserPage = {
  items: DirectoryUser[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
};

export function UserDirectoryAdmin() {
  const { showToast } = useToast();
  const [page, setPage] = useState<UserPage | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (pageNumber: number, query: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(pageNumber),
        page_size: "25",
      });
      if (query.trim()) params.set("search", query.trim());
      const payload = await apiRequest<UserPage>(`/api/admin/users?${params.toString()}`);
      setPage(payload);
      setCurrentPage(pageNumber);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Users could not be loaded.";
      setError(message);
      showToast(message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load(1, "");
  }, [load]);

  const refresh = useCallback(() => {
    load(currentPage, search);
  }, [currentPage, load, search]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    load(1, search);
  }

  async function promote(event: FormEvent) {
    event.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    setError("");
    try {
      const result = await apiRequest<DirectoryUser & { created?: boolean }>(
        `/api/admin/users/${selectedId}/employee`,
        {
          method: "POST",
          body: JSON.stringify({ role }),
        },
      );
      const loginNote = result.login_ready
        ? "Their admin sign-in is already linked."
        : "The database record is ready. An admin Clerk account still has to be linked before they can sign in.";
      showToast(result.created ? `Employee record created. ${loginNote}` : `Employee record updated. ${loginNote}`);
      await load(currentPage, search);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "The employee record could not be created.";
      setError(message);
      showToast(message);
    } finally {
      setSaving(false);
    }
  }

  const items = page?.items ?? [];
  const pagination = page?.pagination;
  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <div className={styles.groups}>
      <section className={styles.panel}>
        <header>
          <div>
            <small>Customer accounts</small>
            <h2>Users</h2>
          </div>
          <button type="button" onClick={refresh} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </button>
        </header>
        <form className={styles.settingGrid} onSubmit={onSearch}>
          <label>
            <span>Search by name or email</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" />
          </label>
          <label>
            <span>Find</span>
            <button type="submit">Search</button>
          </label>
        </form>
        {error ? <p className={styles.note}>{error}</p> : null}
        {loading ? <p className={styles.note}>Loading users…</p> : null}
        {!loading && items.length === 0 ? <p className={styles.empty}>No users match this search.</p> : null}
        <div className={styles.people}>
          {items.map((user) => (
            <article key={user.id}>
              <div>
                <strong>{user.name || user.email}</strong>
                <small>{user.email}</small>
              </div>
              <em className={user.is_employee ? styles.enabled : styles.disabled}>
                {user.is_employee ? `Employee · ${user.employee_role}` : "Customer"}
              </em>
              <button type="button" onClick={() => setSelectedId(user.id)}>
                {selectedId === user.id ? "Selected" : "Select"}
              </button>
            </article>
          ))}
        </div>
        {pagination ? (
          <p className={styles.note}>
            {pagination.total_items} users · page {pagination.page} of {Math.max(pagination.total_pages, 1)}
            {" "}
            <button type="button" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1, search)}>Previous</button>
            {" "}
            <button type="button" disabled={pagination.page >= pagination.total_pages} onClick={() => load(pagination.page + 1, search)}>Next</button>
          </p>
        ) : null}
      </section>

      <section className={styles.panel}>
        <header>
          <div>
            <small>Employee record</small>
            <h2>{selected ? selected.email : "Select a user"}</h2>
          </div>
          <UserPlus size={18} />
        </header>
        <form className={styles.settingGrid} onSubmit={promote}>
          <label>
            <span>Role</span>
            <select value={role} onChange={(event) => setRole(event.target.value as "staff" | "admin")}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label>
            <span>Create or update</span>
            <button type="submit" disabled={!selected || saving}>
              {selected?.is_employee ? "Update employee role" : "Make employee"}
            </button>
          </label>
        </form>
        <p className={styles.note}>
          Creating an employee record does not create an admin Clerk account. The person can open the admin app only after that Clerk identity is linked to the employee.
        </p>
      </section>
    </div>
  );
}
