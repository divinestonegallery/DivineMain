"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest } from "@shared/utils/http";
import { useToast } from "@shared/components/toast";
import styles from "./system-admin.module.css";

type PermissionChoice = { code: string; label: string };
type Member = { membership_id: number; id: number; name?: string | null; email?: string | null; role?: string; is_active?: boolean };
type SecurityGroup = {
  id: number;
  code: string;
  name: string;
  description?: string;
  is_system?: boolean;
  permissions: string[];
  members: Member[];
};
type StaffMember = { id: number; name?: string | null; email?: string | null; role?: string };

export function StaffGroupAdmin() {
  const { showToast } = useToast();
  const [catalogue, setCatalogue] = useState<PermissionChoice[]>([]);
  const [groups, setGroups] = useState<SecurityGroup[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const groupPayload = await apiRequest<{
        groups: SecurityGroup[];
        catalogue: PermissionChoice[];
        eligible_staff: StaffMember[];
      }>("/api/admin/staff/groups");
      setGroups(groupPayload.groups ?? []);
      setCatalogue(groupPayload.catalogue ?? []);
      setStaff(groupPayload.eligible_staff ?? []);
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Security groups could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  function selectedPermissions(form: HTMLFormElement) {
    return Array.from(form.querySelectorAll<HTMLInputElement>('input[name="permissions"]:checked')).map((input) => input.value);
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await apiRequest("/api/admin/staff/groups", {
        method: "POST",
        body: JSON.stringify({
          name: String(data.get("name") || ""),
          description: String(data.get("description") || ""),
          permissions: selectedPermissions(form),
        }),
      });
      form.reset();
      showToast("Security group created.");
      await load();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Security group could not be created.");
    }
  }

  async function saveGroup(group: SecurityGroup, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await apiRequest(`/api/admin/staff/groups/${group.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: String(data.get("name") || group.name),
          description: String(data.get("description") || ""),
          permissions: selectedPermissions(form),
        }),
      });
      showToast("Security group updated.");
      await load();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Security group could not be updated.");
    }
  }

  async function addMember(group: SecurityGroup, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = Number(new FormData(event.currentTarget).get("customer_id"));
    if (!selected) return;
    try {
      await apiRequest("/api/admin/staff/memberships", {
        method: "POST",
        body: JSON.stringify({ customer_id: selected, group_id: group.id }),
      });
      showToast("Staff member added to the group.");
      await load();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Membership could not be added.");
    }
  }

  async function removeMember(membershipId: number) {
    try {
      await apiRequest(`/api/admin/staff/memberships/${membershipId}`, { method: "DELETE" });
      showToast("Staff member removed from the group.");
      await load();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Membership could not be removed.");
    }
  }

  return (
    <section className={styles.panel}>
      <header><div><small>Lead access</small><h2>Security groups</h2></div></header>
      <p className={styles.note}>Groups control which lead actions a staff account can perform. Record visibility is still checked separately on each lead.</p>
      <form className={styles.settingGrid} onSubmit={createGroup}>
        <label><span>Name</span><input name="name" required minLength={2} /></label>
        <label><span>Description</span><input name="description" /></label>
        <div className={styles.checks}>
          {catalogue.map((permission) => (
            <label key={permission.code}><input name="permissions" type="checkbox" value={permission.code} />{permission.label}</label>
          ))}
        </div>
        <button type="submit">Create group</button>
      </form>
      {loading ? <div className={styles.empty}>Loading security groups...</div> : null}
      <div className={styles.groupList}>
        {groups.map((group) => (
          <article className={styles.groupCard} key={group.id}>
            <form onSubmit={(event) => void saveGroup(group, event)}>
              <label><span>Name</span><input name="name" defaultValue={group.name} required /></label>
              <label><span>Description</span><input name="description" defaultValue={group.description || ""} /></label>
              <div className={styles.checks}>
                {catalogue.map((permission) => (
                  <label key={`${group.id}-${permission.code}`}>
                    <input name="permissions" type="checkbox" value={permission.code} defaultChecked={group.permissions.includes(permission.code)} />
                    {permission.label}
                  </label>
                ))}
              </div>
              <button type="submit">Save group</button>
            </form>
            <div>
              {group.members.map((member) => (
                <div className={styles.memberRow} key={member.membership_id}>
                  <span>{member.name || member.email}<small> {member.role}</small></span>
                  <button type="button" onClick={() => void removeMember(member.membership_id)}>Remove</button>
                </div>
              ))}
              {!group.members.length ? <small>No staff in this group.</small> : null}
            </div>
            <form className={styles.memberRow} onSubmit={(event) => void addMember(group, event)}>
              <label>
                <span>Add staff</span>
                <select name="customer_id" defaultValue="" aria-label={`Add staff to ${group.name}`}>
                  <option value="">Choose a staff account</option>
                  {staff.map((person) => <option value={person.id} key={person.id}>{person.name || person.email}</option>)}
                </select>
              </label>
              <button type="submit">Add to group</button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
