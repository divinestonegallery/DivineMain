import { AdminDashboard } from "@/components/Admin/admin-dashboard";

export const metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}