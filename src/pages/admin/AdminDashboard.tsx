import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import {
  Users,
  MapPin,
  Stethoscope,
  Calendar,
  AlertTriangle,
  FileText,
  ArrowRight,
  Loader2,
  Activity,
} from "lucide-react";
import { format } from "date-fns";

type Stats = {
  usersTotal: number;
  usersByRole: Record<string, number>;
  barangaysCount: number;
  patientsCount: number;
  pendingTeleconsults: number;
  pendingReferrals: number;
  highRiskTriage: number;
  recentAuditCount: number;
};

type AuditRow = {
  id: string;
  user_id: string | null;
  action: string;
  resource: string;
  created_at: string;
  full_name: string | null;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentAudit, setRecentAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [
        { count: usersTotal },
        { data: profiles },
        { count: barangaysCount },
        { count: patientsCount },
        { count: pendingTeleconsults },
        { count: pendingReferrals },
        { count: highRiskTriage },
        { count: recentAuditCount },
        { data: auditData },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("role"),
        supabase.from("barangays").select("id", { count: "exact", head: true }),
        supabase.from("patient_profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("teleconsultations")
          .select("id", { count: "exact", head: true })
          .in("status", ["scheduled", "in_progress"]),
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("ai_triage_results")
          .select("id", { count: "exact", head: true })
          .in("triage_level", ["emergency", "urgent"]),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }),
        supabase
          .from("audit_logs")
          .select("id, user_id, action, resource, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const roleCount: Record<string, number> = {};
      (profiles ?? []).forEach((p: { role: string }) => {
        roleCount[p.role] = (roleCount[p.role] ?? 0) + 1;
      });

      setStats({
        usersTotal: usersTotal ?? 0,
        usersByRole: roleCount,
        barangaysCount: barangaysCount ?? 0,
        patientsCount: patientsCount ?? 0,
        pendingTeleconsults: pendingTeleconsults ?? 0,
        pendingReferrals: pendingReferrals ?? 0,
        highRiskTriage: highRiskTriage ?? 0,
        recentAuditCount: recentAuditCount ?? 0,
      });

      const userIds = [...new Set((auditData ?? []).map((a: { user_id: string | null }) => a.user_id).filter(Boolean))] as string[];
      let nameMap: Record<string, string | null> = {};
      if (userIds.length > 0) {
        const { data: prof } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        nameMap = Object.fromEntries((prof ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));
      }
      setRecentAudit(
        (auditData ?? []).map((a: AuditRow) => ({
          ...a,
          full_name: a.user_id ? nameMap[a.user_id] ?? null : null,
        }))
      );
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading dashboard…
        </div>
      </AdminLayout>
    );
  }

  const alerts = [
    stats.pendingReferrals > 0 && {
      label: "Pending referrals",
      count: stats.pendingReferrals,
      to: "/admin/teleconsult-referrals",
      variant: "warning" as const,
    },
    stats.highRiskTriage > 0 && {
      label: "High-risk triage cases",
      count: stats.highRiskTriage,
      to: "/admin/ai-triage",
      variant: "destructive" as const,
    },
    stats.pendingTeleconsults > 0 && {
      label: "Scheduled teleconsultations",
      count: stats.pendingTeleconsults,
      to: "/admin/teleconsult-referrals",
      variant: "info" as const,
    },
  ].filter(Boolean) as { label: string; count: number; to: string; variant: "warning" | "destructive" | "info" }[];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Administrator Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Platform summary, system health, user statistics, and alerts.
          </p>
        </div>

        {alerts.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {alerts.map((a) => (
                <Button key={a.to + a.label} variant="outline" size="sm" asChild className="gap-2">
                  <Link to={a.to}>
                    {a.label}: <Badge variant={a.variant === "destructive" ? "destructive" : "secondary"}>{a.count}</Badge>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.usersTotal}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Patient: {stats.usersByRole.patient ?? 0} · BHW: {stats.usersByRole.bhw ?? 0} · Clinician: {stats.usersByRole.clinician ?? 0} · Admin: {stats.usersByRole.admin ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Barangays</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.barangaysCount}</div>
              <Button variant="link" className="h-auto p-0 text-xs" asChild>
                <Link to="/admin/barangays">Manage</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Registered Patients</CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.patientsCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Consultations</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingTeleconsults}</div>
              <Button variant="link" className="h-auto p-0 text-xs" asChild>
                <Link to="/admin/teleconsult-referrals">View</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent audit log
              </CardTitle>
              <CardDescription>Last 10 actions (login, data access, system changes)</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/audit">
                <FileText className="h-4 w-4 mr-2" />
                Full audit
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Time</th>
                    <th className="text-left p-3 font-medium">User</th>
                    <th className="text-left p-3 font-medium">Action</th>
                    <th className="text-left p-3 font-medium">Resource</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAudit.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-muted-foreground text-center">
                        No audit entries yet.
                      </td>
                    </tr>
                  ) : (
                    recentAudit.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="p-3 text-muted-foreground">{format(new Date(row.created_at), "MMM d, HH:mm")}</td>
                        <td className="p-3">{row.full_name ?? row.user_id ?? "—"}</td>
                        <td className="p-3">{row.action}</td>
                        <td className="p-3">{row.resource}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
