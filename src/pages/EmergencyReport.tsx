import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { calculateTriage, symptomCategories, resolveSymptomLabel } from "@/lib/symptomCategories";
import { AlertTriangle, AlertCircle, Clock, Home, ArrowRight, ArrowLeft, Stethoscope, User, Calendar, LogIn } from "lucide-react";

type TriageLevel = "emergency" | "urgent" | "non-urgent" | "home-care" | null;

const riskFactors = [
  { id: "senior", label: "Senior citizen (60+ years old)" },
  { id: "pregnant", label: "Pregnant" },
  { id: "diabetes", label: "Has diabetes" },
  { id: "hypertension", label: "Has hypertension" },
  { id: "heart-disease", label: "Has heart disease" },
  { id: "immunocompromised", label: "Immunocompromised" },
];

function getRiskScore(level: TriageLevel): number {
  switch (level) {
    case "emergency": return 95;
    case "urgent": return 75;
    case "non-urgent": return 50;
    case "home-care": return 25;
    default: return 0;
  }
}

function getTriageLevelLabel(level: TriageLevel): string {
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
    bgColor: "bg-emergency",
    borderColor: "border-emergency",
    description: "Your symptoms indicate a potentially serious condition that requires immediate medical attention.",
    action: "Call emergency services or proceed to the nearest hospital immediately.",
    contact: "Emergency Hotline: 0917-123-4567",
  },
  urgent: {
    title: "Urgent Care Recommended",
    icon: AlertCircle,
    bgColor: "bg-urgent",
    borderColor: "border-urgent",
    description: "Your symptoms suggest you should see a healthcare provider within the next few hours.",
    action: "Contact your Barangay Health Worker or visit the Rural Health Unit today.",
    contact: "RHU Hotline: 0917-234-5678",
  },
  "non-urgent": {
    title: "Schedule a Consultation",
    icon: Clock,
    bgColor: "bg-non-urgent",
    borderColor: "border-non-urgent",
    description: "Your symptoms are not immediately concerning, but you should schedule a consultation for proper evaluation.",
    action: "Book a teleconsultation or visit during regular clinic hours.",
    contact: "Book via app or call: 0917-345-6789",
  },
  "home-care": {
    title: "Home Care Advised",
    icon: Home,
    bgColor: "bg-home-care",
    borderColor: "border-home-care",
    description: "Your symptoms can likely be managed at home with proper rest and care.",
    action: "Rest, stay hydrated, and monitor your symptoms. Consult if symptoms worsen.",
    contact: "Questions? Message your BHW: 0917-456-7890",
  },
};

export default function EmergencyReport() {
  const [step, setStep] = useState(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedRiskFactors, setSelectedRiskFactors] = useState<string[]>([]);
  const [triageResult, setTriageResult] = useState<TriageLevel>(null);
  const [patientInfo, setPatientInfo] = useState({ name: "", duration: "" });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const toggleSymptom = (id: string) =>
    setSelectedSymptoms((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const toggleRiskFactor = (id: string) =>
    setSelectedRiskFactors((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const handleSubmit = () => {
    const result = calculateTriage(selectedSymptoms, selectedRiskFactors);
    setTriageResult(result);
    setStep(4);
  };

  const handleReset = () => {
    setStep(1);
    setSelectedSymptoms([]);
    setSelectedRiskFactors([]);
    setTriageResult(null);
    setPatientInfo({ name: "", duration: "" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 pt-20 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          {/* Alert banner */}
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Emergency Quick Report</p>
              <p className="text-sm text-muted-foreground">
                No login required. Your results will <strong>not</strong> be saved. Create an account to save results and request teleconsultation.
              </p>
            </div>
          </div>

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
                <CardTitle className="text-2xl">Quick Symptom Report</CardTitle>
                <CardDescription>
                  Date: {new Date().toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })} — No account needed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name (optional)</Label>
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
                  <Label htmlFor="duration">How long have you had symptoms?</Label>
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
                <Button onClick={() => setStep(2)} size="lg" className="w-full">
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
                <CardDescription>Select all that apply.</CardDescription>
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
                  <Button onClick={() => setStep(1)} variant="outline" size="lg">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)} size="lg" className="flex-1">
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
                <CardDescription>Risk factors help us better assess your condition. Select all that apply.</CardDescription>
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
                  <Button onClick={() => setStep(2)} variant="outline" size="lg">
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
                  </div>
                  {selectedSymptoms.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Symptom Summary</h4>
                      <p className="text-muted-foreground">
                        {selectedSymptoms.map((id) => resolveSymptomLabel(id)).join(", ")}
                      </p>
                    </div>
                  )}
                  <p className="text-foreground">{triageResults[triageResult].description}</p>
                  <div className="p-4 rounded-lg border border-border">
                    <h4 className="font-semibold text-foreground mb-2">Contact Information</h4>
                    <p className="text-primary font-medium">{triageResults[triageResult].contact}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Disclaimer:</strong> This AI-assisted triage is for guidance only and does not replace professional medical diagnosis. Always consult a healthcare provider for proper evaluation.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Login/Register prompt */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <LogIn className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">Save your results & request teleconsultation</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create a free account or log in to save this triage result and request a teleconsultation with a nurse or physician.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button asChild size="sm">
                          <Link to="/signup">Create account</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to="/login">Log in</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleReset}>
                  Start Over
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/">Back to Home</Link>
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
