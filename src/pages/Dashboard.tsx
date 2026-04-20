import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { handleMissingNotificationsTable } from "@/lib/notifications";
import {
  Stethoscope,
  ClipboardList,
  ArrowRightLeft,
  FileText,
  Bell,
  UserCog,
  LogOut,
  Loader2,
  ArrowRight,
  AlertTriangle,
  Users,
  UserPlus,
  Calendar,
  Clock,
  Activity,
  Heart,
  MapPin,
  TrendingUp,
  CheckCircle2,
  Phone,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { MetricCardsSkeleton, TableRowsSkeleton } from "@/components/ui/loading-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

type ClinicianConsultRow = {
  id: string;
  patient_name: string;
  triage_level: string | null;
  created_at: string;
};

type TriageBadgeProps = { level: string | null };

function TriageBadge({ level }: TriageBadgeProps) {
  if (!level) return <Badge variant="secondary">N/A</Badge>;
  const map: Record<string, { label: string; className: string }> = {
    emergency: { label: "Emergency", className: "bg-red-500 text-white border-0" },
    urgent: { label: "Urgent", className: "bg-amber-500 text-white border-0" },
    non_urgent: { label: "Non-Urgent", className: "bg-primary text-primary-foreground border-0" },
    home_care: { label: "Home Care", className: "bg-green-500 text-white border-0" },
  };
  const cfg = map[level] ?? { label: level, className: "" };
  return <Badge className={`text-xs font-bold ${cfg.className}`}>{cfg.label}</Badge>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "primary",
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sub?: string;
  color?: "primary" | "destructive" | "amber" | "green" | "violet";
  to?: string;
}) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    amber: "bg-amber-500/10 text-amber-600",
    green: "bg-green-500/10 text-green-600",
    violet: "bg-violet-500/10 text-violet-600",
  };

  const card = (
    <Card className="border-border/60 hover:border-primary/30 hover:shadow-lg transition-all duration-300 h-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 rounded-xl ${colorMap[color]} flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
          {to && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div className="text-3xl font-bold text-foreground font-display mb-1">{value}</div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );

  if (to) return <Link to={to} className="block h-full">{card}</Link>;
  return card;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();

  /* ── Patient state ── */
  const [patientProfile, setPatientProfile] = useState<{
    first_name: string | null;
    last_name: string | null;
    barangay_name?: string | null;
    avatar_url?: string | null;
  } | null>(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [latestTriage, setLatestTriage] = useState<{ triage_level: string | null; created_at: string } | null>(null);
  const [patientReferralCount, setPatientReferralCount] = useState(0);
  const [patientUnread, setPatientUnread] = useState(0);

  /* ── Clinician state ── */
  const [clinicianConsults, setClinicianConsults] = useState<ClinicianConsultRow[]>([]);
  const [clinicianLoading, setClinicianLoading] = useState(true);
  const [clinicianBarangay, setClinicianBarangay] = useState<string | null>(null);
  const [clinicianReferrals, setClinicianReferrals] = useState(0);
  const [clinicianHighRiskCount, setClinicianHighRiskCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  /* ── BHW state ── */
  const [bhwPatients, setBhwPatients] = useState<{ user_id: string; full_name: string | null; first_name: string | null; last_name: string | null }[]>([]);
  const [bhwBarangayName, setBhwBarangayName] = useState<string | null>(null);
  const [bhwLoading, setBhwLoading] = useState(true);
  const [bhwHighRiskCount, setBhwHighRiskCount] = useState(0);
  const [bhwPatientsSeenToday, setBhwPatientsSeenToday] = useState(0);

  const isClinician = profile?.role === "clinician";
  const isPatient = profile?.role === "patient";
  const isBhw = profile?.role === "bhw";
  const isAdmin = profile?.role === "admin";

  /* ── Patient data fetch ── */
  useEffect(() => {
    if (authLoading || !user?.id || !isPatient) { setPatientLoading(false); return; }
    (async () => {
      const [ppRes, profileRes] = await Promise.all([
        supabase.from("patient_profiles").select("first_name, last_name, barangay_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("avatar_url").eq("id", user.id).single(),
      ]);
      if (ppRes.data) {
        setPatientProfile({ ...ppRes.data, avatar_url: (profileRes.data as any)?.avatar_url ?? null });
      }

      const { data: assessments } = await supabase
        .from("symptom_assessments").select("id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
      if (assessments?.[0]) {
        const { data: tr } = await supabase
          .from("ai_triage_results").select("triage_level, created_at").eq("assessment_id", assessments[0].id).maybeSingle();
        if (tr) setLatestTriage(tr as { triage_level: string | null; created_at: string });
      }

      const [{ count: unreadCount, error }, { count: referralsCount }] = await Promise.all([
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("patient_id", user.id).in("status", ["pending", "confirmed"]),
      ]);
      if (error && handleMissingNotificationsTable(error)) {
        setPatientUnread(0);
      } else {
        setPatientUnread(unreadCount ?? 0);
      }
      setPatientReferralCount(referralsCount ?? 0);
      setPatientLoading(false);
    })();
  }, [user?.id, isPatient, authLoading]);

  /* ── Clinician data fetch ── */
  useEffect(() => {
    if (authLoading || !user?.id || !isClinician) { setClinicianLoading(false); return; }
    (async () => {
      setClinicianConsults([]);
      const [{ count: unread, error: nError }, { count: referrals }, { count: highRisk }, { data: pData }] = await Promise.all([
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("ai_triage_results").select("id", { count: "exact", head: true }).in("triage_level", ["emergency", "urgent"]),
        supabase.from("profiles").select("assigned_barangay_name").eq("id", user.id).single(),
      ]);

      if (nError && handleMissingNotificationsTable(nError)) {
        setUnreadNotifications(0);
      } else {
        setUnreadNotifications(unread ?? 0);
      }
      
      setClinicianReferrals(referrals ?? 0);
      setClinicianHighRiskCount(highRisk ?? 0);
      setClinicianBarangay((pData as any)?.assigned_barangay_name ?? null);
      setClinicianLoading(false);
    })();
  }, [user?.id, isClinician, authLoading]);

  /* ── BHW data fetch ── */
  useEffect(() => {
    if (authLoading || !user?.id || !isBhw) { setBhwLoading(false); return; }
    (async () => {
      const { data: pData } = await supabase.from("profiles").select("assigned_barangay_name").eq("id", user.id).single();
      const assignedBarangay = (pData as any)?.assigned_barangay_name ?? null;
      setBhwBarangayName(assignedBarangay);

      let query = supabase.from("patient_profiles").select("user_id, first_name, last_name").limit(500);
      if (assignedBarangay) {
        query = query.eq("barangay_name", assignedBarangay);
      }
      
      const { data: ppList } = await query;
      if (ppList?.length) {
        const userIds = ppList.map((r: any) => r.user_id);
        const { data: profData } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        const nameMap = new Map((profData ?? []).map((x: any) => [x.id, x.full_name]));
        setBhwPatients(ppList.map((r: any) => ({
          user_id: r.user_id,
          full_name: nameMap.get(r.user_id) ?? ([r.first_name, r.last_name].filter(Boolean).join(" ") || "Patient"),
          first_name: r.first_name, last_name: r.last_name,
        })));

        const { data: assessments } = await supabase.from("symptom_assessments").select("id").in("user_id", userIds);
        const assessmentIds = (assessments ?? []).map((a: any) => a.id);
        if (assessmentIds.length > 0) {
          const { count } = await supabase.from("ai_triage_results").select("id", { count: "exact", head: true }).in("assessment_id", assessmentIds).in("triage_level", ["emergency", "urgent"]);
          setBhwHighRiskCount(count ?? 0);
        }

        // Count intakes created today
        const todayStr = new Date().toISOString().split('T')[0];
        const nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + 1);
        const tomorrowStr = nextDay.toISOString().split('T')[0];
        const { data: todayIntakes } = await supabase
          .from("symptom_assessments")
          .select("id")
          .in("user_id", userIds)
          .gte("created_at", todayStr)
          .lt("created_at", tomorrowStr);
        setBhwPatientsSeenToday((todayIntakes ?? []).length);
      }
      const { count: unread, error: nError } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
      if (nError && handleMissingNotificationsTable(nError)) {
        setUnreadNotifications(0);
      } else {
        setUnreadNotifications(unread ?? 0);
      }
      setBhwLoading(false);
    })();
  }, [user?.id, isBhw, authLoading]);

  async function handleLogout() { await signOut(); navigate("/", { replace: true }); }

  const now = new Date();
  const todayDisplay = format(now, "EEEE, MMMM d, yyyy");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-20 max-w-7xl">
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <MetricCardsSkeleton />
            <TableRowsSkeleton rows={6} columns={3} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || (!isPatient && !isClinician && !isBhw && !isAdmin)) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-12 text-center">
          <p className="text-muted-foreground">Please log in with an appropriate account.</p>
          <Button asChild className="mt-4"><Link to="/login">Log In</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  /* ════════════════════════════════════════
     CLINICIAN DASHBOARD
  ════════════════════════════════════════ */
  if (isClinician) {
    const highRisk = clinicianHighRiskCount;
    const welcomeName = profile?.full_name?.trim()
      ? (profile.full_name.startsWith("Dr.") ? profile.full_name : `Dr. ${profile.full_name}`)
      : "Clinician";

    const quickActions = [
      { to: "/triage-monitor", icon: ClipboardList, label: "Triage Monitor" },
      { to: "/referrals", icon: ArrowRightLeft, label: "Referrals" },
      { to: "/patient-history", icon: FileText, label: "Patient History" },
      { to: "/notifications", icon: Bell, label: "Notifications", badge: unreadNotifications },
      { to: "/profile", icon: UserCog, label: "My Profile" },
    ];

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-20 max-w-7xl">

          {/* Welcome Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl gradient-hero text-primary-foreground p-6 sm:p-8 mb-8 shadow-lg relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08)_0%,transparent_50%)]" />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest mb-1">Clinical Dashboard</p>
                <h1 className="text-2xl sm:text-3xl font-bold font-display">{welcomeName}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {clinicianBarangay && (
                    <span className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                      <MapPin className="w-3.5 h-3.5" /> {clinicianBarangay}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                    <Calendar className="w-3.5 h-3.5" /> {todayDisplay}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 rounded-xl gap-2 shrink-0" onClick={handleLogout}>
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </div>
          </motion.div>

          {clinicianLoading ? (
            <div className="space-y-6">
              <MetricCardsSkeleton />
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8">
                  <TableRowsSkeleton rows={6} columns={4} />
                </div>
                <div className="col-span-12 lg:col-span-4">
                  <TableRowsSkeleton rows={6} columns={2} />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6">

              {/* Stat Cards Row */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="col-span-12 sm:col-span-6 lg:col-span-3">
                <StatCard icon={ArrowRightLeft} label="Pending Referrals" value={clinicianReferrals} sub="Awaiting review" color="amber" to="/referrals" />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="col-span-12 sm:col-span-6 lg:col-span-3">
                <StatCard icon={AlertTriangle} label="High-Risk Patients" value={highRisk} sub="Emergency or urgent triage" color={highRisk > 0 ? "destructive" : "green"} to="/triage-monitor" />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="col-span-12 sm:col-span-6 lg:col-span-3">
                <StatCard icon={Bell} label="Unread Notifications" value={unreadNotifications} sub="Action required" color="violet" to="/notifications" />
              </motion.div>

              {/* Monitoring Summary */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="col-span-12 lg:col-span-8">
                < Card className="border-border/60 h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="w-5 h-5 text-primary" /> Priority Monitoring</CardTitle>
                        <CardDescription>Track high-risk triage outcomes and referral follow-up.</CardDescription>
                      </div>
                      <Button asChild size="sm" className="rounded-xl gap-2"><Link to="/triage-monitor">Open Triage Monitor <ArrowRight className="w-3.5 h-3.5" /></Link></Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/60 p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">High-risk triage</p>
                        <p className="mt-2 text-2xl font-bold text-foreground">{highRisk}</p>
                        <p className="text-xs text-muted-foreground mt-1">Requires prompt review and escalation planning.</p>
                      </div>
                      <div className="rounded-xl border border-border/60 p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending referrals</p>
                        <p className="mt-2 text-2xl font-bold text-foreground">{clinicianReferrals}</p>
                        <p className="text-xs text-muted-foreground mt-1">Coordinate with BHW and receiving facilities.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="col-span-12 lg:col-span-4">
                <Card className="border-border/60 h-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Quick Actions</CardTitle>
                    <CardDescription>Frequently used features</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {quickActions.map(({ to, icon: Icon, label, badge }) => (
                      <Link key={to} to={to}>
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-muted/30 transition-all group cursor-pointer">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-foreground flex-1">{label}</span>
                          {badge != null && badge > 0 && <Badge variant="destructive" className="text-[10px]">{badge}</Badge>}
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>

            </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  /* ════════════════════════════════════════
     BHW DASHBOARD
  ════════════════════════════════════════ */
  if (isBhw) {
    const bhwActions = [
      { to: "/bhw/register-patient", icon: UserPlus, label: t("dashboard.registerPatient") },
      { to: "/bhw/assist-intake", icon: Stethoscope, label: t("dashboard.assistedSymptom") },
      { to: "/triage-monitor", icon: ClipboardList, label: t("dashboard.monitorTriage") },
      { to: "/bhw/activities", icon: Users, label: t("dashboard.patientFollowUp") },
      { to: "/notifications", icon: Bell, label: t("dashboard.notifications"), badge: unreadNotifications },
    ];

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-20 max-w-7xl">

          {/* Welcome Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl gradient-hero text-primary-foreground p-6 sm:p-8 mb-8 shadow-lg relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08)_0%,transparent_50%)]" />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest mb-1">BHW Dashboard</p>
                <h1 className="text-2xl sm:text-3xl font-bold font-display">{profile?.full_name ?? "Health Worker"}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {bhwBarangayName && (
                    <span className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                      <MapPin className="w-3.5 h-3.5" /> {bhwBarangayName}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                    <Calendar className="w-3.5 h-3.5" /> {todayDisplay}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 rounded-xl gap-2 shrink-0" onClick={handleLogout}>
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </div>
          </motion.div>

          {/* High-risk alert banner */}
          {bhwHighRiskCount > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{bhwHighRiskCount} High-Risk {bhwHighRiskCount === 1 ? "Case" : "Cases"} Detected</p>
                  <p className="text-sm text-muted-foreground">Emergency or urgent triage — needs prioritization</p>
                </div>
              </div>
              <Button asChild size="sm" className="gap-2 bg-destructive hover:bg-destructive/90 rounded-xl">
                <Link to="/triage-monitor"><ClipboardList className="w-4 h-4" /> View Monitor</Link>
              </Button>
            </motion.div>
          )}

          {bhwLoading ? (
            <div className="space-y-6">
              <MetricCardsSkeleton />
              <TableRowsSkeleton rows={8} columns={3} />
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6">

              {/* Stat Cards */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="col-span-12 sm:col-span-6 lg:col-span-3">
                <StatCard icon={Users} label="Registered Patients" value={bhwPatients.length} sub="In your area" color="primary" />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="col-span-12 sm:col-span-6 lg:col-span-3">
                <StatCard icon={AlertTriangle} label="High-Risk Cases" value={bhwHighRiskCount} sub="Emergency or urgent" color={bhwHighRiskCount > 0 ? "destructive" : "green"} to="/triage-monitor" />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="col-span-12 sm:col-span-6 lg:col-span-3">
                <StatCard icon={Bell} label="Notifications" value={unreadNotifications} sub="Unread messages" color="amber" to="/notifications" />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="col-span-12 sm:col-span-6 lg:col-span-3">
                <StatCard icon={Activity} label="Intakes Today" value={bhwPatientsSeenToday} sub="Assisted assessments" color="green" />
              </motion.div>

              {/* Emergency Quick Report */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="col-span-12">
                <Link to="/bhw/assist-intake">
                  <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all p-5 flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Stethoscope className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">Assisted Symptom Intake</p>
                        <p className="text-sm text-muted-foreground">Help a patient report symptoms and get triage guidance</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                </Link>
              </motion.div>

              {/* Patient List */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="col-span-12 lg:col-span-8">
                <Card className="border-border/60 h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Patient List</CardTitle>
                        <CardDescription>Assigned community patients — click to assist intake</CardDescription>
                      </div>
                      <Button asChild size="sm" variant="outline" className="rounded-xl gap-2"><Link to="/bhw/register-patient"><UserPlus className="w-3.5 h-3.5" /> Register</Link></Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {bhwPatients.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                          <Users className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <p className="font-semibold text-foreground mb-1">No Patients Yet</p>
                        <p className="text-sm text-muted-foreground mb-4">Start by registering a patient in your barangay.</p>
                        <Button asChild size="sm" className="rounded-xl gap-2"><Link to="/bhw/register-patient"><UserPlus className="w-4 h-4" /> Register First Patient</Link></Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {bhwPatients.slice(0, 10).map((p) => (
                          <Link key={p.user_id} to={`/bhw/assist-intake?patient=${p.user_id}`}>
                            <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-muted/30 transition-all group">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-xs uppercase">
                                {p.full_name?.substring(0, 2) ?? "P"}
                              </div>
                              <span className="text-sm font-medium text-foreground flex-1 truncate">{p.full_name ?? "Patient"}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                          </Link>
                        ))}
                        {bhwPatients.length > 10 && (
                          <p className="text-xs text-muted-foreground text-center pt-2">+{bhwPatients.length - 10} more patients</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="col-span-12 lg:col-span-4">
                <Card className="border-border/60 h-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {bhwActions.map(({ to, icon: Icon, label, badge }) => (
                      <Link key={to} to={to}>
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-muted/30 transition-all group cursor-pointer">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-foreground flex-1">{label}</span>
                          {badge != null && badge > 0 && <Badge variant="destructive" className="text-[10px]">{badge}</Badge>}
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Link>
                    ))}
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-destructive/30 hover:bg-destructive/5 transition-all cursor-pointer group" onClick={handleLogout}>
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <LogOut className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-destructive flex-1 transition-colors">Sign Out</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

            </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  /* ════════════════════════════════════════
     PATIENT DASHBOARD
  ════════════════════════════════════════ */
  const firstName = patientProfile?.first_name || profile?.full_name?.split(" ")[0] || "Patient";
  const lastName = patientProfile?.last_name || profile?.full_name?.split(" ").slice(1).join(" ") || "";
  const welcomeName = [firstName, lastName].filter(Boolean).join(" ");
  const barangayName = patientProfile?.barangay_name ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-20 max-w-7xl">

        {patientLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-8">
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
              <div className="col-span-12 lg:col-span-4">
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
            </div>
            <MetricCardsSkeleton count={6} />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">

            {/* Welcome Banner */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="col-span-12">
              <div className="rounded-2xl gradient-hero text-primary-foreground p-6 sm:p-8 shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08)_0%,transparent_50%)]" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14 border-2 border-white/30 shadow-lg">
                      <AvatarImage src={(patientProfile as any)?.avatar_url ?? ""} className="object-cover" />
                      <AvatarFallback className="bg-white/20 text-white font-bold text-lg">
                        {welcomeName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest">Patient Dashboard</p>
                      <h1 className="text-2xl sm:text-3xl font-bold font-display">Hello, {firstName}!</h1>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        {barangayName && (
                          <span className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                            <MapPin className="w-3.5 h-3.5" /> {barangayName}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                          <Clock className="w-3.5 h-3.5" /> {todayDisplay}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 rounded-xl gap-2 shrink-0" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" /> Sign Out
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Hero CTA: Symptom Checker */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="col-span-12 lg:col-span-8">
              <Link to="/symptom-checker">
                <div className="relative overflow-hidden rounded-2xl bg-primary shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group h-full min-h-[180px]">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15)_0%,transparent_50%)]" />
                  <div className="relative p-8 flex items-center justify-between z-10 h-full">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4 backdrop-blur-md shadow-inner group-hover:scale-110 transition-transform duration-300">
                        <Stethoscope className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="text-2xl font-display font-bold text-white mb-2">Report Symptoms</h2>
                      <p className="text-primary-foreground/80 text-sm max-w-sm">
                        Feeling unwell? Check your symptoms and get triage guidance instantly.
                      </p>
                    </div>
                    <ArrowRight className="w-10 h-10 text-white/40 group-hover:text-white group-hover:translate-x-2 transition-all duration-300 hidden sm:block" />
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Quick Profile Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="col-span-12 lg:col-span-4">
              <Card className="border-border/60 h-full">
                <CardContent className="p-6 flex flex-col items-center text-center h-full justify-center">
                  <Avatar className="w-16 h-16 mb-4 border-2 border-primary/20">
                    <AvatarImage src={(patientProfile as any)?.avatar_url ?? ""} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                      {welcomeName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-bold text-foreground text-lg leading-tight">{welcomeName || "Patient"}</p>
                  <p className="text-sm text-muted-foreground mb-1">{user?.email}</p>
                  {barangayName && <p className="text-xs text-primary font-medium mb-4">{barangayName}</p>}
                  <Link to={isAdmin ? "/admin" : "/profile"} className="w-full">
                    <Button variant="outline" className="w-full rounded-xl gap-2 text-sm" size="sm">
                      {isAdmin ? <Shield className="w-4 h-4" /> : <UserCog className="w-4 h-4" />}
                      {isAdmin ? "Open Admin Panel" : "Edit Profile"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Triage Result Tile */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="col-span-12 sm:col-span-6 lg:col-span-4">
              <Link to="/my-triage-results" className="block h-full">
                <Card className="border-border/60 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group h-full">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground mb-1">Triage Results</h3>
                    {latestTriage ? (
                      <div className="mt-1">
                        <TriageBadge level={latestTriage.triage_level} />
                        <p className="text-xs text-muted-foreground mt-2">
                          Last: {format(new Date(latestTriage.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">No triage reports yet</p>
                    )}
                    <div className="flex-1" />
                    <p className="text-xs text-primary font-medium mt-4 flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* Referral Status */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="col-span-12 sm:col-span-6 lg:col-span-4">
              <Link to="/referrals" className="block h-full">
                <Card className="border-border/60 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group h-full">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <ArrowRightLeft className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground mb-1">My Referrals</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {patientReferralCount > 0 ? `${patientReferralCount} active referral(s)` : "No active referrals"}
                    </p>
                    <div className="flex-1" />
                    <p className="text-xs text-primary font-medium mt-4 flex items-center gap-1">View referrals <ArrowRight className="w-3 h-3" /></p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* Medical History */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="col-span-12 sm:col-span-6 lg:col-span-4">
              <Link to="/medical-history" className="block h-full">
                <Card className="border-border/60 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group h-full">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Heart className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground mb-1">Medical History</h3>
                    <p className="text-sm text-muted-foreground mt-1">Conditions, medications, allergies & notes</p>
                    <div className="flex-1" />
                    <p className="text-xs text-primary font-medium mt-4 flex items-center gap-1">View records <ArrowRight className="w-3 h-3" /></p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* Notifications Tile */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="col-span-12 sm:col-span-6">
              <Link to="/notifications" className="block h-full">
                <Card className={`border-border/60 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group h-full ${patientUnread > 0 ? "border-primary/30 bg-primary/5" : ""}`}>
                  <CardContent className="p-6 flex items-center gap-4 h-full">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 relative ${patientUnread > 0 ? "bg-primary text-white" : "bg-primary/10"}`}>
                      <Bell className="w-6 h-6" />
                      {patientUnread > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">{patientUnread}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground">{patientUnread > 0 ? `${patientUnread} Unread` : "Notifications"}</p>
                      <p className="text-sm text-muted-foreground">{patientUnread > 0 ? "You have new updates from your health team" : "All caught up"}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* Emergency Report CTA */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="col-span-12 sm:col-span-6">
              <Link to="/emergency-report" className="block h-full">
                <Card className="border-destructive/30 bg-destructive/5 hover:bg-destructive/10 hover:border-destructive/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group h-full">
                  <CardContent className="p-6 flex items-center gap-4 h-full">
                    <div className="w-12 h-12 rounded-2xl bg-destructive/15 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground">Emergency Report</p>
                      <p className="text-sm text-muted-foreground">Report urgent symptoms for immediate triage</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-destructive group-hover:translate-x-1 transition-transform shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
