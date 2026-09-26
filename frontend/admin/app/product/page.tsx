import { AdminAccess } from "@/components/layout/admin-access";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { AdminShell } from "@/components/layout/admin-shell";
import { CatalogAdmin } from "@/components/product/catalog-admin";

export default function Page() {
  return (
    <AdminAccess redirect="/product">
      <AdminShell>
        <AdminPageHeader title="Product" />
        <CatalogAdmin />
      </AdminShell>
    </AdminAccess>
  );
}
