import { AdminAccess } from "@/components/layout/admin-access";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { AdminShell } from "@/components/layout/admin-shell";
import { ReviewAdmin } from "@/components/review/review-admin";

export default function Page() {
  return (
    <AdminAccess redirect="/review">
      <AdminShell>
        <AdminPageHeader title="Review" />
        <ReviewAdmin />
      </AdminShell>
    </AdminAccess>
  );
}
