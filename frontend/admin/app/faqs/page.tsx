import { AdminAccess } from "@/components/layout/admin-access";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { AdminShell } from "@/components/layout/admin-shell";
import { FAQsAdmin } from "@/components/faq/faq-admin";

export default function Page() {
  return (
    <AdminAccess redirect="/faqs">
      <AdminShell>
        <AdminPageHeader title="FAQs" />
        <FAQsAdmin />
      </AdminShell>
    </AdminAccess>
  );
}
