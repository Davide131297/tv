import type { Metadata } from "next";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { ADMIN_TABLES } from "@/lib/admin-schema";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return <AdminLogin />;
  }

  return <AdminDashboard tables={ADMIN_TABLES} />;
}
