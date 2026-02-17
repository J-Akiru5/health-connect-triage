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
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
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

type TriageLevel = "emergency" | "urgent" | "non-urgent" | "home-care" | null;
const TRIAGE_TO_DB: Record<NonNullable<TriageLevel>, "emergency" | "urgent" | "non_urgent" | "home_care"> = {
  emergency: "emergency",
  urgent: "urgent",
  "non-urgent": "non_urgent",
  "home-care": "home_care",
};

interface SymptomCategory {
  name: string;
  symptoms: { id: string; label: string; severity: number }[];
}
const symptomCategories: SymptomCategory[] = [
  { name: "General Symptoms", symptoms: [{ id: "fever", label: "Fever (lagnat)", severity: 2 }, { id: "fatigue", label: "Fatigue / Weakness (panghihina)", severity: 1 }, { id: "chills", label: "Chills (ginaw)", severity: 2 }, { id: "weight-loss", label: "Unexplained weight loss", severity: 3 }] },
  { name: "Respiratory", symptoms: [{ id: "cough", label: "Cough (ubo)", severity: 1 }, { id: "difficulty-breathing", label: "Difficulty breathing (hirap huminga)", severity: 5 }, { id: "chest-pain", label: "Chest pain (sakit ng dibdib)", severity: 5 }, { id: "sore-throat", label: "Sore throat (namamagang lalamunan)", severity: 1 }] },
  { name: "Pain", symptoms: [{ id: "headache", label: "Headache (sakit ng ulo)", severity: 1 }, { id: "severe-headache", label: "Severe / Sudden headache", severity: 4 }, { id: "abdominal-pain", label: "Abdominal pain (sakit ng tiyan)", severity: 2 }, { id: "joint-pain", label: "Joint / Muscle pain", severity: 1 }] },
  { name: "Digestive", symptoms: [{ id: "nausea", label: "Nausea / Vomiting (pagsusuka)", severity: 2 }, { id: "diarrhea", label: "Diarrhea (pagtatae)", severity: 2 }, { id: "blood-stool", label: "Blood in stool", severity: 4 }, { id: "loss-appetite", label: "Loss of appetite", severity: 1 }] },
  { name: "Emergency Signs", symptoms: [{ id: "unconscious", label: "Loss of consciousness (nawalan ng malay)", severity: 5 }, { id: "severe-bleeding", label: "Severe bleeding (matinding pagdurugo)", severity: 5 }, { id: "seizure", label: "Seizure / Convulsions (kombulsyon)", severity: 5 }, { id: "confusion", label: "Sudden confusion / Disorientation", severity: 5 }] },
];
const riskFactors = [
  { id: "senior", label: "Senior citizen (60+ years old)" },
  { id: "pregnant", label: "Pregnant" },
  { id: "diabetes", label: "Has diabetes" },
  { id: "hypertension", label: "Has hypertension" },
  { id: "heart-disease", label: "Has heart disease" },
  { id: "immunocompromised", label: "Immunocompromised" },
];

function calculateTriage(selectedSymptoms: string[], selectedRiskFactors: string[]): TriageLevel {
  let totalSeverity = 0;
  symptomCategories.forEach((cat) => {
    cat.symptoms.forEach((s) => {
      if (selectedSymptoms.includes(s.id)) totalSeverity += s.severity;
    });
  });
  const emergencySymptoms = ["difficulty-breathing", "chest-pain", "unconscious", "severe-bleeding", "seizure", "confusion"];
  if (selectedSymptoms.some((s) => emergencySymptoms.includes(s))) return "emergency";
  totalSeverity += selectedRiskFactors.length * 1.5;
  if (totalSeverity >= 8) return "urgent";
  if (totalSeverity >= 4) return "non-urgent";
  if (totalSeverity >= 1) return "home-care";
  return null;
}
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
      const { data: p } = await supabase.from("profiles").select("assigned_barangay_id").eq("id", user.id).single();
      const barangayId = (p as { assigned_barangay_id?: string } | null)?.assigned_barangay_id;
      if (!barangayId) {
        setLoadingPatients(false);
        return;
      }
      const { data: ppList } = await supabase.from("patient_profiles").select("user_id, first_name, last_name").eq("barangay_id", barangayId);
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
          full_name: nameMap.get(r.user_id) ?? [r.first_name, r.last_name].filter(Boolean).join(" ") || "Patient",
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
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20 max-w-3xl">
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Select patient</CardTitle>
              <CardDescription>Choose the patient you are assisting. They must be in your assigned barangay.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingPatients ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading patients…
                </div>
              ) : (
                <Select value={patientId ?? ""} onValueChange={(v) => setPatientId(v || null)}>
                  <SelectTrigger>
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
                <select
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground"
                  value={patientInfo.duration}
                  onChange={(e) => setPatientInfo({ ...patientInfo, duration: e.target.value })}
                >
                  <option value="">Select</option>
                  <option value="today">Just today</option>
                  <option value="days">A few days</option>
                  <option value="week">About a week</option>
                  <option value="weeks">More than a week</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <div className="flex flex-wrap gap-4">
                  {(["mild", "moderate", "severe"] as const).map((s) => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="severity" checked={patientInfo.severity === s} onChange={() => setPatientInfo({ ...patientInfo, severity: s })} className="rounded-full border-input" />
                      <span className="capitalize">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Optional vitals (BP / HR / Temp °C)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="BP 120" className="h-10 px-3 rounded-lg border border-input bg-background text-foreground" value={patientInfo.bpSystolic} onChange={(e) => setPatientInfo({ ...patientInfo, bpSystolic: e.target.value })} />
                  <input type="number" placeholder="80" className="h-10 px-3 rounded-lg border border-input bg-background text-foreground" value={patientInfo.bpDiastolic} onChange={(e) => setPatientInfo({ ...patientInfo, bpDiastolic: e.target.value })} />
                  <input type="number" placeholder="HR" className="h-10 px-3 rounded-lg border border-input bg-background text-foreground" value={patientInfo.hr} onChange={(e) => setPatientInfo({ ...patientInfo, hr: e.target.value })} />
                  <input type="number" step="0.1" placeholder="Temp" className="h-10 px-3 rounded-lg border border-input bg-background text-foreground" value={patientInfo.tempC} onChange={(e) => setPatientInfo({ ...patientInfo, tempC: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <textarea rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" value={patientInfo.notes} onChange={(e) => setPatientInfo({ ...patientInfo, notes: e.target.value })} placeholder="Additional notes…" />
              </div>
              <Button onClick={() => setStep(2)} size="lg" className="w-full" disabled={!patientId}>
                Continue to symptoms
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Symptoms (for {selectedPatientName})</CardTitle>
              <CardDescription>Select all that apply.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {symptomCategories.map((cat) => (
                <div key={cat.name}>
                  <h3 className="font-semibold text-sm mb-2">{cat.name}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {cat.symptoms.map((s) => (
                      <label key={s.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${selectedSymptoms.includes(s.id) ? "border-primary bg-primary/5" : "border-border"}`}>
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
          <Card>
            <CardHeader>
              <CardTitle>Risk factors</CardTitle>
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
            <Card className="border-2 border-primary/30">
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
    </div>
  );
}
