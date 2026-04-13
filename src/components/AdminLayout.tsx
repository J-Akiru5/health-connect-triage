import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Cpu,
  Video,
  Bell,
  FileText,
  LogOut,
  Menu,
  X,
  Settings,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLogoMark } from "@/components/AppLogoMark";

const adminNav = [
  { to: "/admin", end: true, icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/users", icon: Users, label: "User Management" },
  { to: "/admin/ai-triage", icon: Cpu, label: "AI Triage Oversight" },
  { to: "/admin/teleconsult-referrals", icon: Video, label: "Teleconsult & Referrals" },
  { to: "/admin/notifications", icon: Bell, label: "Notifications & Alerts" },
  { to: "/admin/audit", icon: FileText, label: "Audit & Reporting" },
  { to: "/admin/settings", icon: Settings, label: "System Settings" },
];

type AdminLayoutProps = { children: React.ReactNode };

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen((o) => !o)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link to="/admin" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <AppLogoMark className="h-4 w-4" />
              </div>
              <span className="font-semibold">Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {profile?.full_name ?? "Admin"}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-30 mt-14 w-64 border-r border-border bg-card transition-transform duration-200 ease-out md:translate-x-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <nav className="flex flex-col gap-1 p-3">
            {adminNav.map(({ to, end, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Overlay when sidebar open on mobile */}
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          />
        )}

        <main className="min-h-[calc(100vh-3.5rem)] flex-1 p-4 md:ml-64 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
