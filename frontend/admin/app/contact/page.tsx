import { AdminAccess } from "@/components/layout/admin-access";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { AdminShell } from "@/components/layout/admin-shell";
import { ContactAdmin } from "@/components/contact/contact-admin";

export default function Page() {
  return (
    <AdminAccess redirect="/contact">
      <AdminShell>
        <AdminPageHeader title="Contact" />
        <ContactAdmin />
      </AdminShell>
    </AdminAccess>
  );
}
