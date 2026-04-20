import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { handleMissingNotificationsTable } from "@/lib/notifications";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Bell,
  ClipboardList,
  FileText,
  Loader2,
  LogOut,
  Stethoscope,
  UserCog,
  Video,
} from "lucide-react";

type ClinicianVariant = "nurse" | "doctor";

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

function normalizeClinicianName(fullName: string | null | undefined) {
  const raw = (fullName ?? "").trim();
  if (!raw) return null;
  return raw;
}

export function ClinicianDashboard({ variant }: { variant: ClinicianVariant }) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const [clinicianConsults, setClinicianConsults] = useState<ClinicianConsultRow[]>([]);
  const [clinicianLoading, setClinicianLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [clinicianBarangay, setClinicianBarangay] = useState<string | null>(null);

  const displayName = useMemo(() => {
    const name = normalizeClinicianName(profile?.full_name);
    if (!name) return variant === "doctor" ? "Doctor" : "Nurse";
    if (variant === "doctor") return name.toLowerCase().startsWith("dr.") ? name : `Dr. ${name}`;
    return name.toLowerCase().startsWith("nurse ") ? name : `Nurse ${name}`;
  }, [profile?.full_name, variant]);

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
      const assessmentIds = consults
        .map((c: { assessment_id: string | null }) => c.assessment_id)
        .filter(Boolean) as string[];

      const [profRes, triageRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", patientIds),
        assessmentIds.length
          ? supabase.from("ai_triage_results").select("assessment_id, triage_level").in("assessment_id", assessmentIds)
          : { data: [] as { assessment_id: string; triage_level: string }[] },
      ]);

      const nameMap = new Map(
        (profRes.data ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Patient"])
      );
      const triageMap = new Map(
        (triageRes.data ?? []).map((t: { assessment_id: string; triage_level: string }) => [t.assessment_id, t.triage_level])
      );

      const rows: ClinicianConsultRow[] = consults.map(
        (c: {
          id: string;
          patient_id: string;
          status: string;
          scheduled_at: string | null;
          created_at: string;
          assessment_id: string | null;
        }) => ({
          id: c.id,
          patient_id: c.patient_id,
          patient_name: nameMap.get(c.patient_id) ?? "Patient",
          status: c.status,
          scheduled_at: c.scheduled_at,
          created_at: c.created_at,
          triage_level: c.assessment_id ? triageMap.get(c.assessment_id) ?? null : null,
          assessment_id: c.assessment_id,
        })
      );

      setClinicianConsults(rows);
      setClinicianLoading(false);
    })();
  }, [user?.id, profile?.role]);

  useEffect(() => {
    if (!user?.id || profile?.role !== "clinician") return;
    (async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);

      if (error && handleMissingNotificationsTable(error)) {
        setUnreadNotifications(0);
        return;
      }

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

  const highRisk = clinicianConsults.filter((c) => c.triage_level === "emergency" || c.triage_level === "urgent");

  const menuItems = useMemo(() => {
    const base = [
      { to: "/triage-monitor", icon: ClipboardList, label: "Monitor AI Triage Results" },
      { to: "/consultations", icon: Video, label: "Teleconsultation Appointments" },
      ...(variant === "doctor"
        ? [{ to: "/referrals", icon: ArrowRightLeft, label: "Review / Approve Referrals" } as const]
        : []),
      { to: "/patient-history", icon: FileText, label: "Patient Medical History" },
      { to: "/notifications", icon: Bell, label: "Notifications / Alerts" },
      { to: "/profile", icon: UserCog, label: "Update Profile" },
    ];
    return base;
  }, [variant]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20 flex-1 max-w-5xl">
        <Card className="mb-8 border-primary/20 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{variant === "doctor" ? "Doctor Dashboard" : "Nurse Dashboard"}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Welcome, {displayName}</p>
                {clinicianBarangay && <p className="text-sm text-muted-foreground">Barangay Assigned: {clinicianBarangay}</p>}
              </div>
            </div>
          </CardHeader>
        </Card>

        {clinicianLoading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : highRisk.length > 0 ? (
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
        ) : null}

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
                    <Badge variant="destructive" className="ml-auto">
                      {unreadNotifications}
                    </Badge>
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
      <Footer />
    </div>
  );
}

