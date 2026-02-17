import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, AlertCircle, Clock, Home, ArrowRight, ArrowLeft, Stethoscope, User, Calendar, Loader2 } from "lucide-react";

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
  {
    name: "General Symptoms",
    symptoms: [
      { id: "fever", label: "Fever (lagnat)", severity: 2 },
      { id: "fatigue", label: "Fatigue / Weakness (panghihina)", severity: 1 },
      { id: "chills", label: "Chills (ginaw)", severity: 2 },
      { id: "weight-loss", label: "Unexplained weight loss", severity: 3 },
    ],
  },
  {
    name: "Respiratory",
    symptoms: [
      { id: "cough", label: "Cough (ubo)", severity: 1 },
      { id: "difficulty-breathing", label: "Difficulty breathing (hirap huminga)", severity: 5 },
      { id: "chest-pain", label: "Chest pain (sakit ng dibdib)", severity: 5 },
      { id: "sore-throat", label: "Sore throat (namamagang lalamunan)", severity: 1 },
    ],
  },
  {
    name: "Pain",
    symptoms: [
      { id: "headache", label: "Headache (sakit ng ulo)", severity: 1 },
      { id: "severe-headache", label: "Severe / Sudden headache", severity: 4 },
      { id: "abdominal-pain", label: "Abdominal pain (sakit ng tiyan)", severity: 2 },
      { id: "joint-pain", label: "Joint / Muscle pain", severity: 1 },
    ],
  },
  {
    name: "Digestive",
    symptoms: [
      { id: "nausea", label: "Nausea / Vomiting (pagsusuka)", severity: 2 },
      { id: "diarrhea", label: "Diarrhea (pagtatae)", severity: 2 },
      { id: "blood-stool", label: "Blood in stool", severity: 4 },
      { id: "loss-appetite", label: "Loss of appetite", severity: 1 },
    ],
  },
  {
    name: "Emergency Signs",
    symptoms: [
      { id: "unconscious", label: "Loss of consciousness (nawalan ng malay)", severity: 5 },
      { id: "severe-bleeding", label: "Severe bleeding (matinding pagdurugo)", severity: 5 },
      { id: "seizure", label: "Seizure / Convulsions (kombulsyon)", severity: 5 },
      { id: "confusion", label: "Sudden confusion / Disorientation", severity: 5 },
    ],
  },
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
  
  symptomCategories.forEach(category => {
    category.symptoms.forEach(symptom => {
      if (selectedSymptoms.includes(symptom.id)) {
        totalSeverity += symptom.severity;
      }
    });
  });

  // Emergency symptoms override
  const emergencySymptoms = ["difficulty-breathing", "chest-pain", "unconscious", "severe-bleeding", "seizure", "confusion"];
  if (selectedSymptoms.some(s => emergencySymptoms.includes(s))) {
    return "emergency";
  }

  // Add risk factor weight
  const riskWeight = selectedRiskFactors.length * 1.5;
  totalSeverity += riskWeight;

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

const triageResults = {
  emergency: {
    title: "Emergency Care Needed",
    icon: AlertTriangle,
    color: "text-emergency",
    bgColor: "bg-emergency",
    borderColor: "border-emergency",
    description: "Your symptoms indicate a potentially serious condition that requires immediate medical attention.",
    action: "Call emergency services or proceed to the nearest hospital immediately.",
    contact: "Emergency Hotline: 0917-123-4567",
  },
  urgent: {
    title: "Urgent Care Recommended",
    icon: AlertCircle,
    color: "text-urgent",
    bgColor: "bg-urgent",
    borderColor: "border-urgent",
    description: "Your symptoms suggest you should see a healthcare provider within the next few hours.",
    action: "Contact your Barangay Health Worker or visit the Rural Health Unit today.",
    contact: "RHU Hotline: 0917-234-5678",
  },
  "non-urgent": {
    title: "Schedule a Consultation",
    icon: Clock,
    color: "text-non-urgent",
    bgColor: "bg-non-urgent",
    borderColor: "border-non-urgent",
    description: "Your symptoms are not immediately concerning, but you should schedule a consultation for proper evaluation.",
    action: "Book a teleconsultation or visit during regular clinic hours.",
    contact: "Book via app or call: 0917-345-6789",
  },
  "home-care": {
    title: "Home Care Advised",
    icon: Home,
    color: "text-home-care",
    bgColor: "bg-home-care",
    borderColor: "border-home-care",
    description: "Your symptoms can likely be managed at home with proper rest and care.",
    action: "Rest, stay hydrated, and monitor your symptoms. Consult if symptoms worsen.",
    contact: "Questions? Message your BHW: 0917-456-7890",
  },
};

