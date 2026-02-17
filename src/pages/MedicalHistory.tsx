import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { FileText, Loader2, ArrowLeft, Pencil } from "lucide-react";

export default function MedicalHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<{
    conditions: string | null;
    medications: string | null;
    allergies: string | null;
    pregnancy_status: string | null;
    notes: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase.from("medical_histories").select("conditions, medications, allergies, pregnancy_status, notes").eq("user_id", user.id).maybeSingle();
      setHistory(data ?? null);
      setLoading(false);
    })();
  }, [user?.id]);

  const conditionsList = history?.conditions?.split(/[,;]\s*/).filter(Boolean) ?? [];
  const medicationsList = history?.medications?.split(/[,;]\s*/).filter(Boolean) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">My Medical History</h1>
                <p className="text-sm text-muted-foreground">Conditions, medications, and notes</p>
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
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  {conditionsList.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No conditions recorded.</p>
                  ) : (
                    <ul className="list-decimal list-inside space-y-1 text-foreground">
                      {conditionsList.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Medications</CardTitle>
                </CardHeader>
                <CardContent>
                  {medicationsList.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No medications recorded.</p>
                  ) : (
                    <ul className="list-decimal list-inside space-y-1 text-foreground">
                      {medicationsList.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {history?.allergies && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Allergies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground">{history.allergies}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                <Button asChild className="gap-2">
                  <Link to="/profile">
                    <Pencil className="w-4 h-4" />
                    Add / Update History
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/dashboard">Back to Dashboard</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
