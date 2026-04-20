import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Loader2, BarChart3, Stethoscope, ArrowRightLeft, Download } from "lucide-react";

type TriageCounts = { emergency: number; urgent: number; non_urgent: number; home_care: number };
type ReferralStats = { total: number; byStatus: Record<string, number>; byUrgency: Record<string, number> };
type TopFactor = { id: string; count: number };

export default function AdminAnalytics() {
  const [triageCounts, setTriageCounts] = useState<TriageCounts | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [topFactors, setTopFactors] = useState<TopFactor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const levels: (keyof TriageCounts)[] = ["emergency", "urgent", "non_urgent", "home_care"];
      const counts: TriageCounts = { emergency: 0, urgent: 0, non_urgent: 0, home_care: 0 };

      for (const level of levels) {
        const { count } = await supabase
          .from("ai_triage_results")
          .select("id", { count: "exact", head: true })
          .eq("triage_level", level);
        counts[level] = count ?? 0;
      }
      setTriageCounts(counts);

      const { data: refs } = await supabase.from("referrals").select("status, urgency");
      const byStatus: Record<string, number> = {};
      const byUrgency: Record<string, number> = {};
      let total = 0;
      (refs ?? []).forEach((r: { status: string; urgency: string }) => {
        total += 1;
        byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
        byUrgency[r.urgency] = (byUrgency[r.urgency] ?? 0) + 1;
      });
      setReferralStats({ total, byStatus, byUrgency });

      const { data: triageRows } = await supabase
        .from("ai_triage_results")
        .select("factors");
      const factorCount: Record<string, number> = {};
      (triageRows ?? []).forEach((row: { factors: string[] | null }) => {
        const arr = Array.isArray(row.factors) ? row.factors : [];
        arr.forEach((id: string) => {
          factorCount[id] = (factorCount[id] ?? 0) + 1;
        });
      });
      const top = Object.entries(factorCount)
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
      setTopFactors(top);

      setLoading(false);
    })();
  }, []);

  function handleExportCSV() {
    const lines: string[] = ["Category,Label,Value"];
    if (triageCounts) {
      lines.push(`Triage,Emergency,${triageCounts.emergency}`);
      lines.push(`Triage,Urgent,${triageCounts.urgent}`);
      lines.push(`Triage,Non-urgent,${triageCounts.non_urgent}`);
      lines.push(`Triage,Home care,${triageCounts.home_care}`);
    }
    if (referralStats) {
      lines.push(`Referrals,Total,${referralStats.total}`);
      Object.entries(referralStats.byStatus).forEach(([status, n]) => {
        lines.push(`Referrals by status,${status},${n}`);
      });
      Object.entries(referralStats.byUrgency).forEach(([urgency, n]) => {
        lines.push(`Referrals by urgency,${urgency},${n}`);
      });
    }
    topFactors.forEach(({ id, count }) => {
      lines.push(`Top factor,${id.replace(/,/g, " ")},${count}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `analytics-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading analytics…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Case counts by triage level, common symptoms/factors, and referral rates for reporting and research.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Emergency</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{triageCounts?.emergency ?? 0}</div>
              <p className="text-xs text-muted-foreground">Triage cases (emergency)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Urgent</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{triageCounts?.urgent ?? 0}</div>
              <p className="text-xs text-muted-foreground">Triage cases (urgent)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Non-urgent</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{triageCounts?.non_urgent ?? 0}</div>
              <p className="text-xs text-muted-foreground">Triage cases (non-urgent)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Home care</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{triageCounts?.home_care ?? 0}</div>
              <p className="text-xs text-muted-foreground">Triage cases (home care)</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Common symptoms / factors
              </CardTitle>
              <CardDescription>
                Top factors (symptoms and risk factors) from AI triage results. Aggregated from ai_triage_results.factors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topFactors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No triage data yet.</p>
              ) : (
                <ul className="space-y-2">
                  {topFactors.map(({ id, count }) => (
                    <li key={id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <span className="font-medium capitalize">{id.replace(/-/g, " ")}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Referral rates
              </CardTitle>
              <CardDescription>
                Total referrals and breakdown by status and urgency.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-bold">{referralStats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total referrals</p>
              </div>
              {referralStats && (Object.keys(referralStats.byStatus).length > 0 || Object.keys(referralStats.byUrgency).length > 0) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium mb-2">By status</p>
                    <ul className="space-y-1 text-sm">
                      {Object.entries(referralStats.byStatus).map(([status, n]) => (
                        <li key={status} className="flex justify-between">
                          <span className="text-muted-foreground">{status}</span>
                          <span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">By urgency</p>
                    <ul className="space-y-1 text-sm">
                      {Object.entries(referralStats.byUrgency).map(([urgency, n]) => (
                        <li key={urgency} className="flex justify-between">
                          <span className="text-muted-foreground">{urgency}</span>
                          <span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {referralStats?.total === 0 && (
                <p className="text-sm text-muted-foreground">No referrals yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
