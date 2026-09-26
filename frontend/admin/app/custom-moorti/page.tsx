import { AdminAccess } from "@/components/layout/admin-access";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { AdminShell } from "@/components/layout/admin-shell";
import { CustomMoortiAdmin } from "@/components/contact/contact-admin";

export default function Page() {
  return (
    <AdminAccess redirect="/custom-moorti">
      <AdminShell>
        <AdminPageHeader title="Custom Moorti" />
        <CustomMoortiAdmin />
      </AdminShell>
    </AdminAccess>
  );
}
