import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/lib/supabase";
import {
  Users,
  Calendar,
  AlertCircle,
  FileText,
  ArrowRight,
  HeartPulse,
  TrendingUp,
  Clock,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { MetricCardsSkeleton, TableRowsSkeleton } from "@/components/ui/loading-skeletons";

type Stats = {
  usersTotal: number;
  usersByRole: Record<string, number>;
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
        { count: patientsCount },
        { count: pendingTeleconsults },
        { count: pendingReferrals },
        { count: highRiskTriage },
        { count: recentAuditCount },
        { data: auditData },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("role"),
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
          .limit(6),
      ]);

      const roleCount: Record<string, number> = {};
      (profiles ?? []).forEach((p: { role: string }) => {
        roleCount[p.role] = (roleCount[p.role] ?? 0) + 1;
      });

      setStats({
        usersTotal: usersTotal ?? 0,
        usersByRole: roleCount,
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
        <div className="flex h-full min-h-[420px] w-full flex-col gap-5">
          <MetricCardsSkeleton />
          <TableRowsSkeleton rows={7} columns={4} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col h-full space-y-8 w-full mx-auto max-w-[1920px]">
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold tracking-widest uppercase mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </div>
            <h1 className="text-[28px] leading-tight font-bold tracking-tight text-foreground border-b-2 border-transparent">
              Platform Command Center
            </h1>
            <p className="text-[14px] text-muted-foreground max-w-[600px] leading-relaxed">
              Real-time oversight of hospital operations, AI triage assessments, and comprehensive user metrics.
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Timestamp</div>
            <div className="text-[15px] font-medium text-foreground mt-0.5">{format(new Date(), "PPpp")}</div>
          </div>
        </section>

        {/* Key Metrics Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="group relative flex flex-col bg-card rounded-2xl p-5 border border-border shadow-sm transition-all hover:shadow-md hover:border-[#800000]/20 overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-[#800000]/5 to-transparent rounded-full blur-2xl group-hover:bg-[#800000]/10 transition-colors" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="h-10 w-10 shrink-0 bg-muted/50 border border-border rounded-xl flex items-center justify-center text-muted-foreground group-hover:text-[#800000] group-hover:bg-[#800000]/5 transition-colors">
                <Users className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Total Accounts</p>
              </div>
            </div>
            <div className="mt-auto relative z-10">
              <h2 className="text-[34px] font-bold text-foreground tracking-tight leading-none mb-2">{stats.usersTotal}</h2>
              <div className="flex items-center gap-3 text-[12px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"/> {stats.usersByRole.patient ?? 0} PT</span>
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> {stats.usersByRole.bhw ?? 0} HW</span>
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"/> {stats.usersByRole.clinician ?? 0} MD</span>
              </div>
            </div>
          </div>

          <div className="group relative flex flex-col bg-card rounded-2xl p-5 border border-border shadow-sm transition-all hover:shadow-md hover:border-[#800000]/20 overflow-hidden">
             <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="h-10 w-10 shrink-0 bg-muted/50 border border-border rounded-xl flex items-center justify-center text-muted-foreground group-hover:text-blue-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors">
                <HeartPulse className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Active Patients</p>
              </div>
            </div>
            <div className="mt-auto relative z-10 flex items-end justify-between">
              <h2 className="text-[34px] font-bold text-foreground tracking-tight leading-none">{stats.patientsCount}</h2>
              <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-xs font-bold">
                <TrendingUp className="h-3 w-3 mr-1" /> +12%
              </div>
            </div>
          </div>

          <div className="group relative flex flex-col bg-card rounded-2xl p-5 border border-border shadow-sm transition-all hover:shadow-md hover:border-[#800000]/20 overflow-hidden">
             <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-amber-500/5 to-transparent rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="h-10 w-10 shrink-0 bg-muted/50 border border-border rounded-xl flex items-center justify-center text-muted-foreground group-hover:text-amber-600 group-hover:bg-amber-50 dark:group-hover:bg-amber-950/30 transition-colors">
                <Calendar className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Pending Consults</p>
              </div>
            </div>
            <div className="mt-auto relative z-10 flex items-end justify-between">
              <h2 className="text-[34px] font-bold text-foreground tracking-tight leading-none">{stats.pendingTeleconsults}</h2>
              <Link to="/admin/teleconsult-referrals" className="text-[12px] font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
                Action Required <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="group relative flex flex-col bg-card rounded-2xl p-5 border border-border shadow-sm transition-all hover:shadow-md hover:border-red-500/30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-2xl transition-colors" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="h-10 w-10 shrink-0 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-600">
                <AlertCircle className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-red-600 uppercase tracking-wider">Critical Triage</p>
              </div>
            </div>
            <div className="mt-auto relative z-10 flex items-end justify-between">
              <h2 className="text-[34px] font-bold text-red-600 tracking-tight leading-none drop-shadow-sm">{stats.highRiskTriage}</h2>
              <Link to="/admin/ai-triage" className="text-[12px] font-bold text-red-700 bg-red-100/50 px-2.5 py-1 rounded-md hover:bg-red-100 transition-colors flex items-center gap-1">
                View Queue <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Audit & Compliance Table */}
        <section className="flex-1 min-h-[350px] bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col relative z-10">
          <div className="h-[68px] border-b border-border/60 flex items-center justify-between px-6 bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold tracking-tight text-foreground">Live Audit Trail</h3>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">HIPAA Compliance Logging</p>
              </div>
            </div>
            <Link to="/admin/audit-logs" className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground bg-card border border-border px-3 py-1.5 rounded-lg shadow-sm transition-all hover:shadow">     
              <FileText className="h-3.5 w-3.5" />
              Detailed Logs
            </Link>
          </div>

          <div className="flex-1 overflow-auto bg-card p-0">
            <table className="w-full text-left border-collapse border-0">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40">       
                  <th className="py-3 px-6 text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap w-[200px]">Timestamp</th>
                  <th className="py-3 px-6 text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Operator</th>
                  <th className="py-3 px-6 text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Action Type</th>
                  <th className="py-3 px-6 text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Resource Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentAudit.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <div className="mx-auto flex flex-col items-center justify-center opacity-40">
                        <ShieldCheck className="h-10 w-10 mb-3" />
                        <p className="text-[13px] font-medium">No secure audits recorded yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentAudit.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/35 transition-colors group">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-[#800000]" />
                          {format(new Date(log.created_at), "MMM d, h:mm a")}
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-bold text-muted-foreground">
                            {log.full_name ? log.full_name.charAt(0) : "S"}
                          </div>
                          <span className="text-[13px] font-semibold text-foreground">
                            {log.full_name || "System"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-muted text-muted-foreground uppercase tracking-wider border border-border">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <div className="text-[13px] font-medium text-muted-foreground truncate max-w-[250px]">
                          {log.resource}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </AdminLayout>
  );
}

