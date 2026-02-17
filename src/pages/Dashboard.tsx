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
    if (!user?.id || profile?.role !== "clinician") return;
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

  if (!user || (!isPatient && !isClinician)) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-12 text-center">
          <p className="text-muted-foreground">Dashboard is available for patients and clinicians. Please log in with an appropriate account.</p>
          <Button asChild className="mt-4">
            <Link to="/login">Log in</Link>
          </Button>
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
