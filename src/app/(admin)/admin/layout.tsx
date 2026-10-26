import type { Metadata } from "next";
import { AdminShell } from "@/components/layout/admin-shell";
import { RequireAdmin } from "@/components/shared/guards";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · RailYatra Admin" } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <RequireAdmin>
      <AdminShell>{children}</AdminShell>
    </RequireAdmin>
  );
}
