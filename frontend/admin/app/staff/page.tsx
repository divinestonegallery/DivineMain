import { AdminAccess } from "@/components/layout/admin-access";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { AdminShell } from "@/components/layout/admin-shell";
import { StaffSecurityAdmin } from "@/components/staff/staff-admin";

export default function Page() {
  return (
    <AdminAccess redirect="/staff">
      <AdminShell>
        <AdminPageHeader title="Staff" />
        <StaffSecurityAdmin />
      </AdminShell>
    </AdminAccess>
  );
}
