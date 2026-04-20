import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
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
} from "lucide-react";
import { MetricCardsSkeleton, TableRowsSkeleton } from "@/components/ui/loading-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

type ClinicianVariant = "nurse" | "doctor";

type ClinicianConsultRow = {
  id: string;
  patient_name: string;
  created_at: string;
  triage_level: string | null;
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
  const [highRiskCount, setHighRiskCount] = useState(0);
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
      setClinicianConsults([]);
      const { count } = await supabase
        .from("ai_triage_results")
        .select("id", { count: "exact", head: true })
        .in("triage_level", ["emergency", "urgent"]);
      setHighRiskCount(count ?? 0);
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
  const highRisk = highRiskCount;

  const menuItems = useMemo(() => {
    const base = [
      { to: "/triage-monitor", icon: ClipboardList, label: "Monitor AI Triage Results" },
      { to: "/referrals", icon: ArrowRightLeft, label: "Referrals" },
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
          <div className="space-y-6 py-1">
            <MetricCardsSkeleton count={3} />
            <Skeleton className="h-14 w-full rounded-xl" />
            <TableRowsSkeleton rows={6} columns={2} />
          </div>
        ) : highRisk > 0 ? (
          <Card className="mb-6 border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                High-risk / urgent cases
              </CardTitle>
              <CardDescription>Review these patients first</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/triage-monitor">
                  <div className="flex items-center justify-between rounded-lg border bg-background p-3 hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive">High risk</Badge>
                      <span className="font-medium">{highRisk} case(s) flagged</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
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

