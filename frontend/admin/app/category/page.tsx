import { AdminAccess } from "@/components/layout/admin-access";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { AdminShell } from "@/components/layout/admin-shell";
import { CatalogStructureAdmin } from "@/components/product/catalog-structure-admin";

export default function Page() {
  return (
    <AdminAccess redirect="/category">
      <AdminShell>
        <AdminPageHeader title="Category" />
        <CatalogStructureAdmin kind="category" />
      </AdminShell>
    </AdminAccess>
  );
}
