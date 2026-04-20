import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { symptomCategories, EMERGENCY_SYMPTOM_IDS, resolveSymptomLabel } from "@/lib/symptomCategories";
import { AlertTriangle, AlertCircle, Clock, Home, ArrowRight, ArrowLeft, Stethoscope, User, Calendar, Loader2 } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO, format } from "date-fns";

type TriageLevel = "emergency" | "urgent" | "non-urgent" | "home-care" | null;

type UserSymptomSeverity = "mild" | "moderate" | "severe";
type SymptomDurationValue = "" | "today" | "days" | "week" | "weeks";

type SymptomDetailEntry = {
  duration: SymptomDurationValue;
  severity: UserSymptomSeverity;
};

const PENDING_ASSESSMENT_LS_KEY = "bhc_pending_symptom_assessment_id";

const DURATION_OPTIONS: { value: SymptomDurationValue; label: string }[] = [
  { value: "", label: "Select how long" },
  { value: "today", label: "Just started today" },
  { value: "days", label: "A few days" },
  { value: "week", label: "About a week" },
  { value: "weeks", label: "More than a week" },
];

const TRIAGE_TO_DB: Record<NonNullable<TriageLevel>, "emergency" | "urgent" | "non_urgent" | "home_care"> = {
  emergency: "emergency",
  urgent: "urgent",
  "non-urgent": "non_urgent",
  "home-care": "home_care",
};

const EMERGENCY_SYMPTOM_SET = new Set<string>(EMERGENCY_SYMPTOM_IDS);

const riskFactors = [
  { id: "senior", label: "Senior citizen (60+ years old)" },
  { id: "pregnant", label: "Pregnant" },
  { id: "diabetes", label: "Has diabetes" },
  { id: "hypertension", label: "Has hypertension" },
  { id: "heart-disease", label: "Has heart disease" },
  { id: "immunocompromised", label: "Immunocompromised" },
];

function computeAgeFromBirthday(birthday: string): number | null {
  if (!birthday) return null;
  const [y, m, d] = birthday.split("-").map((v) => Number(v));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return null;

  const birthDate = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(birthDate.getTime())) return null;

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (birthDate > today) return null;

  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const hasHadBirthdayThisYear =
    today.getUTCMonth() > birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() >= birthDate.getUTCDate());
  if (!hasHadBirthdayThisYear) age -= 1;

  if (!Number.isFinite(age) || age < 0 || age > 130) return null;
  return age;
}

function userSeverityWeight(sev: UserSymptomSeverity | undefined): number {
  if (sev === "mild") return 0.75;
  if (sev === "severe") return 1.35;
  return 1;
}

function durationWeight(dur: SymptomDurationValue | undefined): number {
  if (dur === "today") return 0.92;
  if (dur === "days") return 1;
  if (dur === "week") return 1.12;
  if (dur === "weeks") return 1.28;
  return 1;
}

type TriageComputation = {
  level: TriageLevel;
  /** Sum of weighted symptom scores only (before risk factors). */
  symptomScore: number;
  /** Points added from risk factors (1.5 each). */
  riskPoints: number;
  /** symptomScore + riskPoints; used for non-emergency levels. */
  combinedScore: number;
  emergencySymptomIds: string[];
};

function computeTriageAssessment(
  selectedSymptoms: string[],
  selectedRiskFactors: string[],
  symptomDetails: Record<string, SymptomDetailEntry>
): TriageComputation {
  let symptomScore = 0;

  symptomCategories.forEach((category) => {
    category.symptoms.forEach((symptom) => {
      if (selectedSymptoms.includes(symptom.id)) {
        const d = symptomDetails[symptom.id];
        const uw = userSeverityWeight(d?.severity);
        const dw = durationWeight(d?.duration);
        symptomScore += symptom.severity * uw * dw;
      }
    });
  });

  const emergencySymptomIds = selectedSymptoms.filter((s) => EMERGENCY_SYMPTOM_SET.has(s));
  if (emergencySymptomIds.length > 0) {
    return {
      level: "emergency",
      symptomScore,
      riskPoints: 0,
      combinedScore: symptomScore,
      emergencySymptomIds,
    };
  }

  const riskPoints = selectedRiskFactors.length * 1.5;
  const combinedScore = symptomScore + riskPoints;

  if (combinedScore >= 8) {
    return { level: "urgent", symptomScore, riskPoints, combinedScore, emergencySymptomIds: [] };
  }
  if (combinedScore >= 4) {
    return { level: "non-urgent", symptomScore, riskPoints, combinedScore, emergencySymptomIds: [] };
  }
  if (combinedScore >= 1) {
    return { level: "home-care", symptomScore, riskPoints, combinedScore, emergencySymptomIds: [] };
  }

  return { level: null, symptomScore, riskPoints, combinedScore, emergencySymptomIds: [] };
}

