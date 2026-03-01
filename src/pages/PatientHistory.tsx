import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, FileText, Loader2, User, Stethoscope, MessageSquare, ArrowRightLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

type VisitItem =
  | { type: "triage"; date: string; triageLevel: string; reportedBy: string | null; assessmentId: string }
  | { type: "consultation"; date: string; id: string; status: string; providerName: string | null }
  | { type: "referral"; date: string; id: string; facilityName: string; urgency: string; status: string };

export default function PatientHistory() {
  const { user, profile } = useAuth();
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [patientProfile, setPatientProfile] = useState<{
    first_name: string | null;
    last_name: string | null;
    date_of_birth: string | null;
  } | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<{
    conditions: string | null;
    medications: string | null;
    allergies: string | null;
    notes: string | null;
  } | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [visitHistory, setVisitHistory] = useState<VisitItem[]>([]);

  useEffect(() => {
    if (!user?.id || profile?.role !== "clinician") {
      setLoadingPatients(false);
      return;
    }
    (async () => {
      const { data: consults } = await supabase
        .from("teleconsultations")
        .select("patient_id")
        .eq("provider_id", user.id);
      const ids = [...new Set((consults ?? []).map((c: { patient_id: string }) => c.patient_id))];
      if (ids.length === 0) {
        setPatients([]);
        setLoadingPatients(false);
        return;
      }
      const { data: profData } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const list = (profData ?? []).map((p: { id: string; full_name: string | null }) => ({ id: p.id, name: p.full_name ?? "Patient" }));
      setPatients(list);
      setLoadingPatients(false);
    })();
  }, [user?.id, profile?.role]);

  useEffect(() => {
    if (!selectedPatientId) {
      setPatientProfile(null);
      setMedicalHistory(null);
      setVisitHistory([]);
      return;
    }
    setLoadingDetail(true);
    (async () => {
      const [ppRes, mhRes] = await Promise.all([
        supabase.from("patient_profiles").select("first_name, last_name, date_of_birth").eq("user_id", selectedPatientId).maybeSingle(),
        supabase.from("medical_histories").select("conditions, medications, allergies, notes").eq("user_id", selectedPatientId).maybeSingle(),
      ]);
      setPatientProfile(ppRes.data as typeof patientProfile);
      setMedicalHistory(mhRes.data as typeof medicalHistory);

      const items: VisitItem[] = [];

      const { data: assessments } = await supabase
        .from("symptom_assessments")
        .select("id, created_at, reported_by")
        .eq("user_id", selectedPatientId)
        .order("created_at", { ascending: false });
      const assessmentIds = (assessments ?? []).map((a: { id: string }) => a.id);
      const reportedByIds = [...new Set((assessments ?? []).map((a: { reported_by: string | null }) => a.reported_by).filter(Boolean))] as string[];

      let reporterNames: Map<string, string> = new Map();
      if (reportedByIds.length > 0) {
        const { data: reporters } = await supabase.from("profiles").select("id, full_name").in("id", reportedByIds);
        reporterNames = new Map((reporters ?? []).map((r: { id: string; full_name: string | null }) => [r.id, r.full_name ?? "Staff"]));
      }

      if (assessmentIds.length > 0) {
        const { data: triageRows } = await supabase
          .from("ai_triage_results")
          .select("assessment_id, triage_level, created_at")
          .in("assessment_id", assessmentIds);
        const assessMap = new Map((assessments ?? []).map((a: { id: string; created_at: string; reported_by: string | null }) => [a.id, { created_at: a.created_at, reported_by: a.reported_by }]));
        (triageRows ?? []).forEach((t: { assessment_id: string; triage_level: string; created_at: string }) => {
          const a = assessMap.get(t.assessment_id);
          items.push({
            type: "triage",
            date: t.created_at,
            triageLevel: t.triage_level,
            reportedBy: a?.reported_by ? reporterNames.get(a.reported_by) ?? null : null,
            assessmentId: t.assessment_id,
          });
        });
      }

      const { data: consults } = await supabase
        .from("teleconsultations")
        .select("id, created_at, status, provider_id")
        .eq("patient_id", selectedPatientId)
        .order("created_at", { ascending: false });
      const providerIds = [...new Set((consults ?? []).map((c: { provider_id: string }) => c.provider_id))];
      let providerNames: Map<string, string> = new Map();
      if (providerIds.length > 0) {
        const { data: provs } = await supabase.from("profiles").select("id, full_name").in("id", providerIds);
        providerNames = new Map((provs ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Provider"]));
      }
      (consults ?? []).forEach((c: { id: string; created_at: string; status: string; provider_id: string }) => {
        items.push({
          type: "consultation",
          date: c.created_at,
          id: c.id,
          status: c.status,
          providerName: providerNames.get(c.provider_id) ?? null,
        });
      });

      const { data: refs } = await supabase
        .from("referrals")
        .select("id, created_at, facility_name, urgency, status")
        .eq("patient_id", selectedPatientId)
        .order("created_at", { ascending: false });
      (refs ?? []).forEach((r: { id: string; created_at: string; facility_name: string; urgency: string; status: string }) => {
        items.push({
          type: "referral",
          date: r.created_at,
          id: r.id,
          facilityName: r.facility_name,
          urgency: r.urgency,
          status: r.status,
        });
      });

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setVisitHistory(items);
      setLoadingDetail(false);
    })();
  }, [selectedPatientId]);

  const patientName = patients.find((p) => p.id === selectedPatientId)?.name ?? "Patient";
  const conditionsList = medicalHistory?.conditions?.split("\n").filter(Boolean) ?? [];
  const medicationsList = medicalHistory?.medications?.split("\n").filter(Boolean) ?? [];

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
      <main className="container mx-auto px-4 pt-24 pb-20 max-w-2xl">
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
              <h1 className="text-2xl font-bold text-foreground">Patient Medical History</h1>
              <p className="text-sm text-muted-foreground">View patient conditions and medications</p>
            </div>
          </div>
        </div>

        {loadingPatients ? (
          <Card>
            <CardContent className="py-12 flex items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading patients…</span>
            </CardContent>
          </Card>
        ) : patients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No assigned patients yet.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Select patient</CardTitle>
                <CardDescription>Choose a patient to view their medical history</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedPatientId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {patientProfile?.first_name || patientProfile?.last_name
                      ? [patientProfile.first_name, patientProfile.last_name].filter(Boolean).join(" ")
                      : patientName}
                  </CardTitle>
                  <CardDescription>
                    DOB: {patientProfile?.date_of_birth ? format(new Date(patientProfile.date_of_birth), "yyyy-MM-dd") : "—"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {loadingDetail ? (
                    <div className="flex items-center justify-center py-8 gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">Loading…</span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Conditions</h3>
                        {conditionsList.length === 0 ? (
                          <p className="text-sm text-muted-foreground">None recorded.</p>
                        ) : (
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {conditionsList.map((line, i) => (
                              <li key={i}>{line}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Medications</h3>
                        {medicationsList.length === 0 ? (
                          <p className="text-sm text-muted-foreground">None recorded.</p>
                        ) : (
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {medicationsList.map((line, i) => (
                              <li key={i}>{line}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {medicalHistory?.allergies && (
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">Allergies</h3>
                          <p className="text-sm text-muted-foreground">{medicalHistory.allergies}</p>
                        </div>
                      )}
                      {medicalHistory?.notes && (
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">Notes</h3>
                          <p className="text-sm text-muted-foreground">{medicalHistory.notes}</p>
                        </div>
                      )}
                      <div className="pt-4 flex gap-3">
                        <Button variant="outline" size="sm">
                          Add / Update history
                        </Button>
                        <Button variant="ghost" asChild>
                          <Link to="/dashboard">Back to Dashboard</Link>
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {selectedPatientId && !loadingDetail && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Visit history</CardTitle>
                  <CardDescription>
                    Triage events, consultations, and referrals for this patient. Newest first.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {visitHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No visits recorded yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {visitHistory.map((item) => {
                        const dateStr = format(new Date(item.date), "MMM d, yyyy · h:mm a");
                        if (item.type === "triage") {
                          const levelLabel = item.triageLevel === "emergency" || item.triageLevel === "urgent" ? "High" : item.triageLevel === "non_urgent" ? "Moderate" : "Low";
                          return (
                            <li key={`triage-${item.assessmentId}`} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Stethoscope className="w-4 h-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-foreground">Triage</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {dateStr}
                                    {item.reportedBy ? ` · ${item.reportedBy}` : ""} · {levelLabel}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={item.triageLevel === "emergency" || item.triageLevel === "urgent" ? "destructive" : "secondary"} className="shrink-0">
                                {levelLabel}
                              </Badge>
                            </li>
                          );
                        }
                        if (item.type === "consultation") {
                          return (
                            <li key={`consultation-${item.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <MessageSquare className="w-4 h-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-foreground">Consultation</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {dateStr} · {item.providerName ?? "Provider"} · {item.status}
                                  </p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" asChild className="shrink-0 gap-1">
                                <Link to={`/consultations/${item.id}/chat`}>
                                  Open chat
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                              </Button>
                            </li>
                          );
                        }
                        return (
                          <li key={`referral-${item.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <ArrowRightLeft className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm text-foreground">Referral</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {dateStr} · {item.facilityName} · {item.urgency} · {item.status}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="shrink-0">{item.status}</Badge>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
