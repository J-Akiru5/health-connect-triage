import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
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
  Settings,
  BarChart3,
  Search,
  ChevronRight,
  House,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  UserCog
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLogoMark } from "@/components/AppLogoMark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const adminNav = [
  { to: "/admin", end: true, icon: LayoutDashboard, label: "Overview Dashboard" },
  { to: "/admin/users", icon: Users, label: "User Management" },
  { to: "/admin/ai-triage", icon: Cpu, label: "AI Triage Engine" },
  { to: "/admin/teleconsult-referrals", icon: Video, label: "Teleconsultations" },
  { to: "/admin/notifications", icon: Bell, label: "System Alerts" },
  { to: "/admin/audit-logs", icon: FileText, label: "Audit Trails" },
  { to: "/admin/reports", icon: BarChart3, label: "Analytics & Reports" },
  { to: "/admin/settings", icon: Settings, label: "Platform Settings" },
];

type AdminLayoutProps = { children: React.ReactNode };

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("admin.sidebar.collapsed") === "1";
  });
  const [sidebarAvatarUrl, setSidebarAvatarUrl] = useState<string>("");
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeNav =
    adminNav.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    ) ?? adminNav[0];

  const activeSectionLabel = location.pathname.startsWith("/admin/account")
    ? "My Account"
    : activeNav.label;

  // Close sidebar on route change for mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("admin.sidebar.collapsed", sidebarCollapsed ? "1" : "0");
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    setSidebarAvatarUrl(profile?.avatar_url ?? "");
  }, [profile?.avatar_url]);

  useEffect(() => {
    const handleAvatarUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ avatarUrl?: string }>;
      const next = customEvent.detail?.avatarUrl;
      if (next) setSidebarAvatarUrl(next);
    };

    window.addEventListener("admin-profile-avatar-updated", handleAvatarUpdate as EventListener);
    return () => {
      window.removeEventListener("admin-profile-avatar-updated", handleAvatarUpdate as EventListener);
    };
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans antialiased text-foreground">
      
      {/* Mobile Sidebar Back-Drop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`group/sidebar fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col bg-card border-r border-border shadow-[2px_0_8px_-4px_rgba(0,0,0,0.05)] transform transition-[transform,width] duration-300 ease-out lg:translate-x-0 lg:static lg:shrink-0 ${sidebarCollapsed ? "lg:w-[88px]" : "lg:w-[260px]"} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`flex items-center h-[72px] border-b border-border/70 ${sidebarCollapsed ? "px-3 justify-center" : "px-6"}`}>
          <div className={`flex items-center w-full ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
            <div className="relative group/logo shrink-0">
              <Link to="/admin" className="block transition-opacity hover:opacity-90" title="Go to admin dashboard">
                <div className={`flex items-center justify-center transition-all ${sidebarCollapsed ? "h-8 w-8 rounded-lg border border-border bg-card" : "h-10 w-10 rounded-xl bg-gradient-to-br from-[#800000] to-[#5C0000] shadow-sm shadow-[#800000]/20"}`}>
                  <AppLogoMark className={`h-5 w-5 ${sidebarCollapsed ? "text-[#800000]" : "text-white"}`} />
                </div>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden lg:inline-flex absolute inset-0 h-full w-full rounded-xl bg-background/90 text-muted-foreground opacity-0 transition-all group-hover/logo:opacity-100 hover:bg-card hover:text-[#800000]"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
            </div>
            <Link to="/admin" className={`flex flex-col overflow-hidden transition-all ${sidebarCollapsed ? "hidden" : ""}`}>
              <span className="font-semibold text-[15px] tracking-tight text-foreground truncate">TeleHealth</span>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest leading-none">Admin Console</span>
            </Link>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto py-6 scrollbar-hide ${sidebarCollapsed ? "px-2" : "px-4"}`}>
          <div className={`mb-4 px-2 ${sidebarCollapsed ? "hidden" : ""}`}>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Main Menu</p>
          </div>
          <nav className="flex flex-col gap-1.5">
            {adminNav.map(({ to, end, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={label}
                className={({ isActive }) =>
                  `group flex items-center rounded-lg py-2.5 text-[14px] font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${sidebarCollapsed ? "justify-center px-2" : "gap-3 px-3"} ${
                    isActive
                      ? "bg-red-50 text-[#800000] dark:bg-[#800000]/20 dark:text-red-100"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon strokeWidth={isActive ? 2.5 : 2} className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? "text-[#800000] dark:text-red-100" : "text-muted-foreground/80 group-hover:text-foreground"}`} />
                    <span className={`flex-1 truncate ${sidebarCollapsed ? "hidden" : ""}`}>{label}</span>
                    {isActive && !sidebarCollapsed && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#800000] ml-auto" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className={`border-t border-border/70 bg-muted/30 ${sidebarCollapsed ? "p-2" : "p-4"}`}>
          <Link
            to="/"
            className={`mb-3 flex items-center rounded-lg border border-border bg-card text-[12px] font-semibold text-muted-foreground transition-colors hover:border-[#800000]/20 hover:text-[#800000] ${sidebarCollapsed ? "justify-center px-2 py-2" : "gap-2 px-3 py-2"}`}
            title="View public site"
          >
            <House className="h-3.5 w-3.5" />
            <span className={sidebarCollapsed ? "hidden" : ""}>View public site</span>
            <ExternalLink className={`h-3.5 w-3.5 opacity-70 ${sidebarCollapsed ? "hidden" : "ml-auto"}`} />
          </Link>
          <Link
            to="/admin/account"
            className={`mb-3 flex items-center rounded-lg border border-border bg-card text-[12px] font-semibold text-muted-foreground transition-colors hover:border-[#800000]/20 hover:text-[#800000] ${sidebarCollapsed ? "justify-center px-2 py-2" : "gap-2 px-3 py-2"}`}
            title="My account settings"
          >
            <UserCog className="h-3.5 w-3.5" />
            <span className={sidebarCollapsed ? "hidden" : ""}>My account</span>
          </Link>
          <div className={`flex items-center rounded-xl bg-card border border-border shadow-sm ${sidebarCollapsed ? "justify-center p-2" : "gap-3 p-2.5"}`}>
            <Avatar className="h-9 w-9 border border-border/70">
              <AvatarImage src={sidebarAvatarUrl || ""} className="object-cover" />
              <AvatarFallback className="bg-[#800000]/10 text-[#800000] text-xs font-semibold">
                {profile?.full_name?.charAt(0) || "A"}
              </AvatarFallback>
            </Avatar>
            <div className={`flex-col flex-1 overflow-hidden ${sidebarCollapsed ? "hidden" : "flex"}`}>
              <span className="text-[13px] font-semibold text-foreground truncate">{profile?.full_name || "System Admin"}</span>
              <span className="text-[11px] text-muted-foreground truncate">{profile?.role || "Administrator"}</span>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
              title="Log out"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent">
        
        {/* Top Header */}
        <header className="h-[72px] shrink-0 flex items-center justify-between px-6 lg:px-8 border-b border-border bg-background/80 backdrop-blur-md z-30">       
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Minimalist Breadcrumb / Context */}
            <div className="hidden sm:flex items-center text-[13px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <LayoutDashboard className="h-4 w-4" />
                Workspace
              </span>
              <ChevronRight className="h-3.5 w-3.5 mx-2 text-muted-foreground/60" />      
              <span className="text-foreground">{activeSectionLabel}</span>      
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="h-9 w-64 rounded-full border border-border bg-muted/40 pl-9 pr-4 text-[13px] text-foreground outline-none transition-all focus:border-[#800000]/30 focus:bg-card focus:ring-2 focus:ring-[#800000]/10 placeholder:text-muted-foreground"
              />
            </div>
            <Button asChild variant="outline" className="hidden sm:inline-flex h-9 gap-2 border-border text-muted-foreground hover:text-[#800000] hover:border-[#800000]/30">
              <Link to="/">
                <House className="h-4 w-4" />
                View Site
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon" className="sm:hidden h-9 w-9 border-border text-muted-foreground hover:text-[#800000] hover:border-[#800000]/30">
              <Link to="/" aria-label="View public site">
                <House className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto relative p-6 lg:p-8 2xl:p-10 scrollbar-thin">
          <div className="mx-auto w-full max-w-[1920px] h-full flex flex-col">
            {children}
          </div>
        </main>
        
      </div>
    </div>
  );
}

