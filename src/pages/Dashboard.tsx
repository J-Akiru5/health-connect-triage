import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Stethoscope,
  ClipboardList,
  Video,
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
} from "lucide-react";
import { format } from "date-fns";
import { AppLogoMark } from "@/components/AppLogoMark";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/hooks/useScrollReveal";

type ClinicianConsultRow = {
  id: string;
  patient_id: string;
  patient_name: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  triage_level: string | null;
  assessment_id: string | null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { t } = useTranslation();
  const [patientProfile, setPatientProfile] = useState<{
    first_name: string | null;
    last_name: string | null;
    barangay?: { name: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [clinicianConsults, setClinicianConsults] = useState<ClinicianConsultRow[]>([]);
  const [clinicianLoading, setClinicianLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [clinicianBarangay, setClinicianBarangay] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || profile?.role !== "patient") {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: pp } = await supabase
        .from("patient_profiles")
        .select("first_name, last_name, barangay_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!pp) {
        setPatientProfile(null);
        setLoading(false);
        return;
      }
      const barangayName: string | null = (pp as { barangay_name?: string | null } | null)?.barangay_name ?? null;
      setPatientProfile({
        first_name: pp.first_name,
        last_name: pp.last_name,
        barangay: barangayName ? { name: barangayName } : null,
      });
      setLoading(false);
    })();
  }, [user?.id, profile?.role]);

  useEffect(() => {
    if (!user?.id || profile?.role !== "clinician") {
      setClinicianLoading(false);
      return;
    }
    (async () => {
      const { data: consults } = await supabase
        .from("teleconsultations")
        .select("id, patient_id, status, scheduled_at, created_at, assessment_id")
        .eq("provider_id", user.id)
        .in("status", ["scheduled", "in_progress"])
        .order("scheduled_at", { ascending: true, nullsFirst: false });
      if (!consults?.length) {
        setClinicianConsults([]);
        setClinicianLoading(false);
        return;
      }
      const patientIds = [...new Set(consults.map((c: { patient_id: string }) => c.patient_id))];
      const assessmentIds = consults.map((c: { assessment_id: string | null }) => c.assessment_id).filter(Boolean) as string[];
      const [profRes, triageRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", patientIds),
        assessmentIds.length
          ? supabase.from("ai_triage_results").select("assessment_id, triage_level").in("assessment_id", assessmentIds)
          : { data: [] as { assessment_id: string; triage_level: string }[] },
      ]);
      const nameMap = new Map((profRes.data ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Patient"]));
      const triageMap = new Map((triageRes.data ?? []).map((tr: { assessment_id: string; triage_level: string }) => [tr.assessment_id, tr.triage_level]));
      const rows: ClinicianConsultRow[] = consults.map((c: { id: string; patient_id: string; status: string; scheduled_at: string | null; created_at: string; assessment_id: string | null }) => ({
        id: c.id,
        patient_id: c.patient_id,
        patient_name: nameMap.get(c.patient_id) ?? "Patient",
        status: c.status,
        scheduled_at: c.scheduled_at,
        created_at: c.created_at,
        triage_level: c.assessment_id ? triageMap.get(c.assessment_id) ?? null : null,
        assessment_id: c.assessment_id,
      }));
      setClinicianConsults(rows);
      setClinicianLoading(false);
    })();
  }, [user?.id, profile?.role]);

  useEffect(() => {
    if (!user?.id || (profile?.role !== "clinician" && profile?.role !== "bhw")) return;
    (async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);
      setUnreadNotifications(count ?? 0);
    })();
  }, [user?.id, profile?.role]);

  useEffect(() => {
    if (!user?.id || profile?.role !== "clinician") return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("assigned_barangay_name").eq("id", user.id).single();
      setClinicianBarangay((p as { assigned_barangay_name?: string | null } | null)?.assigned_barangay_name ?? null);
    })();
  }, [user?.id, profile?.role]);

  async function handleLogout() {
    await signOut();
    navigate("/", { replace: true });
  }

  const isClinician = profile?.role === "clinician";
  const isPatient = profile?.role === "patient";
  const isBhw = profile?.role === "bhw";

  const [bhwPatients, setBhwPatients] = useState<{ user_id: string; full_name: string | null; first_name: string | null; last_name: string | null }[]>([]);
  const [bhwBarangayName, setBhwBarangayName] = useState<string | null>(null);
  const [bhwLoading, setBhwLoading] = useState(true);
  const [bhwHighRiskCount, setBhwHighRiskCount] = useState(0);

  useEffect(() => {
    if (!user?.id || !isBhw) {
      setBhwLoading(false);
      return;
    }
    (async () => {
      const { data: ppList } = await supabase
        .from("patient_profiles")
        .select("user_id, first_name, last_name")
        .limit(500);
      if (!ppList?.length) {
        setBhwPatients([]);
        setBhwBarangayName(null);
        setBhwLoading(false);
        return;
      }
      const userIds = ppList.map((r: { user_id: string }) => r.user_id);
      const { data: profData } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const nameMap = new Map((profData ?? []).map((x: { id: string; full_name: string | null }) => [x.id, x.full_name]));
      const patients = ppList.map((r: { user_id: string; first_name: string | null; last_name: string | null }) => ({
        user_id: r.user_id,
        full_name: nameMap.get(r.user_id) ?? ([r.first_name, r.last_name].filter(Boolean).join(" ") || "Patient"),
        first_name: r.first_name,
        last_name: r.last_name,
      }));
      setBhwPatients(patients);
      const { data: assessments } = await supabase
        .from("symptom_assessments")
        .select("id")
        .in("user_id", userIds);
      const assessmentIds = (assessments ?? []).map((a: { id: string }) => a.id);
      if (assessmentIds.length > 0) {
        const { count } = await supabase
          .from("ai_triage_results")
          .select("id", { count: "exact", head: true })
          .in("assessment_id", assessmentIds)
          .in("triage_level", ["emergency", "urgent"]);
        setBhwHighRiskCount(count ?? 0);
      }
      setBhwBarangayName(null);
      setBhwLoading(false);
    })();
  }, [user?.id, isBhw]);

  if (!user || (!isPatient && !isClinician && !isBhw && profile?.role !== "admin")) {
    if (profile?.role === "admin") {
      navigate("/admin", { replace: true });
      return null;
    }
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-12 text-center">
          <p className="text-muted-foreground">Dashboard is available for patients, Barangay Health Workers, clinicians, and admins. Please log in with an appropriate account.</p>
          <Button asChild className="mt-4">
            <Link to="/login">{t("auth.logIn")}</Link>
          </Button>
        </main>
      </div>
    );
  }

  /* ─── Helper: Menu Item Card ─── */
  function MenuItemCard({ to, icon: Icon, label, badge }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; badge?: number }) {
    return (
      <Link to={to}>
        <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <Card className="border-border/60 hover:border-primary/20 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-foreground flex-1">{label}</span>
              {badge != null && badge > 0 && (
                <Badge variant="destructive" className="shrink-0">{badge}</Badge>
              )}
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </motion.div>
      </Link>
    );
  }

  /* ─── Welcome Banner ─── */
  function WelcomeBanner({ title, name, subtitle }: { title: string; name: string; subtitle?: string }) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl gradient-hero text-primary-foreground p-6 sm:p-8 mb-8 shadow-lg relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08)_0%,transparent_50%)]" />
        <div className="relative">
          <p className="text-primary-foreground/70 text-sm font-medium uppercase tracking-wider">
            {t("dashboard.teleheathPlatform")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1 font-display">{title}</h1>
          <p className="mt-3 text-primary-foreground/90">{t("dashboard.welcome")}, {name}</p>
          {subtitle && <p className="text-sm text-primary-foreground/70 mt-1">{subtitle}</p>}
        </div>
      </motion.div>
    );
  }

  /* ─── BHW Dashboard ─── */
  if (isBhw) {
    const bhwMenuItems = [
      { to: "/bhw/register-patient", icon: UserPlus, label: t("dashboard.registerPatient") },
      { to: "/bhw/assist-intake", icon: Stethoscope, label: t("dashboard.assistedSymptom") },
      { to: "/triage-monitor", icon: ClipboardList, label: t("dashboard.monitorTriage") },
      { to: "/bhw/activities", icon: Users, label: t("dashboard.patientFollowUp") },
      { to: "/notifications", icon: Bell, label: t("dashboard.notifications") },
    ];
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-20 pb-24 max-w-3xl">
          <WelcomeBanner
            title={t("dashboard.bhwDashboard")}
            name={profile?.full_name ?? "BHW"}
            subtitle={bhwBarangayName ? `${t("dashboard.barangay")}: ${bhwBarangayName}` : undefined}
          />

          {/* High-risk banner */}
          {bhwHighRiskCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4 mb-6 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center pulse-ring">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t("dashboard.highRiskCases")}</p>
                  <p className="text-sm text-muted-foreground">{bhwHighRiskCount} {t("dashboard.needsPrioritization")}</p>
                </div>
              </div>
              <Button asChild size="sm" className="gap-2 bg-destructive hover:bg-destructive/90 rounded-xl">
                <Link to="/triage-monitor">
                  <ClipboardList className="w-4 h-4" />
                  {t("dashboard.viewTriageMonitor")}
                </Link>
              </Button>
            </motion.div>
          )}

          {/* Emergency quick report */}
          <div className="mb-6">
            <Button asChild className="w-full rounded-xl h-12 font-semibold gap-2 shadow-md" size="lg">
              <Link to="/bhw/assist-intake">
                <Stethoscope className="w-5 h-5" />
                {t("dashboard.emergencyQuickReport")}
              </Link>
            </Button>
          </div>

          {/* Assigned patients */}
          <Card className="mb-8 border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  {t("dashboard.assignedPatients")}
                </h2>
                <span className="text-sm text-muted-foreground">{bhwPatients.length} {t("dashboard.total")}</span>
              </div>
              {bhwLoading ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("common.loading")}
                </div>
              ) : bhwPatients.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("dashboard.registerPatient")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {bhwPatients.slice(0, 8).map((p) => (
                    <Button key={p.user_id} asChild variant="secondary" size="sm" className="rounded-xl">
                      <Link to={`/bhw/assist-intake?patient=${p.user_id}`}>{p.full_name ?? "Patient"}</Link>
                    </Button>
                  ))}
                  {bhwPatients.length > 8 && (
                    <span className="text-xs text-muted-foreground self-center">+{bhwPatients.length - 8} more</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Menu items */}
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
            {bhwMenuItems.map(({ to, icon, label }) => (
              <motion.div key={to} variants={staggerItem}>
                <MenuItemCard to={to} icon={icon} label={label} badge={to === "/notifications" ? unreadNotifications : undefined} />
              </motion.div>
            ))}
            <motion.div variants={staggerItem}>
              <Card className="border-border/60">
                <CardContent className="py-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-4 text-muted-foreground hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <LogOut className="w-5 h-5" />
                    </div>
                    {t("dashboard.logout")}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </main>
      </div>
    );
  }

  /* ─── Clinician Dashboard ─── */
  if (isClinician) {
    const highRisk = clinicianConsults.filter((c) => c.triage_level === "emergency" || c.triage_level === "urgent");
    const welcomeName = profile?.full_name?.trim() ? (profile.full_name.startsWith("Dr.") ? profile.full_name : `Dr. ${profile.full_name}`) : "Clinician";
    const menuItems = [
      { to: "/triage-monitor", icon: ClipboardList, label: t("dashboard.monitorTriage") },
      { to: "/consultations", icon: Video, label: t("dashboard.teleconsultation") },
      { to: "/referrals", icon: ArrowRightLeft, label: t("dashboard.reviewReferrals") },
      { to: "/patient-history", icon: FileText, label: t("dashboard.patientMedicalHistory") },
      { to: "/notifications", icon: Bell, label: t("dashboard.notifications") },
      { to: "/profile", icon: UserCog, label: t("dashboard.updateProfile") },
    ];
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-20 max-w-2xl">
          <WelcomeBanner
            title={t("dashboard.clinicianDashboard")}
            name={welcomeName}
            subtitle={clinicianBarangay ? `${t("dashboard.barangayAssigned")}: ${clinicianBarangay}` : undefined}
          />

          {/* High risk cards */}
          {highRisk.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="mb-6 border-destructive/30 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    {t("dashboard.highRiskUrgent")}
                  </CardTitle>
                  <CardDescription>{t("dashboard.reviewFirst")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {highRisk.map((c) => (
                    <Link key={c.id} to="/consultations">
                      <div className="flex items-center justify-between rounded-xl border bg-background p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Badge variant="destructive">{c.triage_level}</Badge>
                          <span className="font-medium">{c.patient_name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {c.scheduled_at ? format(new Date(c.scheduled_at), "MMM d, h:mm a") : t("dashboard.notScheduled")}
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
            {menuItems.map(({ to, icon, label }) => (
              <motion.div key={to} variants={staggerItem}>
                <MenuItemCard to={to} icon={icon} label={label} badge={to === "/notifications" ? unreadNotifications : undefined} />
              </motion.div>
            ))}
            <motion.div variants={staggerItem}>
              <Card className="border-border/60">
                <CardContent className="py-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-4 text-muted-foreground hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <LogOut className="w-5 h-5" />
                    </div>
                    {t("dashboard.logout")}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </main>
      </div>
    );
  }

  /* ─── Patient Dashboard ─── */
  const firstName = patientProfile?.first_name || profile?.full_name?.split(" ")[0] || "Patient";
  const lastName = patientProfile?.last_name || profile?.full_name?.split(" ").slice(1).join(" ") || "";
  const welcomeName = [firstName, lastName].filter(Boolean).join(" ");
  const barangayName = patientProfile?.barangay?.name ?? "—";

  const menu = [
    { to: "/symptom-checker", icon: Stethoscope, label: t("dashboard.reportSymptoms") },
    { to: "/my-triage-results", icon: ClipboardList, label: t("dashboard.myTriageResults") },
    { to: "/consultations", icon: Video, label: t("dashboard.teleconsultation") },
    { to: "/medical-history", icon: FileText, label: t("dashboard.viewMedicalHistory") },
    { to: "/notifications", icon: Bell, label: t("dashboard.notifications") },
    { to: "/profile", icon: UserCog, label: t("dashboard.updateProfile") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">{t("common.loading")}</span>
            </div>
          ) : (
            <>
              <WelcomeBanner
                title={t("dashboard.patientDashboard")}
                name={welcomeName}
                subtitle={`${t("dashboard.barangay")}: ${barangayName}`}
              />

              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
                {menu.map(({ to, icon, label }) => (
                  <motion.div key={to} variants={staggerItem}>
                    <MenuItemCard to={to} icon={icon} label={label} />
                  </motion.div>
                ))}
                <motion.div variants={staggerItem}>
                  <Card className="border-border/60">
                    <CardContent className="py-4">
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-4 text-muted-foreground hover:text-destructive"
                        onClick={handleLogout}
                      >
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <LogOut className="w-5 h-5" />
                        </div>
                        {t("dashboard.logout")}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
