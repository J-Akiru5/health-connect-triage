import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { Cpu, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { FiltersBarSkeleton, TableRowsSkeleton } from "@/components/ui/loading-skeletons";

type TriageLevel = "emergency" | "urgent" | "non_urgent" | "home_care";

type ModelStats = {
  model_version: string | null;
  count: number;
  by_level: Record<TriageLevel, number>;
};

type RecentRow = {
  id: string;
  assessment_id: string;
  risk_score: number | null;
  triage_level: TriageLevel;
  model_version: string | null;
  created_at: string;
};

export default function AdminAITriage() {
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const { data: results } = await supabase
        .from("ai_triage_results")
        .select("id, assessment_id, risk_score, triage_level, model_version, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      const rows = (results ?? []) as (RecentRow & { id: string })[];
      const versionCount: Record<string, { count: number; by_level: Record<TriageLevel, number> }> = {};
      const levels: TriageLevel[] = ["emergency", "urgent", "non_urgent", "home_care"];
      rows.forEach((r) => {
        const v = r.model_version ?? "unknown";
        if (!versionCount[v]) {
          versionCount[v] = { count: 0, by_level: { emergency: 0, urgent: 0, non_urgent: 0, home_care: 0 } };
        }
        versionCount[v].count += 1;
        if (levels.includes(r.triage_level)) {
          versionCount[v].by_level[r.triage_level] += 1;
        }
      });
      setModelStats(
        Object.entries(versionCount).map(([model_version, d]) => ({
          model_version: model_version === "unknown" ? null : model_version,
          count: d.count,
          by_level: d.by_level,
        }))
      );
      setRecent(rows);
      setLoading(false);
    })();
  }, []);

  const highRisk = recent.filter((r) => r.triage_level === "emergency" || r.triage_level === "urgent");

  const modelOptions = useMemo(
    () => [...new Set(recent.map((r) => r.model_version ?? "unknown"))],
    [recent]
  );

  const filteredRecent = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return recent.filter((r) => {
      const matchesSearch =
        q.length === 0 ||
        r.assessment_id.toLowerCase().includes(q) ||
        (r.model_version ?? "unknown").toLowerCase().includes(q);
      const matchesLevel = levelFilter === "all" || r.triage_level === levelFilter;
      const normalizedModel = r.model_version ?? "unknown";
      const matchesModel = modelFilter === "all" || normalizedModel === modelFilter;
      return matchesSearch && matchesLevel && matchesModel;
    });
  }, [recent, searchTerm, levelFilter, modelFilter]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-5 py-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preparing triage intelligence</CardTitle>
              <CardDescription>Loading model snapshots and recent assessment logs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <TableRowsSkeleton rows={3} columns={2} />
              <FiltersBarSkeleton fields={3} />
            </CardContent>
          </Card>
          <TableRowsSkeleton rows={8} columns={4} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Triage System Oversight</h1>
          <p className="text-muted-foreground mt-1">
            Monitor model version, performance, and logs for audit and reproducibility.
          </p>
        </div>

        {highRisk.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                High-risk triage (last 100)
              </CardTitle>
              <CardDescription>{highRisk.length} emergency or urgent cases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {highRisk.slice(0, 10).map((r) => (
                  <Badge key={r.id} variant="destructive">
                    {r.triage_level} · {format(new Date(r.created_at), "MMM d")}
                  </Badge>
                ))}
                {highRisk.length > 10 && (
                  <Badge variant="secondary">+{highRisk.length - 10} more</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Model version usage
            </CardTitle>
            <CardDescription>
              Ensure ai_triage_results.model_version consistency; archive previous outputs for reproducibility.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {modelStats.length === 0 ? (
              <p className="text-muted-foreground">No triage results yet.</p>
            ) : (
              <div className="space-y-3">
                {modelStats.map((s) => (
                  <div
                    key={s.model_version ?? "null"}
                    className="rounded-lg border p-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="font-medium">{s.model_version ?? "Unversioned"}</span>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{s.count} results</Badge>
                      {s.by_level.emergency > 0 && (
                        <Badge variant="destructive">emergency: {s.by_level.emergency}</Badge>
                      )}
                      {s.by_level.urgent > 0 && (
                        <Badge variant="secondary">urgent: {s.by_level.urgent}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent triage results (last 100)</CardTitle>
            <CardDescription>Logs stored for audit and research.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search assessment ID or model..."
              />
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="non_urgent">Non-urgent</SelectItem>
                  <SelectItem value="home_care">Home care</SelectItem>
                </SelectContent>
              </Select>
              <Select value={modelFilter} onValueChange={setModelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All models</SelectItem>
                  {modelOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m === "unknown" ? "Unversioned" : m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Level</th>
                    <th className="text-left p-3 font-medium">Risk score</th>
                    <th className="text-left p-3 font-medium">Model</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecent.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No matching results.
                      </td>
                    </tr>
                  ) : (
                    filteredRecent.slice(0, 20).map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-3 text-muted-foreground">{format(new Date(r.created_at), "MMM d, HH:mm")}</td>
                        <td className="p-3">
                          <Badge
                            variant={
                              r.triage_level === "emergency" || r.triage_level === "urgent"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {r.triage_level}
                          </Badge>
                        </td>
                        <td className="p-3">{r.risk_score ?? "—"}</td>
                        <td className="p-3 text-muted-foreground">{r.model_version ?? "—"}</td>
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