export default function SymptomChecker() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedRiskFactors, setSelectedRiskFactors] = useState<string[]>([]);
  const [triageResult, setTriageResult] = useState<TriageLevel>(null);
  const [patientInfo, setPatientInfo] = useState({
    name: "",
    age: "",
    duration: "",
    durationDays: "",
    severity: "" as "" | "mild" | "moderate" | "severe",
    notes: "",
    bpSystolic: "",
    bpDiastolic: "",
    hr: "",
    tempC: "",
  });
  const [savedAssessmentId, setSavedAssessmentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [requestingConsult, setRequestingConsult] = useState(false);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;
  const isPatient = profile?.role === "patient";

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptomId)
        ? prev.filter(id => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const toggleRiskFactor = (factorId: string) => {
    setSelectedRiskFactors(prev =>
      prev.includes(factorId)
        ? prev.filter(id => id !== factorId)
        : [...prev, factorId]
    );
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    const result = calculateTriage(selectedSymptoms, selectedRiskFactors);
    setTriageResult(result);
    setStep(4);
    if (user?.id && result) {
      setSaving(true);
      try {
        const { data: assessment, error: assessErr } = await supabase
          .from("symptom_assessments")
          .insert({
            user_id: user.id,
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
          triage_level: TRIAGE_TO_DB[result],
          recommended_action: triageResults[result].action,
          model_version: "rule-based-v1",
          factors: [...selectedSymptoms, ...selectedRiskFactors],
        });
        setSavedAssessmentId(assessment.id);
      } catch (e) {
        console.error("Failed to save assessment", e);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedSymptoms([]);
    setSelectedRiskFactors([]);
    setTriageResult(null);
    setPatientInfo({ name: "", age: "", duration: "", durationDays: "", severity: "", notes: "", bpSystolic: "", bpDiastolic: "", hr: "", tempC: "" });
    setSavedAssessmentId(null);
  };

  async function handleRequestTeleconsultation() {
    if (!user?.id || !savedAssessmentId || !triageResult) return;
    setRequestingConsult(true);
    try {
      const { data: clinicians } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "clinician")
        .limit(1);
      const providerId = clinicians?.[0]?.id;
      if (!providerId) {
        alert("No provider is available at the moment. Please try again later or contact your BHW.");
        setRequestingConsult(false);
        return;
      }
      await supabase.from("teleconsultations").insert({
        patient_id: user.id,
        provider_id: providerId,
        assessment_id: savedAssessmentId,
        status: "scheduled",
        scheduled_at: null,
      });
      navigate("/consultations");
    } catch (e) {
      console.error("Failed to request teleconsultation", e);
      alert("Could not submit request. Please try again.");
    } finally {
      setRequestingConsult(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <Card className="animate-fade-in">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Report Symptoms</CardTitle>
                <CardDescription>
                  Date: {new Date().toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })} — This helps us provide accurate triage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Patient Name (Pangalan)</Label>
                  <input
                    id="name"
                    type="text"
                    className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Juan dela Cruz"
                    value={patientInfo.name}
                    onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age (Edad)</Label>
                  <input
                    id="age"
                    type="number"
                    className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="45"
                    value={patientInfo.age}
                    onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">How long have you had symptoms? (Gaano katagal?)</Label>
                  <select
                    id="duration"
                    className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    value={patientInfo.duration}
                    onChange={(e) => setPatientInfo({ ...patientInfo, duration: e.target.value })}
                  >
                    <option value="">Select duration</option>
                    <option value="today">Just started today</option>
                    <option value="days">A few days</option>
                    <option value="week">About a week</option>
                    <option value="weeks">More than a week</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Duration (days)</Label>
                  <input
                    type="number"
                    min="0"
                    className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. 3"
                    value={patientInfo.durationDays}
                    onChange={(e) => setPatientInfo({ ...patientInfo, durationDays: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <div className="flex flex-wrap gap-4">
                    {(["mild", "moderate", "severe"] as const).map((s) => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="severity"
                          checked={patientInfo.severity === s}
                          onChange={() => setPatientInfo({ ...patientInfo, severity: s })}
                          className="rounded-full border-input"
                        />
                        <span className="capitalize">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 rounded-lg border border-border p-4">
                  <Label className="text-muted-foreground">Optional vitals</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">BP (mmHg)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          placeholder="120"
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-sm"
                          value={patientInfo.bpSystolic}
                          onChange={(e) => setPatientInfo({ ...patientInfo, bpSystolic: e.target.value })}
                        />
                        <span className="text-muted-foreground">/</span>
                        <input
                          type="number"
                          placeholder="80"
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-sm"
                          value={patientInfo.bpDiastolic}
                          onChange={(e) => setPatientInfo({ ...patientInfo, bpDiastolic: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">HR (bpm)</Label>
                      <input
                        type="number"
                        placeholder="72"
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-sm mt-1"
                        value={patientInfo.hr}
                        onChange={(e) => setPatientInfo({ ...patientInfo, hr: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Temp (°C)</Label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="36.5"
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-sm mt-1"
                        value={patientInfo.tempC}
                        onChange={(e) => setPatientInfo({ ...patientInfo, tempC: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional notes</Label>
                  <textarea
                    id="notes"
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Any other details..."
                    value={patientInfo.notes}
                    onChange={(e) => setPatientInfo({ ...patientInfo, notes: e.target.value })}
                  />
                </div>
                <Button onClick={handleNext} size="lg" className="w-full">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Symptoms */}
          {step === 2 && (
            <Card className="animate-fade-in">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Stethoscope className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">What symptoms are you experiencing?</CardTitle>
                <CardDescription>
                  Select all that apply. This helps our AI assess the urgency of your condition.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {symptomCategories.map((category) => (
                  <div key={category.name} className="space-y-3">
                    <h3 className="font-semibold text-foreground">{category.name}</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {category.symptoms.map((symptom) => (
                        <label
                          key={symptom.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedSymptoms.includes(symptom.id)
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Checkbox
                            checked={selectedSymptoms.includes(symptom.id)}
                            onCheckedChange={() => toggleSymptom(symptom.id)}
                          />
                          <span className="text-sm">{symptom.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleBack} variant="outline" size="lg">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button onClick={handleNext} size="lg" className="flex-1">
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Risk Factors */}
          {step === 3 && (
            <Card className="animate-fade-in">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Do any of these apply to you?</CardTitle>
                <CardDescription>
                  Risk factors help us better assess your condition. Select all that apply.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  {riskFactors.map((factor) => (
                    <label
                      key={factor.id}
                      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedRiskFactors.includes(factor.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Checkbox
                        checked={selectedRiskFactors.includes(factor.id)}
                        onCheckedChange={() => toggleRiskFactor(factor.id)}
                      />
                      <span className="text-sm">{factor.label}</span>
                    </label>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleBack} variant="outline" size="lg">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button onClick={handleSubmit} variant="hero" size="lg" className="flex-1">
                    Get Triage Result
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Results */}
          {step === 4 && triageResult && (
            <div className="animate-fade-in space-y-6">
              <Card className={`border-2 ${triageResults[triageResult].borderColor}`}>
                <CardHeader className={`${triageResults[triageResult].bgColor} text-primary-foreground`}>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = triageResults[triageResult].icon;
                      return <Icon className="w-8 h-8" />;
                    })()}
                    <CardTitle className="text-2xl">AI Triage Result</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Risk Score</p>
                      <p className="text-2xl font-bold text-foreground">{getRiskScore(triageResult)} / 100</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Triage Level</p>
                      <p className="text-2xl font-bold text-foreground">{getTriageLevelLabel(triageResult)}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary">
                    <h4 className="font-semibold text-foreground mb-2">Recommended Action</h4>
                    <p className="text-foreground">→ {triageResults[triageResult].action}</p>
                    {triageResult === "urgent" && <p className="text-foreground mt-1">→ Contact BHW for Assistance</p>}
                  </div>
                  {selectedSymptoms.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Symptom Summary</h4>
                      <p className="text-muted-foreground">
                        {selectedSymptoms
                          .map((id) => symptomCategories.flatMap((c) => c.symptoms).find((s) => s.id === id)?.label)
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  )}
                  <p className="text-foreground">
                    {triageResults[triageResult].description}
                  </p>

                  <div className="p-4 rounded-lg border border-border">
                    <h4 className="font-semibold text-foreground mb-2">Contact Information</h4>
                    <p className="text-primary font-medium">
                      {triageResults[triageResult].contact}
                    </p>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Disclaimer:</strong> This AI-assisted triage is for guidance only and does not replace professional medical diagnosis. Always consult a healthcare provider for proper evaluation.
                    </p>
                  </div>
                  {saving && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving your assessment…
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-3">
                {isPatient && user ? (
                  <Button
                    size="lg"
                    className="flex-1 min-w-[180px]"
                    onClick={handleRequestTeleconsultation}
                    disabled={requestingConsult || !savedAssessmentId}
                  >
                    {requestingConsult ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Requesting…
                      </>
                    ) : (
                      "Request Teleconsultation"
                    )}
                  </Button>
                ) : (
                  <Button size="lg" className="flex-1 min-w-[180px]" asChild>
                    <Link to="/consultations">Request Teleconsultation</Link>
                  </Button>
                )}
                <Button variant="outline" size="lg" asChild>
                  <Link to={user ? "/dashboard" : "/"}>Back to Dashboard</Link>
                </Button>
              </div>
            </div>
          )}

          {step === 4 && !triageResult && (
            <Card className="animate-fade-in">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Stethoscope className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No Symptoms Selected</h3>
                <p className="text-muted-foreground mb-6">
                  Please go back and select at least one symptom to receive a triage assessment.
                </p>
                <Button onClick={() => setStep(2)} size="lg">
                  <ArrowLeft className="w-4 h-4" />
                  Go Back to Symptoms
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
