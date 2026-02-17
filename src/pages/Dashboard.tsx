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
  Heart,
  ArrowRight,
  AlertTriangle,
  Users,
  Calendar,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";

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
        .select("first_name, last_name, barangay_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!pp) {
        setPatientProfile(null);
        setLoading(false);
        return;
      }
      let barangayName: string | null = null;
      if (pp.barangay_id) {
        const { data: b } = await supabase.from("barangays").select("name").eq("id", pp.barangay_id).maybeSingle();
        barangayName = b?.name ?? null;
      }
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
      const triageMap = new Map((triageRes.data ?? []).map((t: { assessment_id: string; triage_level: string }) => [t.assessment_id, t.triage_level]));
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
      const { data: p } = await supabase.from("profiles").select("assigned_barangay_id").eq("id", user.id).single();
      if (p?.assigned_barangay_id) {
        const { data: b } = await supabase.from("barangays").select("name").eq("id", p.assigned_barangay_id).single();
        setClinicianBarangay((b as { name?: string })?.name ?? null);
      }
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
      const { data: p } = await supabase.from("profiles").select("assigned_barangay_id").eq("id", user.id).single();
      const barangayId = (p as { assigned_barangay_id?: string } | null)?.assigned_barangay_id;
      if (!barangayId) {
        setBhwPatients([]);
        setBhwBarangayName(null);
        setBhwLoading(false);
        return;
      }
      const { data: b } = await supabase.from("barangays").select("name").eq("id", barangayId).single();
      setBhwBarangayName((b as { name?: string } | null)?.name ?? null);
      const { data: ppList } = await supabase
        .from("patient_profiles")
        .select("user_id, first_name, last_name")
        .eq("barangay_id", barangayId);
      if (!ppList?.length) {
        setBhwPatients([]);
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
            <Link to="/login">Log in</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (isBhw) {
    const bhwMenuItems = [
      { num: 1, to: "/bhw/register-patient", icon: UserPlus, label: "Register New Patient / Emergency Report" },
      { num: 2, to: "/bhw/assist-intake", icon: Stethoscope, label: "Patient Symptom Reporting (Assisted)" },
      { num: 3, to: "/triage-monitor", icon: ClipboardList, label: "Monitor AI Triage Results" },
      { num: 4, to: "/consultations", icon: Video, label: "Teleconsultation Coordination" },
      { num: 5, to: "/referrals", icon: ArrowRightLeft, label: "Manage Referrals & Escalations" },
      { num: 6, to: "/bhw/activities", icon: Users, label: "Patient Follow-Up" },
      { num: 7, to: "/notifications", icon: Bell, label: "Notifications / Alerts" },
      { num: 8, to: "/profile", icon: UserCog, label: "Update Profile" },
    ];
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-20 pb-24 max-w-3xl">
          {/* Hero */}
          <div className="rounded-2xl bg-gradient-to-br from-primary/90 to-primary text-primary-foreground p-6 sm:p-8 mb-8 shadow-lg">
            <p className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider">Telehealth Rural Barangay Platform</p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">BHW Dashboard</h1>
            <p className="mt-3 text-primary-foreground/95">Welcome, {profile?.full_name ?? "BHW"}</p>
            {bhwBarangayName && (
              <p className="text-sm text-primary-foreground/80 mt-1">Barangay: {bhwBarangayName}</p>
            )}
          </div>

          {/* Emergency / High-risk banner */}
          {bhwHighRiskCount > 0 && (
            <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/10 p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">High-risk triage cases</p>
                  <p className="text-sm text-muted-foreground">{bhwHighRiskCount} patient(s) need prioritization</p>
                </div>
              </div>
              <Button asChild size="sm" className="gap-2 bg-destructive hover:bg-destructive/90">
                <Link to="/triage-monitor">
                  <ClipboardList className="w-4 h-4" />
                  View Triage Monitor
                </Link>
              </Button>
            </div>
          )}

          {/* Quick: Emergency report */}
          <div className="mb-6">
            <Button asChild className="w-full rounded-xl h-12 font-semibold gap-2 shadow-md" size="lg">
              <Link to="/bhw/assist-intake">
                <Stethoscope className="w-5 h-5" />
                Emergency Quick Report (Patient Assisted)
              </Link>
            </Button>
          </div>

          {/* Assigned patients strip */}
          <div className="rounded-2xl border bg-card p-4 mb-8 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Assigned patients
              </h2>
              <span className="text-sm text-muted-foreground">{bhwPatients.length} in barangay</span>
            </div>
            {bhwLoading ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </div>
            ) : bhwPatients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No patients in your barangay yet. Register a new patient below.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {bhwPatients.slice(0, 8).map((p) => (
                  <Button key={p.user_id} asChild variant="secondary" size="sm" className="rounded-lg">
                    <Link to={`/bhw/assist-intake?patient=${p.user_id}`}>{p.full_name ?? "Patient"}</Link>
                  </Button>
                ))}
                {bhwPatients.length > 8 && (
                  <span className="text-xs text-muted-foreground self-center">+{bhwPatients.length - 8} more</span>
                )}
              </div>
            )}
          </div>

          {/* Main actions grid */}
          <div className="space-y-2">
            {bhwMenuItems.map(({ num, to, icon: Icon, label }) => (
              <Link key={to} to={to}>
                <div className="rounded-2xl border bg-card p-4 flex items-center gap-4 hover:bg-muted/40 hover:border-primary/20 transition-all shadow-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">{num}</span>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium text-foreground flex-1">{label}</span>
                  {to === "/notifications" && unreadNotifications > 0 && (
                    <Badge variant="destructive" className="shrink-0">{unreadNotifications}</Badge>
                  )}
                  <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-2xl border border-border bg-card p-4 flex items-center gap-4 hover:bg-muted/40 hover:border-destructive/30 transition-all text-muted-foreground hover:text-destructive"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted font-bold text-sm">—</span>
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="font-medium flex-1 text-left">Logout</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (isClinician) {
    const highRisk = clinicianConsults.filter((c) => c.triage_level === "emergency" || c.triage_level === "urgent");
    const welcomeName = profile?.full_name?.trim() ? (profile.full_name.startsWith("Dr.") ? profile.full_name : `Dr. ${profile.full_name}`) : "Clinician";
    const menuItems = [
      { to: "/triage-monitor", icon: ClipboardList, label: "Monitor AI Triage Results" },
      { to: "/consultations", icon: Video, label: "Teleconsultation Appointments" },
      { to: "/referrals", icon: ArrowRightLeft, label: "Review / Approve Referrals" },
      { to: "/patient-history", icon: FileText, label: "Patient Medical History" },
      { to: "/notifications", icon: Bell, label: "Notifications / Alerts" },
      { to: "/profile", icon: UserCog, label: "Update Profile" },
    ];
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-20 max-w-2xl">
          <Card className="mb-8 border-primary/20 bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Nurse / Physician Dashboard</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Welcome, {welcomeName}</p>
                  {clinicianBarangay && (
                    <p className="text-sm text-muted-foreground">Barangay Assigned: {clinicianBarangay}</p>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {highRisk.length > 0 && (
            <Card className="mb-6 border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  High-risk / urgent cases
                </CardTitle>
                <CardDescription>Review these patients first</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {highRisk.map((c) => (
                  <Link key={c.id} to="/consultations">
                    <div className="flex items-center justify-between rounded-lg border bg-background p-3 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Badge variant="destructive">{c.triage_level}</Badge>
                        <span className="font-medium">{c.patient_name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {c.scheduled_at ? format(new Date(c.scheduled_at), "MMM d, h:mm a") : "Not scheduled"}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3">
            {menuItems.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to}>
                <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{label}</span>
                    {to === "/notifications" && unreadNotifications > 0 && (
                      <Badge variant="destructive" className="ml-auto">{unreadNotifications}</Badge>
                    )}
                    <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
            <Card className="border-border">
              <CardContent className="py-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-4 text-muted-foreground hover:text-destructive"
                  onClick={handleLogout}
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <LogOut className="w-5 h-5" />
                  </div>
                  Logout
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const firstName = patientProfile?.first_name || profile?.full_name?.split(" ")[0] || "Patient";
  const lastName = patientProfile?.last_name || profile?.full_name?.split(" ").slice(1).join(" ") || "";
  const welcomeName = [firstName, lastName].filter(Boolean).join(" ");
  const barangayName = patientProfile?.barangay?.name ?? "—";

  const menu = [
    { to: "/symptom-checker", icon: Stethoscope, label: "Report Symptoms" },
    { to: "/symptom-checker", icon: ClipboardList, label: "My AI Triage Results" },
    { to: "/consultations", icon: Video, label: "Teleconsultation Appointments" },
    { to: "/referrals", icon: ArrowRightLeft, label: "Referrals / Escalations" },
    { to: "/medical-history", icon: FileText, label: "View / Update Medical History" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/profile", icon: UserCog, label: "Update Profile" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading…</span>
            </div>
          ) : (
            <>
              <Card className="mb-8 border-primary/20 bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Heart className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Patient Dashboard</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Welcome, {welcomeName}
                      </p>
                      <p className="text-sm text-muted-foreground">Barangay: {barangayName}</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid gap-3">
                {menu.map(({ to, icon: Icon, label }) => (
                  <Link key={to} to={to}>
                    <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
                      <CardContent className="flex items-center gap-4 py-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{label}</span>
                        <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                <Card className="border-border">
                  <CardContent className="py-4">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-4 text-muted-foreground hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <LogOut className="w-5 h-5" />
                      </div>
                      Logout
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
