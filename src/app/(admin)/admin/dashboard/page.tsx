import type { Metadata } from "next";
import { AdminDashboard } from "@/features/admin/admin-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
