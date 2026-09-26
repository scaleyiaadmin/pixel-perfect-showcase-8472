import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/AdminShell";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminShell>
      {/* Required: nested admin routes render here. */}
      <Outlet />
    </AdminShell>
  );
}
