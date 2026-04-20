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
      
      <main className="flex-1 pt-20 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {savedAssessmentId && (
            <div className="mb-6 rounded-lg border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Reference number:</strong>{" "}
                <span className="font-mono">{savedAssessmentId}</span>
              </p>
              {!user && (
                <p className="text-sm text-muted-foreground mt-1">
                  Create an account to link this assessment to your profile.
                </p>
              )}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <Card className="animate-fade-in">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Report Symptoms</CardTitle>
                <div className="space-y-1.5">
                  <p className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                    Date:{" "}
                    {new Date().toLocaleDateString("en-CA", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This helps us provide accurate triage.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    Patient name (Pangalan) <span className="text-destructive">*</span>
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="surname">
                        Surname (Apelyido) <span className="text-destructive">*</span>
                      </Label>
                      <input
                        id="surname"
                        type="text"
                        autoComplete="family-name"
                        className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        value={patientInfo.surname}
                        onChange={(e) => setPatientInfo({ ...patientInfo, surname: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="firstName">
                        First name (Pangalan) <span className="text-destructive">*</span>
                      </Label>
                      <input
                        id="firstName"
                        type="text"
                        autoComplete="given-name"
                        className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        value={patientInfo.firstName}
                        onChange={(e) => setPatientInfo({ ...patientInfo, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="middleInitial">Middle initial (Gitnang letra)</Label>
                      <input
                        id="middleInitial"
                        type="text"
                        maxLength={4}
                        className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                        value={patientInfo.middleInitial}
                        onChange={(e) =>
                          setPatientInfo({ ...patientInfo, middleInitial: e.target.value.toUpperCase() })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="birthday">
                    Birthday (Kaarawan) <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    date={patientInfo.birthday ? parseISO(patientInfo.birthday) : undefined}
                    setDate={(date) => setPatientInfo({ ...patientInfo, birthday: date ? format(date, "yyyy-MM-dd") : "" })}
                    placeholder="Select birthday"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Age will be calculated automatically from your birthday.
                  </p>
                </div>
                <div className="space-y-4 rounded-lg border border-border p-4">
                  <div className="space-y-2">
                    <Label>
                      Gender (Kasarian) <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex flex-wrap gap-4">
                      {(
                        [
                          { value: "female" as const, label: "Female" },
                          { value: "male" as const, label: "Male" },
                          { value: "other" as const, label: "Other / Prefer not to say" },
                        ] as const
                      ).map(({ value, label }) => (
                        <label key={value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            checked={patientInfo.gender === value}
                            onChange={() => setPatientInfo({ ...patientInfo, gender: value })}
                            className="rounded-full border-input"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-medium text-muted-foreground">Measurements (optional)</Label>
                    <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">BP (mmHg)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          placeholder="120"
                          className="w-full h-12 px-3 rounded-lg border border-input bg-background text-foreground text-base"
                          value={patientInfo.bpSystolic}
                          onChange={(e) => setPatientInfo({ ...patientInfo, bpSystolic: e.target.value })}
                        />
                        <span className="text-muted-foreground text-base">/</span>
                        <input
                          type="number"
                          placeholder="80"
                          className="w-full h-12 px-3 rounded-lg border border-input bg-background text-foreground text-base"
                          value={patientInfo.bpDiastolic}
                          onChange={(e) => setPatientInfo({ ...patientInfo, bpDiastolic: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">HR (bpm)</Label>
                      <input
                        type="number"
                        placeholder="72"
                        className="w-full h-12 px-3 rounded-lg border border-input bg-background text-foreground text-base mt-1"
                        value={patientInfo.hr}
                        onChange={(e) => setPatientInfo({ ...patientInfo, hr: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Temp (°C)</Label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="36.5"
                        className="w-full h-12 px-3 rounded-lg border border-input bg-background text-foreground text-base mt-1"
                        value={patientInfo.tempC}
                        onChange={(e) => setPatientInfo({ ...patientInfo, tempC: e.target.value })}
                      />
                    </div>
                  </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">
                    Additional notes{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional — when symptoms started, medications you take, allergies, or other helpful details)
                    </span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    If you selected joint or muscle pain, you can add exact side and location here (e.g. left knee, front of thigh).
                  </p>
                  <textarea
                    id="notes"
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="E.g. started 2 days ago; taking paracetamol; no known drug allergies…"
                    value={patientInfo.notes}
                    onChange={(e) => setPatientInfo({ ...patientInfo, notes: e.target.value })}
                  />
                </div>
                {validationMessage && (
                  <p className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {validationMessage}
                  </p>
                )}
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
                <CardDescription className="text-base md:text-lg leading-relaxed">
                  Select all that apply. For each symptom, choose how long it has lasted and how severe it feels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {symptomCategories.map((category) => (
                  <div key={category.name} className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{category.name}</h3>
                      {category.description ? (
                        <p className="text-sm text-muted-foreground mt-1 leading-snug">{category.description}</p>
                      ) : null}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {category.symptoms.map((symptom) => {
                        const checked = selectedSymptoms.includes(symptom.id);
                        return (
                          <div
                            key={symptom.id}
                            className={`rounded-lg border p-3 transition-all ${
                              checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                            }`}
                          >
                            <label className="flex items-center gap-3 cursor-pointer">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleSymptom(symptom.id)}
                              />
                              <span className="text-sm font-medium text-foreground">{symptom.label}</span>
                            </label>
                            {checked && (
                              <div className="mt-3 pt-3 border-t border-border/70 space-y-3">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">
                                    How long has this lasted? <span className="text-destructive">*</span>
                                  </Label>
                                  <select
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={symptomDetails[symptom.id]?.duration ?? ""}
                                    onChange={(e) =>
                                      setSymptomDetailField(
                                        symptom.id,
                                        "duration",
                                        e.target.value as SymptomDurationValue
                                      )
                                    }
                                  >
                                    {DURATION_OPTIONS.map((o) => (
                                      <option key={o.value === "" ? "_duration_ph" : o.value} value={o.value}>
                                        {o.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">How severe is it?</Label>
                                  <div className="flex flex-wrap gap-3">
                                    {(["mild", "moderate", "severe"] as const).map((s) => (
                                      <label key={s} className="flex items-center gap-1.5 cursor-pointer text-sm">
                                        <input
                                          type="radio"
                                          name={`symptom-severity-${symptom.id}`}
                                          checked={(symptomDetails[symptom.id]?.severity ?? "moderate") === s}
                                          onChange={() => setSymptomDetailField(symptom.id, "severity", s)}
                                          className="rounded-full border-input"
                                        />
                                        <span className="capitalize">{s}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {validationMessage && (
                  <p className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {validationMessage}
                  </p>
                )}
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleBack} variant="outline" size="lg">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button onClick={handleNext} size="lg" className="flex-1" disabled={!isStep2Valid}>
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
                <CardDescription className="text-base md:text-lg leading-relaxed">
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

                {validationMessage && (
                  <p className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {validationMessage}
                  </p>
                )}
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleBack} variant="outline" size="lg">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button onClick={handleSubmit} variant="hero" size="lg" className="flex-1" disabled={!isStep2Valid}>
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
                    {triageReasonLine ? (
                      <p className="text-sm text-muted-foreground mt-3 leading-relaxed border-t border-border/60 pt-3">
                        <span className="font-medium text-foreground">Why this result: </span>
                        {triageReasonLine}
                      </p>
                    ) : null}
                  </div>
                  {selectedSymptoms.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Symptom Summary</h4>
                      <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
                        {selectedSymptoms.map((id) => {
                          const label = resolveSymptomLabel(id);
                          const det = symptomDetails[id];
                          return (
                            <li key={id}>
                              <span className="text-foreground font-medium">{label}</span>
                              {" — "}
                              {det?.duration ? formatDurationLabel(det.duration) : "—"}
                              {", "}
                              <span className="capitalize">{det?.severity ?? "moderate"}</span>
                            </li>
                          );
                        })}
                      </ul>
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
