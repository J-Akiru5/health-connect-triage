import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableRowsSkeleton } from "@/components/ui/loading-skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, ClipboardList, Stethoscope } from "lucide-react";
import { format } from "date-fns";

type TriageResultRow = {
  id: string;
  assessment_id: string;
  triage_level: string;
  risk_score: number | null;
  recommended_action: string | null;
  created_at: string;
};

function displayLevel(level: string): string {
  if (level === "emergency" || level === "urgent") return "HIGH";
  if (level === "non_urgent") return "MODERATE";
  return "LOW";
}

function levelVariant(level: string): "destructive" | "default" | "secondary" {
  if (level === "emergency" || level === "urgent") return "destructive";
  if (level === "non_urgent") return "default";
  return "secondary";
}

export default function MyTriageResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<TriageResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [explainLoading, setExplainLoading] = useState<Record<string, boolean>>({});
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: assessments } = await supabase
        .from("symptom_assessments")
        .select("id")
        .eq("user_id", user.id);
      const assessmentIds = (assessments ?? []).map((a: { id: string }) => a.id);
      if (assessmentIds.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }
      const { data: triageData } = await supabase
        .from("ai_triage_results")
        .select("id, assessment_id, triage_level, risk_score, recommended_action, created_at")
        .in("assessment_id", assessmentIds)
        .order("created_at", { ascending: false });
      setResults(triageData ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  async function handleExplain(r: TriageResultRow) {
    setExplainLoading((prev) => ({ ...prev, [r.id]: true }));
    try {
      const { data: assessment } = await supabase
        .from("symptom_assessments")
        .select("symptoms, duration, severity, notes, vitals")
        .eq("id", r.assessment_id)
        .maybeSingle();

      const resp = await fetch("/api/triage-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triageLevel: r.triage_level,
          riskScore: r.risk_score,
          recommendedAction: r.recommended_action,
          assessment,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || `Explain request failed (${resp.status})`);
      }
      const data = (await resp.json()) as { explanation?: string };
      const explanation = (data.explanation ?? "").trim();
      if (!explanation) throw new Error("No explanation returned");
      setExplanations((prev) => ({ ...prev, [r.id]: explanation }));
    } catch (e) {
      console.error("Failed to explain triage", e);
      setExplanations((prev) => ({
        ...prev,
        [r.id]:
          "We couldn’t generate an explanation right now. Please try again later.",
      }));
    } finally {
      setExplainLoading((prev) => ({ ...prev, [r.id]: false }));
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20 flex-1 max-w-5xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My AI Triage Results</h1>
              <p className="text-sm text-muted-foreground">Your symptom assessment history</p>
            </div>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-6">
              <TableRowsSkeleton rows={6} columns={3} />
            </CardContent>
          </Card>
        ) : results.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No triage results yet</h3>
              <p className="text-muted-foreground mb-6">
                Complete a symptom assessment to see your AI triage results here.
              </p>
              <Button asChild>
                <Link to="/symptom-checker">Report Symptoms</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {results.map((r) => (
              <Card key={r.id} className="rounded-2xl border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={levelVariant(r.triage_level)}>{displayLevel(r.triage_level)}</Badge>
                      {r.risk_score != null && (
                        <span className="text-sm text-muted-foreground">
                          Risk score: <strong>{Math.round(r.risk_score)} / 100</strong>
                        </span>
                      )}
                    </div>
                    <CardDescription className="text-xs">
                      {format(new Date(r.created_at), "MMM d, yyyy h:mm a")}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {r.recommended_action && (
                    <p className="text-sm text-foreground">
                      <span className="font-medium">Recommended action:</span> {r.recommended_action}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!!explainLoading[r.id]}
                      onClick={() => handleExplain(r)}
                    >
                      {explainLoading[r.id] ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Explaining…
                        </>
                      ) : (
                        "Explain this result"
                      )}
                    </Button>
                  </div>

                  {explanations[r.id] && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                      {explanations[r.id]}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            <div className="pt-2">
              <Button asChild variant="outline">
                <Link to="/symptom-checker">
                  <Stethoscope className="w-4 h-4 mr-2" />
                  New symptom assessment
                </Link>
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
