import { notFound } from "next/navigation";
import { AdminDashboard } from "@/components/Admin/admin-dashboard";
import { AdminSectionPage } from "@/components/Admin/admin-section-content";

const adminSectionSlugs = [
  "overview",
  "category",
  "deity",
  "material",
  "product",
  "review",
  "faqs",
  "contact",
  "custom-mooti",
  "staff",
] as const;

type AdminRouteSectionSlug = (typeof adminSectionSlugs)[number];

export const metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return adminSectionSlugs.map((section) => ({ section }));
}

function isAdminSection(section: string): section is AdminRouteSectionSlug {
  return (adminSectionSlugs as readonly string[]).includes(section);
}

export default async function AdminSectionRoute({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isAdminSection(section)) notFound();
  if (section === "overview") return <AdminDashboard />;
  return <AdminSectionPage section={section as Exclude<AdminRouteSectionSlug, "overview">} />;
}
