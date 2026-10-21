import { AdminAccess } from "@/components/layout/admin-access";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { AdminShell } from "@/components/layout/admin-shell";
import { LeadsAdmin } from "@/components/leads/leads-admin";

export default function Page() {
  return (
    <AdminAccess redirect="/leads">
      <AdminShell>
        <AdminPageHeader title="Leads" />
        <LeadsAdmin />
      </AdminShell>
    </AdminAccess>
  );
}
