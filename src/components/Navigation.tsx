import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, User, X, Shield, ChevronDown, Bell, CheckCheck } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { AppLogoMark } from "@/components/AppLogoMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { handleMissingNotificationsTable } from "@/lib/notifications";
import { format } from "date-fns";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { session, profile, signOut, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotifs, setLatestNotifs] = useState<any[]>([]);

  // Fetch notifications
  useEffect(() => {
    if (!session?.user?.id) return;
    let notificationsUnavailable = false;

    const fetchNotifs = async () => {
      if (notificationsUnavailable) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        if (handleMissingNotificationsTable(error)) {
          notificationsUnavailable = true;
          setLatestNotifs([]);
          setUnreadCount(0);
        }
        return;
      }

      if (data) {
        setLatestNotifs(data);
        setUnreadCount(data.filter((n) => !n.read_at).length); // local count of recent
      }
    };
    fetchNotifs();
    // Simplified polling instead of realtime for now
    const intv = setInterval(fetchNotifs, 30000);
    return () => clearInterval(intv);
  }, [session?.user?.id]);

  // Scroll progress bar
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  function scrollToSection(id: string) {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
    setIsOpen(false);
  }

  const isHome = location.pathname === "/";
  const canAccessProfileEdit = profile?.role === "patient" || profile?.role === "clinician";

  return (
    <>
      {/* Scroll progress bar */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-[2px] scroll-progress z-[60] origin-left"
      />

      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "glass-nav shadow-lg py-2"
            : "bg-transparent py-3"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to={session ? "/dashboard" : "/"} className="flex items-center gap-2.5 group relative z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md"
              >
                <AppLogoMark className="w-[18px] h-[18px] text-primary-foreground" />
              </motion.div>
              <div className="flex flex-col min-w-0">
                <span className="text-lg font-bold text-foreground leading-tight tracking-tight">TeleHealth</span>
                <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-widest leading-tight">Barangay Abangay</span>
              </div>
            </Link>

            {/* Desktop Center Navigation */}
            <div className="hidden lg:flex items-center gap-0.5 bg-muted/40 backdrop-blur-sm rounded-full px-1.5 py-1 border border-border/30">
              <NavPill to="/" label={t("nav.home")} active={isHome && !location.hash} />
              
              {/* Marketing Links (Only on Home) */}
              {isHome && (
                <>
                  <NavPillScroll label={t("nav.about")} onClick={() => scrollToSection("about")} />
                  <NavPillScroll label={t("nav.faq")} onClick={() => scrollToSection("faq")} />
                </>
              )}

              {/* App Links (Always if logged in) */}
              {session && (
                <>
                  <NavPill to="/dashboard" label={t("nav.dashboard")} active={location.pathname === "/dashboard"} />
                  <NavPill to="/consultations" label={t("nav.consultations")} active={location.pathname === "/consultations"} />
                </>
              )}
            </div>

            {/* Desktop Right Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <LanguageSwitcher variant="compact" />
              <ThemeToggle />

              {isLoading ? (
                <div className="flex items-center gap-2 ml-1">
                  <Skeleton className="w-9 h-9 rounded-full" />
                </div>
              ) : session ? (
                <div className="flex items-center gap-1">
                  {/* Notification Bell Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative rounded-xl text-muted-foreground hover:text-foreground">
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive border-2 border-background rounded-full" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2 bg-background/95 backdrop-blur-xl border-border/40 shadow-xl mt-2">
                      <div className="flex items-center justify-between px-3 py-2 mb-1">
                        <span className="font-bold text-sm">Notifications</span>
                        <Link to="/notifications" className="text-xs text-primary hover:underline" onClick={() => setIsOpen(false)}>
                          View all
                        </Link>
                      </div>
                      <DropdownMenuSeparator className="bg-border/40 mb-2" />
                      {latestNotifs.length === 0 ? (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                          No recent notifications
                        </div>
                      ) : (
                        latestNotifs.map((n) => (
                          <div key={n.id} className="px-3 py-2.5 mb-1 rounded-xl hover:bg-muted/50 transition-colors flex gap-3">
                            <div className="mt-0.5 shrink-0">
                              {!n.read_at ? (
                                <span className="w-2 h-2 rounded-full bg-primary block" />
                              ) : (
                                <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm tracking-tight truncate ${!n.read_at ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>{n.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(n.created_at), "MMM d, h:mm a")}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Avatar Dropdown */}
                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="group relative ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative"
                      >
                      <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-full bg-muted/30 border border-border/20 group-hover:border-primary/20 transition-colors">
                        <div className="relative">
                          <Avatar className="w-10 h-10 p-1 border-primary/20 shadow-md overflow-visible">
                            <AvatarImage src={profile?.avatar_url || session.user.user_metadata?.avatar_url} className="object-cover rounded-full" />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs uppercase">
                              {profile?.full_name?.substring(0, 2) || session.user.email?.substring(0, 2) || "U"}
                            </AvatarFallback>
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full pulse-ring shadow-sm z-10" />
                          </Avatar>
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors pr-0.5" />
                      </div>
                      </motion.div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 bg-background/95 backdrop-blur-xl border-border/40 shadow-xl mt-2">
                    <div className="px-3 py-3 mb-2 rounded-xl bg-muted/30">
                      <p className="text-sm font-bold text-foreground truncate">{profile?.full_name || session.user.email?.split("@")[0] || "Authorized User"}</p>
                      <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest mt-0.5 font-medium">{profile?.role || "Patient Account"}</p>
                    </div>
                    {profile?.role === "admin" && (
                      <DropdownMenuItem asChild className="rounded-lg h-10 gap-3 cursor-pointer">
                        <Link to="/admin" className="w-full flex items-center gap-3">
                          <Shield className="w-4 h-4 text-current opacity-80" />
                          <span className="font-medium text-sm">{t("nav.admin")}</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild className="rounded-lg h-10 gap-3 cursor-pointer">
                      <Link to="/dashboard" className="w-full flex items-center gap-3">
                        <User className="w-4 h-4 text-current opacity-80" />
                        <span className="font-medium text-sm">{t("nav.dashboard")}</span>
                      </Link>
                    </DropdownMenuItem>
                    {canAccessProfileEdit && (
                      <DropdownMenuItem asChild className="rounded-lg h-10 gap-3 cursor-pointer">
                        <Link to="/profile" className="w-full flex items-center gap-3">
                          <Menu className="w-4 h-4 text-current opacity-80" />
                          <span className="font-medium text-sm">{t("nav.profile")}</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <div className="h-px bg-border/40 my-2" />
                    <DropdownMenuItem onClick={handleSignOut} className="rounded-lg h-10 gap-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                      <LogOut className="w-4 h-4" />
                      <span className="font-medium text-sm">{t("nav.signOut")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center gap-2 ml-1">
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="rounded-full text-sm font-medium hover:bg-muted/60 px-4">
                      {t("nav.login")}
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button size="sm" className="rounded-full text-sm font-semibold shadow-md hover:shadow-lg px-5 bg-primary text-primary-foreground">
                        {t("nav.register")}
                      </Button>
                    </motion.div>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile actions */}
            <div className="flex lg:hidden items-center gap-1.5">
              {session && (
                <Button variant="ghost" size="icon" asChild className="relative rounded-xl text-foreground hover:bg-muted/60">
                  <Link to="/notifications" aria-label="Open notifications">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-destructive border-2 border-background rounded-full" />
                    )}
                  </Link>
                </Button>
              )}
              <ThemeToggle />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`relative z-[70] p-2 rounded-xl text-foreground border border-border/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  scrolled
                    ? "bg-card/80 hover:bg-muted/70"
                    : "bg-background/80 backdrop-blur-sm hover:bg-background"
                }`}
                aria-label="Toggle menu"
              >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Full-Screen Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-background/98 backdrop-blur-2xl lg:hidden"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col pt-24 px-6 pb-8 h-full overflow-y-auto"
            >
              <div className="flex flex-col gap-1 mb-8">
                {/* Home link always visible in mobile */}
                <motion.button
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => { navigate("/"); setIsOpen(false); }}
                  className="text-left px-4 py-4 rounded-2xl text-2xl font-semibold text-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {t("nav.home")}
                </motion.button>

                {/* About/FAQ only if on Home */}
                {isHome && (
                  <>
                    <motion.button
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => scrollToSection("about")}
                      className="text-left px-4 py-4 rounded-2xl text-2xl font-semibold text-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {t("nav.about")}
                    </motion.button>
                    <motion.button
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => scrollToSection("faq")}
                      className="text-left px-4 py-4 rounded-2xl text-2xl font-semibold text-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {t("nav.faq")}
                    </motion.button>
                  </>
                )}

                {/* Dashboard/Consultations if session exists */}
                {session && (
                  <>
                    <motion.button
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => { navigate("/dashboard"); setIsOpen(false); }}
                      className="text-left px-4 py-4 rounded-2xl text-2xl font-semibold text-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {t("nav.dashboard")}
                    </motion.button>
                    <motion.button
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.34, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => { navigate("/consultations"); setIsOpen(false); }}
                      className="text-left px-4 py-4 rounded-2xl text-2xl font-semibold text-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {t("nav.consultations")}
                    </motion.button>
                  </>
                )}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-auto space-y-3"
              >
                <div className="px-4 pb-4">
                  <LanguageSwitcher variant="full" />
                </div>

                {session && profile ? (
                  <div className="space-y-2">
                    {profile.role === "admin" && (
                      <Button variant="outline" className="w-full justify-start gap-2 rounded-xl h-12" asChild>
                        <Link to="/admin"><Shield className="w-4 h-4" /> {t("nav.admin")}</Link>
                      </Button>
                    )}
                    {canAccessProfileEdit && (
                      <Button variant="outline" className="w-full justify-start rounded-xl h-12" asChild>
                        <Link to="/profile">{t("nav.profile")}</Link>
                      </Button>
                    )}
                    <Button variant="outline" className="w-full justify-start rounded-xl h-12 text-destructive" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      {t("nav.signOut")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 px-1">
                    <Button className="w-full rounded-xl h-13 text-base font-semibold shadow-lg" asChild>
                      <Link to="/signup">{t("nav.register")}</Link>
                    </Button>
                    <Button variant="outline" className="w-full rounded-xl h-13 text-base" asChild>
                      <Link to="/login">{t("nav.login")}</Link>
                    </Button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Pill Nav Items ── */
function NavPill({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`relative px-4 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {active && (
        <motion.div
          layoutId="nav-pill"
          className="absolute inset-0 bg-primary rounded-full -z-10 shadow-md"
          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
        />
      )}
      {label}
    </Link>
  );
}

function NavPillScroll({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative px-4 py-1.5 text-sm font-medium rounded-full text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {label}
    </button>
  );
}
