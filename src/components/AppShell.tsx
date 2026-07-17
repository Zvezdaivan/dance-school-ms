import Link from "next/link";
import { ReactNode } from "react";
import { SessionUser, can } from "@/lib/auth";
import { Permission, label } from "@/lib/constants";
import { LogoutButton } from "./LogoutButton";

const NAV: { href: string; title: string; permission: Permission | null; icon: string }[] = [
  { href: "/dashboard", title: "Dashboard", permission: null, icon: "◧" },
  { href: "/students", title: "Students", permission: "students.read", icon: "👥" },
  { href: "/payments", title: "Payments", permission: "payments.read", icon: "💳" },
  { href: "/classes", title: "Classes", permission: "classes.read", icon: "🩰" },
  { href: "/attendance", title: "Attendance", permission: "attendance.read", icon: "✓" },
  { href: "/teachers", title: "Teachers", permission: "teachers.read", icon: "🎓" },
  { href: "/work-logs", title: "Work Hours", permission: "worklogs.read", icon: "⏱" },
  { href: "/payroll", title: "Payroll", permission: "payroll.read", icon: "💰" },
  { href: "/reports", title: "Reports", permission: "reports.export", icon: "📊" },
  { href: "/users", title: "Users", permission: "users.manage", icon: "🔐" },
  { href: "/audit-logs", title: "Audit Log", permission: "audit.read", icon: "📋" },
];

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const items = NAV.filter((item) => item.permission === null || can(user, item.permission));
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-10 flex w-56 flex-col bg-gray-900 text-gray-300">
        <div className="border-b border-gray-800 px-5 py-5">
          <div className="text-base font-bold text-white">Dance School MS</div>
          <div className="mt-0.5 text-xs text-gray-500">Internal management</div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-white"
            >
              <span className="w-5 text-center text-xs">{item.icon}</span>
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-800 px-5 py-4">
          <div className="text-sm font-medium text-white">{user.name}</div>
          <div className="mb-2 text-xs text-gray-500">{label(user.role)}</div>
          <LogoutButton />
        </div>
      </aside>
      <main className="ml-56 flex-1 px-8 py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
