import { AdminAccess } from "@/components/layout/admin-access";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { AdminShell } from "@/components/layout/admin-shell";
import { UserDirectoryAdmin } from "@/components/users/users-admin";

export default function Page() {
  return (
    <AdminAccess redirect="/users">
      <AdminShell>
        <AdminPageHeader title="Users" />
        <UserDirectoryAdmin />
      </AdminShell>
    </AdminAccess>
  );
}