function formatTriageReasonLine(
  computation: TriageComputation,
  selectedRiskFactors: string[],
  riskFactorDefs: { id: string; label: string }[]
): string {
  const { level, symptomScore, riskPoints, combinedScore, emergencySymptomIds } = computation;
  if (!level) {
    return "";
  }

  if (level === "emergency" && emergencySymptomIds.length > 0) {
    const names = emergencySymptomIds.map((id) => resolveSymptomLabel(id)).join(", ");
    return [
      "This result is from our built-in rule engine (not a medical diagnosis).",
      `We assigned emergency priority because you reported one or more symptoms that our rules always treat as highest urgency, regardless of the numeric score: ${names}.`,
      "If you feel unsafe, symptoms are rapidly worsening, or you have severe trouble breathing, chest pain, confusion, or fainting: seek emergency care now.",
    ].join(" ");
  }

  const riskLabels = selectedRiskFactors
    .map((id) => riskFactorDefs.find((r) => r.id === id)?.label ?? id)
    .filter(Boolean);
  const riskSentence =
    riskLabels.length > 0
      ? `Risk factors selected (${riskLabels.join("; ")}) added ${riskPoints.toFixed(1)} points to the total.`
      : "No additional risk factors were selected, so no extra points were added.";

  const scoreRounded = Math.round(combinedScore * 10) / 10;
  const symptomRounded = Math.round(symptomScore * 10) / 10;

  if (level === "urgent") {
    return [
      "This result is from our built-in rule engine (not a diagnosis).",
      `Your selected symptoms were scored using weights, then adjusted by duration and how severe they feel (${symptomRounded} points from symptoms).`,
      riskSentence,
      `Your combined score is ${scoreRounded}. In our rules, **Urgent** is triggered at 8 points or higher.`,
      "Recommended next step: contact your BHW/RHU or schedule a consult today. If symptoms worsen quickly or you develop danger signs (severe breathing difficulty, chest pain, confusion, fainting), seek emergency care.",
    ].join(" ");
  }
  if (level === "non-urgent") {
    return [
      "This result is from our built-in rule engine (not a diagnosis).",
      `Your selected symptoms were scored using weights, then adjusted by duration and how severe they feel (${symptomRounded} points from symptoms).`,
      riskSentence,
      `Your combined score is ${scoreRounded}. In our rules, **Non-Urgent** is the 4 up to (but not including) 8 range—so a routine consultation is suggested rather than immediate emergency care.`,
      "Monitor your symptoms and book a consult if they persist, interfere with daily activities, or you feel concerned. Seek urgent/emergency care if you develop danger signs (severe breathing difficulty, chest pain, confusion, fainting, uncontrolled bleeding).",
    ].join(" ");
  }
  return [
    "This result is from our built-in rule engine (not a diagnosis).",
    `Your selected symptoms were scored using weights, then adjusted by duration and how severe they feel (${symptomRounded} points from symptoms).`,
    riskSentence,
    `Your combined score is ${scoreRounded}. In our rules, **Home Care** is the 1 up to (but not including) 4 range—so rest, hydration, and monitoring are suggested for now.`,
    "What to watch for: worsening fever, increasing pain, trouble breathing, dehydration (very little urine, dizziness), persistent vomiting, or new severe symptoms. If any of these happen—or if you feel unsure—contact your BHW/RHU or seek urgent care.",
  ].join(" ");
}

