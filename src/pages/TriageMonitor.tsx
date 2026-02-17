import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, Activity, Video, ArrowRightLeft, CheckCircle2 } from "lucide-react";

type TriageRow = {
  id: string;
  assessment_id: string;
  patient_id: string;
  patient_name: string;
  risk_score: number | null;
  triage_level: string;
  created_at: string;
};

export default function TriageMonitor() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<TriageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || profile?.role !== "clinician") {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: consults } = await supabase
        .from("teleconsultations")
        .select("id, patient_id, assessment_id")
        .eq("provider_id", user.id);
      const assessmentIds = (consults ?? []).map((c: { assessment_id: string | null }) => c.assessment_id).filter(Boolean) as string[];
      if (assessmentIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data: triageData } = await supabase
        .from("ai_triage_results")
        .select("id, assessment_id, risk_score, triage_level, created_at")
        .in("assessment_id", assessmentIds)
        .order("created_at", { ascending: false });
      const { data: assessments } = await supabase
        .from("symptom_assessments")
        .select("id, user_id")
        .in("id", assessmentIds);
      const patientIds = [...new Set((assessments ?? []).map((a: { user_id: string }) => a.user_id))];
      const { data: profData } = await supabase.from("profiles").select("id, full_name").in("id", patientIds);
      const nameMap = new Map((profData ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Patient"]));
      const assessmentToPatient = new Map((assessments ?? []).map((a: { id: string; user_id: string }) => [a.id, a.user_id]));
      const list: TriageRow[] = (triageData ?? []).map((t: { id: string; assessment_id: string; risk_score: number | null; triage_level: string; created_at: string }) => ({
        id: t.id,
        assessment_id: t.assessment_id,
        patient_id: assessmentToPatient.get(t.assessment_id) ?? "",
        patient_name: nameMap.get(assessmentToPatient.get(t.assessment_id) ?? "") ?? "Patient",
        risk_score: t.risk_score != null ? Number(t.risk_score) : null,
        triage_level: t.triage_level,
        created_at: t.created_at,
      }));
      setRows(list);
      setLoading(false);
    })();
  }, [user?.id, profile?.role]);

  const displayLevel = (level: string) => {
    if (level === "emergency" || level === "urgent") return "HIGH";
    if (level === "non_urgent") return "MODERATE";
    return "LOW";
  };

  const levelVariant = (level: string): "destructive" | "default" | "secondary" => {
    if (level === "emergency" || level === "urgent") return "destructive";
    if (level === "non_urgent") return "default";
    return "secondary";
  };

  if (profile?.role !== "clinician") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-20">
          <p className="text-muted-foreground text-center">Access limited to nurses and physicians.</p>
          <Button asChild className="mt-4 mx-auto block">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Triage Monitor</h1>
              <p className="text-sm text-muted-foreground">Monitor AI-assigned triage levels for your assigned patients</p>
            </div>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 flex items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading…</span>
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No AI triage results for your assigned patients yet.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Patient triage overview</CardTitle>
                <CardDescription>Risk score and triage level from AI-assisted triage (JC-3 research use)</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient name</TableHead>
                      <TableHead className="text-right">Risk score</TableHead>
                      <TableHead>Triage level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.patient_name}</TableCell>
                        <TableCell className="text-right">
                          {r.risk_score != null ? `${Math.round(r.risk_score)} / 100` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={levelVariant(r.triage_level)}>{displayLevel(r.triage_level)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" asChild className="gap-2">
                <Link to="/consultations">
                  <Video className="w-4 h-4" />
                  Assign teleconsultation
                </Link>
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <Link to="/referrals">
                  <ArrowRightLeft className="w-4 h-4" />
                  Escalate referral
                </Link>
              </Button>
              <Button variant="outline" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Mark follow-up completed
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
