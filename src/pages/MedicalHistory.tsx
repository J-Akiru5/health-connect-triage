import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { FileText, Loader2, ArrowLeft, Pencil, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 pt-24 pb-20">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-foreground">Medical History</h1>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Clinical Records & Maintenance</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button asChild className="rounded-xl shadow-lg shadow-primary/20 gap-2">
                <Link to="/profile">
                  <Pencil className="w-4 h-4" />
                  Edit History
                </Link>
              </Button>
            </div>
          </div>

          {loading ? (
            <Card className="border-border/50">
              <CardContent className="py-24 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
                <span className="text-muted-foreground font-medium">Retrieving medical records...</span>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-12 gap-6">
              
              {/* Conditions & Medications - Large Tiles */}
              <div className="lg:col-span-8 grid md:grid-cols-2 gap-6">
                <Card className="border-border/50 shadow-sm overflow-hidden flex flex-col">
                  <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Diagnosed Conditions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex-1">
                    {conditionsList.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-muted-foreground text-sm">No conditions recorded yet.</p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {conditionsList.map((c, i) => (
                          <li key={i} className="flex gap-3 items-start p-3 rounded-xl bg-muted/20 border border-border/50">
                            <span className="w-6 h-6 rounded-lg bg-background flex items-center justify-center text-xs font-bold text-primary border border-border/50">{i + 1}</span>
                            <span className="text-sm font-semibold text-foreground leading-tight">{c}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm overflow-hidden flex flex-col">
                  <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Current Medications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex-1">
                    {medicationsList.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-muted-foreground text-sm">No medications recorded yet.</p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {medicationsList.map((m, i) => (
                          <li key={i} className="flex gap-3 items-start p-3 rounded-xl bg-muted/20 border border-border/50">
                            <span className="w-6 h-6 rounded-lg bg-background flex items-center justify-center text-xs font-bold text-primary border border-border/50">{i + 1}</span>
                            <span className="text-sm font-semibold text-foreground leading-tight">{m}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar: Allergies & Notes */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="bg-destructive/5 pb-4 border-b border-destructive/10">
                    <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      Allergies
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {history?.allergies ? (
                      <p className="text-sm font-bold text-destructive bg-destructive/10 p-4 rounded-2xl border border-destructive/20 leading-relaxed capitalize tracking-tight">
                        {history.allergies}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm italic">None reported.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                    <CardTitle className="text-lg">Pregnancy Status</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-sm font-semibold px-4 py-2 rounded-full bg-muted w-fit">
                      {history?.pregnancy_status || "Not Applicable / Not Set"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm overflow-hidden bg-primary/5 border border-primary/10">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Clinical Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {history?.notes ? (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {history.notes}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No additional medical notes available for this patient.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-12 mt-4">
                <Button variant="outline" asChild className="rounded-xl border-2 font-bold px-8 h-12">
                  <Link to="/dashboard">Return to Dashboard</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