function aggregateAssessmentSeverity(
  selectedSymptoms: string[],
  symptomDetails: Record<string, SymptomDetailEntry>
): "mild" | "moderate" | "severe" {
  const levels = selectedSymptoms.map((id) => symptomDetails[id]?.severity ?? "moderate");
  if (levels.includes("severe")) return "severe";
  if (levels.includes("moderate")) return "moderate";
  return "mild";
}

function formatDurationLabel(value: SymptomDurationValue): string {
  return DURATION_OPTIONS.find((o) => o.value === value)?.label ?? "—";
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

/** Single-line display name for vitals (keeps `patient_name` for downstream / signup matching). */
function composePatientDisplayName(parts: { firstName: string; middleInitial: string; surname: string }): string {
  const first = parts.firstName.trim();
  const sur = parts.surname.trim();
  let mi = parts.middleInitial.trim().replace(/\s+/g, "");
  if (mi && !mi.endsWith(".")) mi = `${mi}.`;
  return [first, mi, sur].filter(Boolean).join(" ");
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
  const [symptomDetails, setSymptomDetails] = useState<Record<string, SymptomDetailEntry>>({});
  const [selectedRiskFactors, setSelectedRiskFactors] = useState<string[]>([]);
  const [triageResult, setTriageResult] = useState<TriageLevel>(null);
  const [triageReasonLine, setTriageReasonLine] = useState<string>("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [patientInfo, setPatientInfo] = useState({
    surname: "",
    firstName: "",
    middleInitial: "",
    gender: "" as "" | "female" | "male" | "other",
    birthday: "",
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

  const ageNumber = computeAgeFromBirthday(patientInfo.birthday);
  const isStep1Valid =
    patientInfo.surname.trim().length > 0 &&
    patientInfo.firstName.trim().length > 0 &&
    patientInfo.gender !== "" &&
    typeof ageNumber === "number" &&
    ageNumber >= 0;
  const isStep2Valid =
    selectedSymptoms.length > 0 &&
    selectedSymptoms.every((id) => {
      const d = symptomDetails[id];
      return Boolean(d?.duration);
    });

  const toggleSymptom = (symptomId: string) => {
    if (selectedSymptoms.includes(symptomId)) {
      setSelectedSymptoms((prev) => prev.filter((id) => id !== symptomId));
      setSymptomDetails((det) => {
        const next = { ...det };
        delete next[symptomId];
        return next;
      });
      return;
    }
    setSelectedSymptoms((prev) => [...prev, symptomId]);
    setSymptomDetails((det) => ({
      ...det,
      [symptomId]: det[symptomId] ?? { duration: "", severity: "moderate" },
    }));
  };

  const setSymptomDetailField = <K extends keyof SymptomDetailEntry>(
    symptomId: string,
    field: K,
    value: SymptomDetailEntry[K]
  ) => {
    setSymptomDetails((prev) => ({
      ...prev,
      [symptomId]: {
        ...(prev[symptomId] ?? { duration: "", severity: "moderate" }),
        [field]: value,
      },
    }));
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
      // Gate progression based on required fields
      if (step === 1 && !isStep1Valid) {
        setValidationMessage("Please enter surname, first name, birthday, and gender to continue.");
        return;
      }
      if (step === 2 && !isStep2Valid) {
        setValidationMessage(
          selectedSymptoms.length === 0
            ? "Please select at least one symptom to continue."
            : "For each selected symptom, choose how long it has lasted."
        );
        return;
      }
      setValidationMessage(null);
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setValidationMessage(null);
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!isStep2Valid) {
      setValidationMessage(
        selectedSymptoms.length === 0
          ? "Please select at least one symptom to get a triage result."
          : "For each selected symptom, choose how long it has lasted before submitting."
      );
      setStep(2);
      return;
    }
    setValidationMessage(null);
    const computation = computeTriageAssessment(selectedSymptoms, selectedRiskFactors, symptomDetails);
    const result = computation.level;
    setTriageResult(result);
    setTriageReasonLine(result ? formatTriageReasonLine(computation, selectedRiskFactors, riskFactors) : "");
    setStep(4);
    if (result) {
      setSaving(true);
      try {
        const displayName = composePatientDisplayName(patientInfo);
        const allSymptomsFlat = symptomCategories.flatMap((c) => c.symptoms);
        const symptomDetailsPayload = selectedSymptoms.map((id) => {
          const meta = allSymptomsFlat.find((s) => s.id === id);
          const det = symptomDetails[id];
          return {
            symptom_id: id,
            label: meta?.label ?? id,
            duration: det?.duration ?? "",
            duration_label: det?.duration ? formatDurationLabel(det.duration) : "",
            severity: det?.severity ?? "moderate",
          };
        });
        const durationSummary = symptomDetailsPayload
          .map((row) => `${row.label}: ${row.duration_label || "—"}`)
          .join("; ");

        const { data: assessment, error: assessErr } = await supabase
          .from("symptom_assessments")
          // We intentionally support "guest" submissions here.
          // Linking to a user happens after signup/login via stored assessment id.
          .insert({
            user_id: user?.id ?? null,
            symptoms: selectedSymptoms,
            severity: aggregateAssessmentSeverity(selectedSymptoms, symptomDetails),
            duration: durationSummary || null,
            notes: patientInfo.notes || null,
            vitals: {
              patient_surname: patientInfo.surname.trim(),
              patient_first_name: patientInfo.firstName.trim(),
              ...(patientInfo.middleInitial.trim() ? { patient_middle_initial: patientInfo.middleInitial.trim() } : {}),
              patient_gender: patientInfo.gender,
              ...(displayName ? { patient_name: displayName } : {}),
              ...(typeof ageNumber === "number" ? { patient_age: ageNumber } : {}),
              ...(patientInfo.birthday ? { patient_birthday: patientInfo.birthday } : {}),
              ...(patientInfo.bpSystolic && patientInfo.bpDiastolic ? { bp_systolic: Number(patientInfo.bpSystolic), bp_diastolic: Number(patientInfo.bpDiastolic) } : {}),
              ...(patientInfo.hr ? { hr: Number(patientInfo.hr) } : {}),
              ...(patientInfo.tempC ? { temp_c: Number(patientInfo.tempC) } : {}),
              symptom_details: symptomDetailsPayload,
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
        setSavedAssessmentId(assessment.id);

        // If not logged in, keep a pointer we can claim after signup/login.
        if (!user?.id) {
          try {
            localStorage.setItem(PENDING_ASSESSMENT_LS_KEY, assessment.id);
          } catch {
            // ignore storage errors (private mode, etc.)
          }
        }
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
    setSymptomDetails({});
    setSelectedRiskFactors([]);
    setTriageResult(null);
    setTriageReasonLine("");
    setPatientInfo({
      surname: "",
      firstName: "",
      middleInitial: "",
      gender: "",
      birthday: "",
      notes: "",
      bpSystolic: "",
      bpDiastolic: "",
      hr: "",
      tempC: "",
    });
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
      
      <main className="flex-1 pt-24 pb-20">
        <div className="container mx-auto px-4 lg:px-8 max-w-[1400px]">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Sticky Sidebar (Status/Progress) */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
              <Card className="overflow-hidden border-border/50">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-primary uppercase tracking-wider">Assessment Progress</span>
                    <Badge variant="outline" className="bg-background">{Math.round(progress)}%</Badge>
                  </div>
                  <Progress value={progress} className="h-2" />
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-3">
                    {([
                      { s: 1, label: "Basic Information", icon: User },
                      { s: 2, label: "Symptom Selection", icon: Stethoscope },
                      { s: 3, label: "Risk Factors", icon: Calendar },
                      { s: 4, label: "Triage Result", icon: Activity },
                    ] as const).map((item) => (
                      <div key={item.s} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${step === item.s ? "bg-primary/10 text-primary" : "text-muted-foreground opacity-60"}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step === item.s ? "border-primary bg-primary/20" : "border-muted"}`}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium">{item.label}</span>
                        {step > item.s && <CheckCircle2 className="w-4 h-4 ml-auto text-green-500" />}
                      </div>
                    ))}
                  </div>

                  {savedAssessmentId && (
                    <div className="pt-4 border-t border-border/60">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-widest">Reference ID</p>
                      <p className="text-xs font-mono bg-muted p-2 rounded text-foreground break-all">{savedAssessmentId}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dynamic Emergency Tip */}
              <div className="p-5 rounded-2xl bg-destructive/5 border border-destructive/10 space-y-3">
                <div className="flex items-center gap-3 text-destructive">
                  <AlertTriangle className="w-5 h-5 pulse-ring" />
                  <span className="font-bold">Emergency Warning</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If you experience sudden chest pain, severe difficulty breathing, or loss of consciousness, skip this report and seek immediate medical attention at the nearest Emergency Room.
                </p>
              </div>
            </div>

            {/* Right: Main Form Content */}
            <div className="lg:col-span-8">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <Card className="animate-fade-in border-border/50 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-2">
                       <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <Badge variant="outline" className="text-xs py-1">
                        {new Date().toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl font-bold">Patient Information</CardTitle>
                    <CardDescription>We need these details to ensure your assessment reaches the right medical records.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="surname" className="text-sm font-semibold">Surname (Apelyido) <span className="text-destructive">*</span></Label>
                          <Input id="surname" className="rounded-xl h-11 bg-muted/20" value={patientInfo.surname} onChange={(e) => setPatientInfo({ ...patientInfo, surname: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-sm font-semibold">First Name (Pangalan) <span className="text-destructive">*</span></Label>
                          <Input id="firstName" className="rounded-xl h-11 bg-muted/20" value={patientInfo.firstName} onChange={(e) => setPatientInfo({ ...patientInfo, firstName: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="middleInitial" className="text-sm font-semibold">M.I.</Label>
                          <Input id="middleInitial" maxLength={4} className="rounded-xl h-11 bg-muted/20 uppercase" value={patientInfo.middleInitial} onChange={(e) => setPatientInfo({ ...patientInfo, middleInitial: e.target.value.toUpperCase() })} />
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 items-start">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Birth Details <span className="text-destructive">*</span></Label>
                        <DatePicker
                          date={patientInfo.birthday ? parseISO(patientInfo.birthday) : undefined}
                          setDate={(date) => setPatientInfo({ ...patientInfo, birthday: date ? format(date, "yyyy-MM-dd") : "" })}
                        />
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Age is calculated automatically</p>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Biological Sex <span className="text-destructive">*</span></Label>
                        <div className="grid grid-cols-3 gap-2">
                          {([{ v: "female", l: "Female" }, { v: "male", l: "Male" }, { v: "other", l: "Other" }] as const).map((g) => (
                            <button key={g.v} type="button" onClick={() => setPatientInfo({ ...patientInfo, gender: g.v })} className={`h-11 rounded-xl border text-xs font-semibold uppercase transition-all ${patientInfo.gender === g.v ? "bg-primary text-primary-foreground border-primary shadow-lg ring-2 ring-primary/20" : "bg-muted/10 hover:bg-muted/20"}`}>{g.l}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-border/50">
                      <Label className="text-sm font-semibold mb-3 block">Measurements (Optional Vitals)</Label>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-[11px] uppercase text-muted-foreground font-bold">Blood Pressure (SYS/DIA)</Label>
                          <div className="flex gap-2">
                            <Input placeholder="120" className="rounded-xl h-10" value={patientInfo.bpSystolic} onChange={(e) => setPatientInfo({ ...patientInfo, bpSystolic: e.target.value })} />
                            <span className="self-center">/</span>
                            <Input placeholder="80" className="rounded-xl h-10" value={patientInfo.bpDiastolic} onChange={(e) => setPatientInfo({ ...patientInfo, bpDiastolic: e.target.value })} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] uppercase text-muted-foreground font-bold">Temp (°C)</Label>
                          <Input step="0.1" placeholder="36.5" className="rounded-xl h-10" value={patientInfo.tempC} onChange={(e) => setPatientInfo({ ...patientInfo, tempC: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4">
                      <Label htmlFor="notes" className="text-sm font-semibold">Additional Context</Label>
                      <Textarea id="notes" rows={3} className="rounded-2xl bg-muted/20 resize-none" placeholder="Medications, allergies, or when it started..." value={patientInfo.notes} onChange={(e) => setPatientInfo({ ...patientInfo, notes: e.target.value })} />
                    </div>

                    {validationMessage && <p className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">{validationMessage}</p>}

                    <div className="pt-4">
                      <Button onClick={handleNext} size="lg" className="h-14 w-full rounded-2xl text-base font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">Continue to Symptoms <ArrowRight className="w-5 h-5 ml-2" /></Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Symptoms */}
              {step === 2 && (
                <Card className="animate-fade-in border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Stethoscope className="w-6 h-6 text-primary" />
                      </div>
                      <Badge className="bg-primary/20 text-primary hover:bg-primary/20 border-primary/20">{selectedSymptoms.length} Selected</Badge>
                    </div>
                    <CardTitle className="text-2xl font-bold">Describe Symptoms</CardTitle>
                    <CardDescription>Select all categories that apply to how you feel.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-10">
                    {symptomCategories.map((category) => (
                      <div key={category.name} className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-1 bg-primary rounded-full" />
                          <h3 className="font-bold text-lg text-foreground">{category.name}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {category.symptoms.map((symptom) => {
                            const checked = selectedSymptoms.includes(symptom.id);
                            return (
                              <div key={symptom.id} className={`group rounded-xl border-2 p-3 transition-all duration-300 ${checked ? "border-primary bg-primary/[0.03] shadow-md ring-2 ring-primary/10" : "border-border hover:border-primary/30"}`}>
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <Checkbox checked={checked} onCheckedChange={() => toggleSymptom(symptom.id)} className="mt-1 h-4 w-4 rounded-md shrink-0" />
                                  <div className="space-y-3 w-full">
                                    <span className="font-bold text-sm text-foreground leading-tight">{symptom.label}</span>
                                    {checked && (
                                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-3 border-t border-border/80 space-y-4">
                                        <div className="space-y-2">
                                          <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Duration</Label>
                                          <Select value={symptomDetails[symptom.id]?.duration ?? ""} onValueChange={(val) => setSymptomDetailField(symptom.id, "duration", val as SymptomDurationValue)}>
                                            <SelectTrigger className="rounded-xl h-10 bg-background border-border/60"><SelectValue placeholder="How long?" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">{DURATION_OPTIONS.filter(o => o.value !== "").map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" /> Severity</Label>
                                          <div className="grid grid-cols-3 gap-2">
                                            {(["mild", "moderate", "severe"] as const).map((s) => (
                                              <button key={s} type="button" onClick={() => setSymptomDetailField(symptom.id, "severity", s)} className={`h-9 rounded-xl border text-[10px] font-bold uppercase transition-all ${ (symptomDetails[symptom.id]?.severity ?? "moderate") === s ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted/10 border-border/60"}`}>{s}</button>
                                            ))}
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </div>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <div className="sticky bottom-4 left-0 right-0 z-10 pt-6">
                      <div className="glass-card shadow-2xl p-4 rounded-3xl flex gap-3 border-primary/20">
                        <Button onClick={handleBack} variant="outline" size="lg" className="rounded-2xl px-8 h-14 border-2 font-bold text-base hover:bg-muted/10"><ArrowLeft className="w-5 h-5 mr-2" /> Back</Button>
                        <Button onClick={handleNext} size="lg" className="flex-1 h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20" disabled={!isStep2Valid}>Continue Assessment <ArrowRight className="w-5 h-5 ml-2" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Risk Factors */}
              {step === 3 && (
                <Card className="animate-fade-in border-border/50">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Health Context & Risks</CardTitle>
                    <CardDescription>Select any pre-existing conditions or life factors that apply.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {riskFactors.map((factor) => (
                        <label key={factor.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedRiskFactors.includes(factor.id) ? "border-primary bg-primary/[0.03] shadow-md ring-2 ring-primary/10" : "border-border hover:border-primary/40"}`}>
                          <Checkbox checked={selectedRiskFactors.includes(factor.id)} onCheckedChange={() => toggleRiskFactor(factor.id)} className="h-5 w-5 rounded-md shrink-0" />
                          <span className="font-bold text-sm text-foreground leading-tight">{factor.label}</span>
                        </label>
                      ))}
                    </div>

                    <div className="pt-6 flex gap-3">
                      <Button onClick={handleBack} variant="outline" size="lg" className="rounded-2xl h-14 px-8 border-2 font-bold text-base"><ArrowLeft className="w-5 h-5 mr-2" /> Back</Button>
                      <Button onClick={handleSubmit} variant="hero" size="lg" className="flex-1 h-14 rounded-2xl text-base font-bold shadow-xl">Analyze My Health <ArrowRight className="w-5 h-5 ml-2" /></Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Results */}
              {step === 4 && triageResult && (
                <div className="animate-fade-in space-y-6">
                  <Card className={`border-4 overflow-hidden ${triageResults[triageResult].borderColor} shadow-2xl rounded-3xl`}>
                    <CardHeader className={`${triageResults[triageResult].bgColor} text-primary-foreground p-8`}>
                      <div className="flex items-center gap-4">
                        {(() => { const Icon = triageResults[triageResult].icon; return <Icon className="w-12 h-12" />; })()}
                        <div>
                          <CardTitle className="text-3xl font-black uppercase tracking-tight">Triage Status: {getTriageLevelLabel(triageResult)}</CardTitle>
                          <p className="opacity-90 font-medium">AI-Assisted Assessment Complete</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-5 rounded-3xl bg-muted/40 border border-border/50 text-center">
                          <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Health Priority Score</p>
                          <p className="text-4xl font-black text-foreground">{getRiskScore(triageResult)}</p>
                        </div>
                        <div className="p-5 rounded-3xl bg-muted/40 border border-border/50 text-center flex flex-col justify-center">
                           <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-2">Category</p>
                           <Badge className="mx-auto h-7 px-4 rounded-full font-bold uppercase">{triageResult}</Badge>
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 shadow-inner">
                        <h4 className="font-black uppercase text-xs tracking-widest text-primary mb-3">Protocol: Recommended Actions</h4>
                        <div className="space-y-4">
                          <p className="text-lg font-bold text-foreground leading-tight">1. {triageResults[triageResult].action}</p>
                          {triageResult === "urgent" && <p className="text-lg font-bold text-foreground leading-tight">2. Notify Health Center BHW immediately</p>}
                        </div>
                        {triageReasonLine && (
                          <div className="mt-6 pt-4 border-t border-primary/10 italic text-sm text-muted-foreground leading-relaxed">
                            <span className="font-bold text-foreground not-italic">Clinical Logic: </span>
                            {triageReasonLine}
                          </div>
                        )}
                      </div>

                      {selectedSymptoms.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-black uppercase text-xs tracking-widest text-muted-foreground">Symptom Summary</h4>
                          <div className="grid sm:grid-cols-2 gap-3">
                            {selectedSymptoms.map((id) => {
                              const label = resolveSymptomLabel(id);
                              const det = symptomDetails[id];
                              return (
                                <div key={id} className="p-3 rounded-xl bg-muted/20 border border-border/50 flex justify-between items-center">
                                  <span className="font-bold text-sm">{label}</span>
                                  <Badge variant="outline" className="text-[10px] font-bold">{det?.severity || "moderate"}</Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="p-6 rounded-2xl border-2 border-dashed border-border/60 bg-muted/10">
                        <h4 className="font-black uppercase text-xs tracking-widest text-muted-foreground mb-2">Facility Contact</h4>
                        <p className="text-xl font-black text-primary">{triageResults[triageResult].contact}</p>
                      </div>

                      <div className="bg-destructive/5 rounded-2xl p-4 border border-destructive/10">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <strong>Medical Disclaimer:</strong> This automated guidance is for informational purposes for Barangay Health Centers. It does not replace a doctor&apos;s diagnosis. In cases of sudden severe symptoms, skip this and proceed to an ER.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-wrap gap-4 pt-4">
                    <Button size="lg" className="flex-1 h-14 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/30" onClick={handleRequestTeleconsultation} disabled={requestingConsult || !savedAssessmentId}>
                      {requestingConsult ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Requesting...</> : "Start Teleconsultation Now"}
                    </Button>
                    <Button variant="outline" size="lg" className="h-14 px-8 rounded-2xl font-bold border-2" asChild><Link to={user ? "/dashboard" : "/"}>Close Assessment</Link></Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
