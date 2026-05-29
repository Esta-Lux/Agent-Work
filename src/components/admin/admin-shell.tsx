import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";

export type AdminSection =
  | "overview"
  | "user-health"
  | "self-agent"
  | "readiness"
  | "providers"
  | "data"
  | "usage"
  | "control"
  | "security"
  | "audit";

interface AdminShellProps {
  currentSection: AdminSection;
  children: ReactNode;
}

export function AdminShell({ currentSection, children }: AdminShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-admin text-text-admin-1">
      <AdminSidebar currentSection={currentSection} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar currentSection={currentSection} />
        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
