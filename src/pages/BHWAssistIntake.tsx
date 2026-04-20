import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { calculateTriage, symptomCategories, resolveSymptomLabel } from "@/lib/symptomCategories";
import {
  Stethoscope,
  User,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Home,
  Video,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";

type TriageLevel = "emergency" | "urgent" | "non-urgent" | "home-care" | null;
const TRIAGE_TO_DB: Record<NonNullable<TriageLevel>, "emergency" | "urgent" | "non_urgent" | "home_care"> = {
  emergency: "emergency",
  urgent: "urgent",
  "non-urgent": "non_urgent",
  "home-care": "home_care",
};

const riskFactors = [
  { id: "senior", label: "Senior citizen (60+ years old)" },
  { id: "pregnant", label: "Pregnant" },
  { id: "diabetes", label: "Has diabetes" },
  { id: "hypertension", label: "Has hypertension" },
  { id: "heart-disease", label: "Has heart disease" },
  { id: "immunocompromised", label: "Immunocompromised" },
];

function getRiskScore(level: TriageLevel): number {
  if (!level) return 0;
  switch (level) {
    case "emergency": return 95;
    case "urgent": return 75;
    case "non-urgent": return 50;
    case "home-care": return 25;
    default: return 0;
  }
}
function getTriageLevelLabel(level: TriageLevel): string {
  if (!level) return "—";
  switch (level) {
    case "emergency": return "HIGH";
    case "urgent": return "HIGH";
    case "non-urgent": return "MEDIUM";
    case "home-care": return "LOW";
    default: return "—";
  }
}
const triageResults: Record<NonNullable<TriageLevel>, { title: string; action: string; icon: typeof AlertTriangle }> = {
  emergency: { title: "Emergency Care Needed", action: "Call emergency services or proceed to the nearest hospital immediately.", icon: AlertTriangle },
  urgent: { title: "Urgent Care Recommended", action: "Contact RHU or schedule teleconsultation today.", icon: AlertCircle },
  "non-urgent": { title: "Schedule a Consultation", action: "Book a teleconsultation or visit during regular clinic hours.", icon: Clock },
  "home-care": { title: "Home Care Advised", action: "Rest, stay hydrated, and monitor. Consult if symptoms worsen.", icon: Home },
};

export default function BHWAssistIntake() {
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get("patient");
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [patientId, setPatientId] = useState<string | null>(preselectedPatientId);
  const [patients, setPatients] = useState<{ user_id: string; full_name: string }[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedRiskFactors, setSelectedRiskFactors] = useState<string[]>([]);
  const [patientInfo, setPatientInfo] = useState({
    duration: "",
    severity: "" as "" | "mild" | "moderate" | "severe",
    notes: "",
    bpSystolic: "",
    bpDiastolic: "",
    hr: "",
    tempC: "",
  });
  const [triageResult, setTriageResult] = useState<TriageLevel>(null);
  const [savedAssessmentId, setSavedAssessmentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [schedulingConsult, setSchedulingConsult] = useState(false);
  const isBhw = profile?.role === "bhw";

  useEffect(() => {
    if (!user?.id || !isBhw) {
      setLoadingPatients(false);
      return;
    }
    (async () => {
      const { data: ppList } = await supabase
        .from("patient_profiles")
        .select("user_id, first_name, last_name")
        .limit(500);
      if (!ppList?.length) {
        setLoadingPatients(false);
        return;
      }
      const userIds = ppList.map((r: { user_id: string }) => r.user_id);
      const { data: profData } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const nameMap = new Map((profData ?? []).map((x: { id: string; full_name: string | null }) => [x.id, x.full_name ?? "Patient"]));
      setPatients(
        ppList.map((r: { user_id: string; first_name: string | null; last_name: string | null }) => ({
          user_id: r.user_id,
          full_name: nameMap.get(r.user_id) ?? ([r.first_name, r.last_name].filter(Boolean).join(" ") || "Patient"),
        }))
      );
      setLoadingPatients(false);
    })();
  }, [user?.id, isBhw]);

  useEffect(() => {
    if (preselectedPatientId) setPatientId(preselectedPatientId);
  }, [preselectedPatientId]);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;
  const toggleSymptom = (id: string) => setSelectedSymptoms((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleRiskFactor = (id: string) => setSelectedRiskFactors((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = async () => {
    const result = calculateTriage(selectedSymptoms, selectedRiskFactors);
    setTriageResult(result);
    setStep(4);
    if (!user?.id || !patientId || !result) return;
    setSaving(true);
    try {
      const { data: assessment, error: assessErr } = await supabase
        .from("symptom_assessments")
        .insert({
          user_id: patientId,
          reported_by: user.id,
          symptoms: selectedSymptoms,
          duration: patientInfo.duration || null,
          severity: patientInfo.severity || (result === "emergency" || result === "urgent" ? "severe" : result === "non-urgent" ? "moderate" : "mild"),
          notes: patientInfo.notes || null,
          vitals: {
            ...(patientInfo.bpSystolic && patientInfo.bpDiastolic ? { bp_systolic: Number(patientInfo.bpSystolic), bp_diastolic: Number(patientInfo.bpDiastolic) } : {}),
            ...(patientInfo.hr ? { hr: Number(patientInfo.hr) } : {}),
            ...(patientInfo.tempC ? { temp_c: Number(patientInfo.tempC) } : {}),
          },
        })
        .select("id")
        .single();
      if (assessErr) throw assessErr;
      await supabase.from("ai_triage_results").insert({
        assessment_id: assessment.id,
        risk_score: getRiskScore(result),
        triage_level: TRIAGE_TO_DB[result],
        recommended_action: triageResults[result].action,
        model_version: "rule-based-v1",
        factors: [...selectedSymptoms, ...selectedRiskFactors],
      });
      await supabase.from("bhw_activities").insert({
        bhw_id: user.id,
        patient_id: patientId,
        activity_type: "ASSISTED_INTAKE",
        notes: `Symptom intake submitted; triage: ${result}`,
      });
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "assisted_symptom_intake",
        resource: "symptom_assessments",
        details: { assessment_id: assessment.id, patient_id: patientId },
      });
      setSavedAssessmentId(assessment.id);
    } catch (e) {
      console.error("Failed to save assessment", e);
    } finally {
      setSaving(false);
    }
  };

  async function handleScheduleTeleconsultation() {
    if (!user?.id || !patientId || !savedAssessmentId || !triageResult) return;
    setSchedulingConsult(true);
    try {
      const { data: clinicians } = await supabase.from("profiles").select("id").eq("role", "clinician").limit(1);
      const providerId = clinicians?.[0]?.id;
      if (!providerId) {
        alert("No provider available. Please try again later.");
        setSchedulingConsult(false);
        return;
      }
      await supabase.from("teleconsultations").insert({
        patient_id: patientId,
        provider_id: providerId,
        assessment_id: savedAssessmentId,
        status: "scheduled",
        scheduled_at: null,
      });
      const patientName = patients.find((p) => p.user_id === patientId)?.full_name ?? "Patient";
      const bhwName = profile?.full_name ?? "BHW";
      await supabase.from("notifications").insert([
        {
          user_id: patientId,
          message: "A teleconsultation has been scheduled for you.",
          type: "system",
        },
        {
          user_id: providerId,
          message: `New teleconsultation request from patient ${patientName} assigned by BHW ${bhwName}.`,
          type: "system",
        },
      ]);
      await supabase.from("bhw_activities").insert({
        bhw_id: user.id,
        patient_id: patientId,
        activity_type: "FOLLOW_UP",
        notes: "Teleconsultation scheduled after assisted intake",
      });
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "bhw_scheduled_teleconsultation",
        resource: "teleconsultations",
        details: { patient_id: patientId },
      });
    } catch (e) {
      console.error("Failed to schedule", e);
    } finally {
      setSchedulingConsult(false);
    }
  }

  if (!user || !isBhw) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-20 text-center">
          <p className="text-muted-foreground">Access limited to Barangay Health Workers.</p>
          <Button asChild className="mt-4">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </main>
      </div>
    );
  }

  const selectedPatientName = patientId ? patients.find((p) => p.user_id === patientId)?.full_name ?? "Patient" : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-20 pb-24 flex-1 max-w-5xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Patient Symptom Reporting</h1>
              <p className="text-sm text-muted-foreground">Assisted intake for residents. Submits to AI triage.</p>
            </div>
          </div>
        </div>
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 rounded-full" />
        </div>

        {step === 1 && (
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Select patient
              </CardTitle>
              <CardDescription>Choose the patient you are assisting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingPatients ? (
                <div className="space-y-3 py-2">
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-11 w-full rounded-xl" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </div>
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ) : (
                <Select value={patientId ?? ""} onValueChange={(v) => setPatientId(v || null)}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="space-y-2">
                <Label>Duration of symptoms</Label>
                <Select
                  value={patientInfo.duration}
                  onValueChange={(val) => setPatientInfo({ ...patientInfo, duration: val })}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Just today</SelectItem>
                    <SelectItem value="days">A few days</SelectItem>
                    <SelectItem value="week">About a week</SelectItem>
                    <SelectItem value="weeks">More than a week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["mild", "moderate", "severe"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPatientInfo({ ...patientInfo, severity: s })}
                      className={`h-10 rounded-xl border text-sm font-medium capitalize transition-all ${
                        patientInfo.severity === s
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border hover:border-primary/50 text-foreground bg-background"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Optional vitals (BP / HR / Temp °C)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="BP Systolic (120)" className="rounded-xl h-11" value={patientInfo.bpSystolic} onChange={(e) => setPatientInfo({ ...patientInfo, bpSystolic: e.target.value })} />
                  <Input type="number" placeholder="BP Diastolic (80)" className="rounded-xl h-11" value={patientInfo.bpDiastolic} onChange={(e) => setPatientInfo({ ...patientInfo, bpDiastolic: e.target.value })} />
                  <Input type="number" placeholder="Heart Rate (HR)" className="rounded-xl h-11" value={patientInfo.hr} onChange={(e) => setPatientInfo({ ...patientInfo, hr: e.target.value })} />
                  <Input type="number" step="0.1" placeholder="Temperature °C" className="rounded-xl h-11" value={patientInfo.tempC} onChange={(e) => setPatientInfo({ ...patientInfo, tempC: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <p className="text-xs text-muted-foreground">
                  For joint or muscle pain, record exact side and spot if known (e.g. kanang tuhod, harap ng hità).
                </p>
                <Textarea rows={2} className="rounded-xl resize-none" value={patientInfo.notes} onChange={(e) => setPatientInfo({ ...patientInfo, notes: e.target.value })} placeholder="Additional notes…" />
              </div>
              <Button onClick={() => setStep(2)} size="lg" className="w-full rounded-xl" disabled={!patientId}>
                Continue to symptoms
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Symptoms — {selectedPatientName}</CardTitle>
              <CardDescription>Select all that apply. Useful for residents without smartphones.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {symptomCategories.map((cat) => (
                <div key={cat.name} className="space-y-2">
                  <div>
                    <h3 className="font-semibold text-sm">{cat.name}</h3>
                    {cat.description ? (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{cat.description}</p>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {cat.symptoms.map((s) => (
                      <label key={s.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${selectedSymptoms.includes(s.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                        <Checkbox checked={selectedSymptoms.includes(s.id)} onCheckedChange={() => toggleSymptom(s.id)} />
                        <span className="text-sm">{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Risk factors</CardTitle>
              <CardDescription>Select all that apply to the patient.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {riskFactors.map((f) => (
                  <label key={f.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${selectedRiskFactors.includes(f.id) ? "border-primary bg-primary/5" : "border-border"}`}>
                    <Checkbox checked={selectedRiskFactors.includes(f.id)} onCheckedChange={() => toggleRiskFactor(f.id)} />
                    <span className="text-sm">{f.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleSubmit} className="flex-1" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit & get triage result
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && triageResult && (
          <div className="space-y-6">
            <Card className="rounded-2xl border-2 border-primary/30 shadow-sm overflow-hidden">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = triageResults[triageResult].icon;
                    return <Icon className="w-6 h-6" />;
                  })()}
                  AI Triage Result — {selectedPatientName}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Risk score</p>
                    <p className="text-xl font-bold">{getRiskScore(triageResult)} / 100</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Triage level</p>
                    <p className="text-xl font-bold">{getTriageLevelLabel(triageResult)}</p>
                  </div>
                </div>
                <p className="font-medium">Recommended: {triageResults[triageResult].action}</p>
                {(selectedSymptoms.length > 0 || selectedRiskFactors.length > 0) && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Factors considered</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      These symptoms and risk factors contributed to the triage level.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSymptoms.map((id) => {
                        const label = resolveSymptomLabel(id);
                        return (
                          <span key={id} className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {label}
                          </span>
                        );
                      })}
                      {selectedRiskFactors.map((id) => {
                        const label = riskFactors.find((f) => f.id === id)?.label ?? id;
                        return (
                          <span key={`rf-${id}`} className="inline-flex items-center rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-2.5 py-0.5 text-xs font-medium">
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                {saving && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </p>
                )}
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={handleScheduleTeleconsultation} disabled={schedulingConsult} className="gap-2">
                {schedulingConsult ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                Schedule teleconsultation for patient
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
