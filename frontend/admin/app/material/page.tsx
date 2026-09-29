import { AdminAccess } from "@/components/layout/admin-access";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { AdminShell } from "@/components/layout/admin-shell";
import { CatalogStructureAdmin } from "@/components/product/catalog-structure-admin";

export default function Page() {
  return (
    <AdminAccess redirect="/material">
      <AdminShell>
        <AdminPageHeader title="Material" />
        <CatalogStructureAdmin kind="material" />
      </AdminShell>
    </AdminAccess>
  );
}
