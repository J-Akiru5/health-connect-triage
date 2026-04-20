import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { symptomCategories, resolveSymptomLabel } from "@/lib/symptomCategories";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronsUpDown,
  Clock,
  Home,
  Loader2,
  LogIn,
  Stethoscope,
  User,
  X,
} from "lucide-react";

type TriageLevel = "emergency" | "urgent" | "non-urgent" | "home-care";

type EmergencyAiResult = {
  priorityLevel: TriageLevel;
  riskScore: number;
  urgencyLabel: "high" | "medium" | "low";
  recommendedAction: string;
  summary: string;
  redFlags: string[];
};

const riskFactors = [
  { id: "senior", label: "Senior citizen (60+ years old)" },
  { id: "pregnant", label: "Pregnant" },
  { id: "diabetes", label: "Has diabetes" },
  { id: "hypertension", label: "Has hypertension" },
  { id: "heart-disease", label: "Has heart disease" },
  { id: "immunocompromised", label: "Immunocompromised" },
];

const suggestedRiskFactorOptions = [
  "Smoker or exposed to secondhand smoke",
  "Chronic lung disease (asthma/COPD)",
  "Chronic kidney disease",
  "Cancer or recent chemotherapy",
  "Recent surgery or hospitalization",
  "Obesity",
  "Recent travel with known outbreak exposure",
  "Close contact with a contagious case",
] as const;

const riskFactorById = new Map(riskFactors.map((r) => [r.id, r.label]));

const symptomMetaById = new Map<string, { label: string; category: string }>();
symptomCategories.forEach((category) => {
  category.symptoms.forEach((symptom) => {
    symptomMetaById.set(symptom.id, { label: symptom.label, category: category.name });
  });
});

function getUrgencyBadgeLabel(level: "high" | "medium" | "low"): string {
  if (level === "high") return "HIGH";
  if (level === "medium") return "MEDIUM";
  return "LOW";
}

function getTriageLevelLabel(level: TriageLevel): string {
  switch (level) {
    case "emergency":
      return "Emergency";
    case "urgent":
      return "Urgent";
    case "non-urgent":
      return "Non-Urgent";
    case "home-care":
      return "Home Care";
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
    action: "Coordinate referral follow-up or visit during regular clinic hours.",
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
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptoms, setCustomSymptoms] = useState<string[]>([]);
  const [customSymptomInput, setCustomSymptomInput] = useState("");
  const [selectedRiskFactors, setSelectedRiskFactors] = useState<string[]>([]);
  const [customRiskFactors, setCustomRiskFactors] = useState<string[]>([]);
  const [customRiskFactorInput, setCustomRiskFactorInput] = useState("");
  const [triageResult, setTriageResult] = useState<EmergencyAiResult | null>(null);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [patientInfo, setPatientInfo] = useState({ name: "", duration: "" });
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchOpen, setSearchOpen] = useState(false);

  const categoryOptions = useMemo(() => symptomCategories.map((c) => c.name), []);

  const filteredCategories = useMemo(() => {
    if (categoryFilter === "all") return symptomCategories;
    return symptomCategories.filter((category) => category.name === categoryFilter);
  }, [categoryFilter]);

  const selectedSymptomChips = useMemo(
    () => [
      ...selectedSymptoms.map((id) => ({ id, label: resolveSymptomLabel(id), kind: "known" as const })),
      ...customSymptoms.map((label) => ({ id: `custom:${label}`, label, kind: "custom" as const })),
    ],
    [selectedSymptoms, customSymptoms]
  );

  const selectedRiskFactorChips = useMemo(
    () => [
      ...selectedRiskFactors
        .map((id) => riskFactorById.get(id))
        .filter((x): x is string => Boolean(x))
        .map((label, idx) => ({ id: `known-risk-${idx}`, label, kind: "known" as const })),
      ...customRiskFactors.map((label, idx) => ({ id: `custom-risk-${idx}`, label, kind: "custom" as const })),
    ],
    [selectedRiskFactors, customRiskFactors]
  );

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const toggleSymptom = (id: string) =>
    setSelectedSymptoms((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const toggleRiskFactor = (id: string) =>
    setSelectedRiskFactors((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const addCustomRiskFactor = () => {
    const normalized = customRiskFactorInput.trim().replace(/\s+/g, " ");
    if (!normalized) return;

    const nextKey = normalized.toLowerCase();
    const existsInCustom = customRiskFactors.some((r) => r.toLowerCase() === nextKey);
    const existsInKnown = selectedRiskFactors.some((id) => (riskFactorById.get(id) ?? "").toLowerCase() === nextKey);
    if (existsInCustom || existsInKnown) {
      setCustomRiskFactorInput("");
      return;
    }

    setCustomRiskFactors((prev) => [...prev, normalized]);
    setCustomRiskFactorInput("");
  };

  const removeCustomRiskFactor = (label: string) => {
    setCustomRiskFactors((prev) => prev.filter((r) => r !== label));
  };

  const addCustomSymptom = () => {
    const normalized = customSymptomInput.trim().replace(/\s+/g, " ");
    if (!normalized) return;

    const nextKey = normalized.toLowerCase();
    const existsInCustom = customSymptoms.some((s) => s.toLowerCase() === nextKey);
    const existsInKnown = selectedSymptoms.some((id) => resolveSymptomLabel(id).toLowerCase() === nextKey);
    if (existsInCustom || existsInKnown) {
      setCustomSymptomInput("");
      return;
    }

    setCustomSymptoms((prev) => [...prev, normalized]);
    setCustomSymptomInput("");
  };

  const removeCustomSymptom = (label: string) => {
    setCustomSymptoms((prev) => prev.filter((s) => s !== label));
  };

  const getPayload = () => {
    const symptomPayload = selectedSymptoms
      .map((id) => {
        const meta = symptomMetaById.get(id);
        if (!meta) return null;
        return {
          id,
          label: meta.label,
          category: meta.category,
        };
      })
      .filter((x): x is { id: string; label: string; category: string } => x !== null);

    const customSymptomPayload = customSymptoms.map((label, idx) => ({
      id: `custom-${idx + 1}`,
      label,
      category: "Other",
    }));

    const riskFactorPayload = selectedRiskFactors
      .map((id) => riskFactorById.get(id))
      .filter((x): x is string => Boolean(x));

    return {
      locale: i18n.language,
      patient: {
        name: patientInfo.name.trim() || null,
        duration: patientInfo.duration || null,
      },
      symptoms: [...symptomPayload, ...customSymptomPayload],
      riskFactors: [...riskFactorPayload, ...customRiskFactors],
    };
  };

  const handleSubmit = async () => {
    if (selectedSymptoms.length + customSymptoms.length === 0) {
      setAssessmentError("Select at least one symptom before running AI assessment.");
      setStep(2);
      return;
    }

    setAssessmentError(null);
    setTriageResult(null);
    setIsAssessing(true);
    setStep(4);

    try {
      const response = await fetch("/api/emergency-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getPayload()),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.detail || body?.error || `Assessment failed (${response.status})`);
      }

      setTriageResult({
        priorityLevel: body.priorityLevel,
        riskScore: Number(body.riskScore) || 0,
        urgencyLabel: body.urgencyLabel,
        recommendedAction: body.recommendedAction,
        summary: body.summary,
        redFlags: Array.isArray(body.redFlags) ? body.redFlags : [],
      });
    } catch (error) {
      setAssessmentError(error instanceof Error ? error.message : "Unable to complete AI triage right now.");
    } finally {
      setIsAssessing(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedSymptoms([]);
    setCustomSymptoms([]);
    setCustomSymptomInput("");
    setSelectedRiskFactors([]);
    setCustomRiskFactors([]);
    setCustomRiskFactorInput("");
    setTriageResult(null);
    setAssessmentError(null);
    setIsAssessing(false);
    setPatientInfo({ name: "", duration: "" });
    setCategoryFilter("all");
  };

  const visual = triageResult ? triageResults[triageResult.priorityLevel] : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 pt-24 pb-20">
        <div className="container mx-auto px-4 lg:px-8 max-w-[1400px]">
          
          {/* Header & Alert Area */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight text-foreground">Emergency Quick Report</h1>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{user ? "Fast triage assessment" : "Fast triage for non-registered users"}</p>
            </div>
            {!user && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 md:max-w-md flex items-start gap-4 shadow-sm border-l-4 border-l-destructive">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <strong className="text-destructive font-bold">Privacy Notice:</strong> This flow is for visitors. No medical record will be created. <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link> if you need your result saved to your history.
                </p>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">

            {/* Sidebar (Progress & Info) */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
              <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Flow Progress</span>
                    <Badge variant="outline" className="bg-background font-mono">{Math.round(progress)}%</Badge>
                  </div>
                  <Progress value={progress} className="h-2 rounded-full" />
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {([
                      { s: 1, l: user ? "Basic Info" : "Visitor Basic Info", i: User },
                      { s: 2, l: "Report Symptoms", i: Stethoscope },
                      { s: 3, l: "Risk Factor Check", i: Calendar },
                      { s: 4, l: "Emergency Result", i: AlertCircle },
                    ] as const).map((item) => (
                      <div key={item.s} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${step === item.s ? "bg-primary/10 text-primary" : "text-muted-foreground opacity-50"}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === item.s ? "border-primary bg-primary/20" : "border-muted"}`}>
                          <item.i className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-tight">{item.l}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Assistance Card */}
              <div className="rounded-3xl bg-primary/5 border border-primary/10 p-6 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary">Need Help?</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">This quick reporter is for assessment assistance only. It is not a clinical diagnosis.</p>
                <Button variant="outline" className="w-full rounded-xl bg-background border-2 border-primary/20 text-primary font-bold hover:bg-primary/5 h-11" asChild>
                   <Link to="/login">Switch to Full Portal</Link>
                </Button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-8">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <Card className="animate-fade-in border-border/50 shadow-md">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                       <User className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-black">Identity Check</CardTitle>
                    <CardDescription>Tell us who is reporting symptoms.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Full Name (Optional)</Label>
                        <Input id="name" placeholder="Juan dela Cruz" className="rounded-xl h-12 bg-muted/20 border-border/50" value={patientInfo.name} onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Symptoms Duration</Label>
                        <Select value={patientInfo.duration} onValueChange={(val) => setPatientInfo({ ...patientInfo, duration: val })}>
                          <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-border/50 shadow-sm"><SelectValue placeholder="How long has this been happening?" /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="today">Started Today</SelectItem>
                            <SelectItem value="days">Few Days ago</SelectItem>
                            <SelectItem value="week">About a week ago</SelectItem>
                            <SelectItem value="weeks">Two weeks or more</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="pt-4">
                      <Button onClick={() => setStep(2)} size="lg" className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20">Analyze Symptoms <ArrowRight className="w-5 h-5 ml-2" /></Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Symptoms */}
              {step === 2 && (
                <Card className="animate-fade-in border-border/50 shadow-md">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                       <Stethoscope className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-black">Active Symptoms</CardTitle>
                    <CardDescription>
                      Search symptoms quickly, filter by body system, and still use checkbox cards for easy review.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-10">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Body System Filter</Label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="rounded-xl h-11 bg-muted/20 border-border/50">
                            <SelectValue placeholder="Filter categories" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Categories</SelectItem>
                            {categoryOptions.map((category) => (
                              <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Search and Add Symptom</Label>
                        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={searchOpen}
                              className="w-full justify-between rounded-xl h-11 bg-muted/20 border-border/50"
                            >
                              Find symptom by keyword...
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[420px] max-w-[90vw] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Type fever, chest pain, seizure..." />
                              <CommandList>
                                <CommandEmpty>No symptom found for this keyword.</CommandEmpty>
                                {filteredCategories.map((category) => (
                                  <CommandGroup key={category.name} heading={category.name}>
                                    {category.symptoms.map((symptom) => {
                                      const isSelected = selectedSymptoms.includes(symptom.id);
                                      return (
                                        <CommandItem
                                          key={symptom.id}
                                          value={`${symptom.label} ${category.name}`}
                                          onSelect={() => {
                                            toggleSymptom(symptom.id);
                                            setSearchOpen(false);
                                          }}
                                        >
                                          <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                          <span className="text-xs font-semibold">{symptom.label}</span>
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Other Symptom Not Listed</Label>
                      <div className="flex gap-2">
                        <Input
                          value={customSymptomInput}
                          onChange={(e) => setCustomSymptomInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomSymptom();
                            }
                          }}
                          placeholder="Type a symptom not listed above"
                          className="rounded-xl h-11 bg-muted/20 border-border/50"
                        />
                        <Button type="button" variant="outline" onClick={addCustomSymptom} className="rounded-xl h-11">Add</Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Selected Symptoms</p>
                        <Badge variant="outline" className="font-mono">{selectedSymptomChips.length}</Badge>
                      </div>
                      <div className="min-h-12 rounded-2xl border border-border/60 bg-muted/20 p-3 flex flex-wrap gap-2">
                        {selectedSymptomChips.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No symptoms selected yet.</p>
                        ) : (
                            selectedSymptomChips.map((chip) => (
                              <Badge key={chip.id} variant="secondary" className="rounded-full px-3 py-1.5 text-xs font-bold gap-2 items-center">
                                {chip.kind === "custom" ? `Other: ${chip.label}` : chip.label}
                              <button
                                type="button"
                                className="rounded-full hover:bg-background/40 p-0.5"
                                onClick={() => {
                                  if (chip.kind === "custom") {
                                    removeCustomSymptom(chip.label);
                                  } else {
                                    toggleSymptom(chip.id);
                                  }
                                }}
                                aria-label={`Remove ${chip.label}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>

                    {filteredCategories.map((category) => (
                      <div key={category.name} className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-1 bg-primary rounded-full" />
                          <h3 className="font-bold text-lg text-foreground tracking-tight">{category.name}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2">
                          {category.symptoms.map((symptom) => (
                            <label key={symptom.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${selectedSymptoms.includes(symptom.id) ? "border-primary bg-primary/[0.03] shadow-md ring-2 ring-primary/10" : "border-border hover:border-primary/30"}`}>
                              <Checkbox checked={selectedSymptoms.includes(symptom.id)} onCheckedChange={() => toggleSymptom(symptom.id)} className="h-4 w-4 rounded-md" />
                              <span className="font-bold text-xs tracking-tight">{symptom.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-4 pt-6">
                      <Button onClick={() => setStep(1)} variant="outline" size="lg" className="rounded-2xl h-14 px-8 border-2 font-bold"><ArrowLeft className="w-5 h-5 mr-1" /> Back</Button>
                      <Button onClick={() => setStep(3)} size="lg" className="flex-1 h-14 rounded-2xl font-bold shadow-xl shadow-primary/20">Next Section <ArrowRight className="w-5 h-5 ml-2" /></Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Risk Factors */}
              {step === 3 && (
                <Card className="animate-fade-in border-border/50 shadow-md">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                       <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-black">Risk Parameters</CardTitle>
                    <CardDescription>
                      Risk factors refine AI prioritization. Keep this accurate to improve urgency scoring quality.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {riskFactors.map((factor) => (
                        <label key={factor.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedRiskFactors.includes(factor.id) ? "border-primary bg-primary/[0.03] shadow-md ring-2 ring-primary/10" : "border-border hover:border-primary/40"}`}>
                          <Checkbox checked={selectedRiskFactors.includes(factor.id)} onCheckedChange={() => toggleRiskFactor(factor.id)} className="h-5 w-5 rounded-md shrink-0" />
                          <span className="font-bold text-sm leading-tight">{factor.label}</span>
                        </label>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Other Risk Factor</Label>
                      <div className="flex gap-2">
                        <Input
                          value={customRiskFactorInput}
                          onChange={(e) => setCustomRiskFactorInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomRiskFactor();
                            }
                          }}
                          placeholder="Type or choose a suggested risk factor"
                          list="risk-factor-suggestions"
                          className="rounded-xl h-11 bg-muted/20 border-border/50"
                        />
                        <Button type="button" variant="outline" onClick={addCustomRiskFactor} className="rounded-xl h-11">Add</Button>
                      </div>
                      <datalist id="risk-factor-suggestions">
                        {suggestedRiskFactorOptions.map((item) => (
                          <option key={item} value={item} />
                        ))}
                      </datalist>

                      {customRiskFactors.length > 0 && (
                        <div className="min-h-12 rounded-2xl border border-border/60 bg-muted/20 p-3 flex flex-wrap gap-2">
                          {customRiskFactors.map((factor) => (
                            <Badge key={factor} variant="secondary" className="rounded-full px-3 py-1.5 text-xs font-bold gap-2 items-center">
                              Other: {factor}
                              <button
                                type="button"
                                className="rounded-full hover:bg-background/40 p-0.5"
                                onClick={() => removeCustomRiskFactor(factor)}
                                aria-label={`Remove ${factor}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button onClick={() => setStep(2)} variant="outline" size="lg" className="rounded-2xl h-14 px-8 border-2 font-bold focus-visible:ring-0">Back</Button>
                      <Button onClick={handleSubmit} variant="hero" size="lg" className="flex-1 h-14 rounded-2xl font-bold shadow-2xl shadow-primary/20" disabled={isAssessing}>
                        {isAssessing ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Running AI Triage...
                          </>
                        ) : (
                          <>
                            Get AI Priority Result <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Results */}
              {step === 4 && isAssessing && (
                <Card className="animate-fade-in border-border/50 shadow-md">
                  <CardContent className="p-10 text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                    <h3 className="text-2xl font-black">AI is assessing urgency</h3>
                    <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                      We are evaluating symptom severity and risk profile to generate a priority level and safe next action guidance.
                    </p>
                  </CardContent>
                </Card>
              )}

              {step === 4 && !isAssessing && assessmentError && (
                <Card className="animate-fade-in border-destructive/30 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl font-black text-destructive">AI assessment unavailable</CardTitle>
                    <CardDescription>{assessmentError}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-3">
                    <Button onClick={handleSubmit} className="rounded-xl">Retry AI Assessment</Button>
                    <Button variant="outline" onClick={() => setStep(3)} className="rounded-xl">Back to Risk Factors</Button>
                  </CardContent>
                </Card>
              )}

              {step === 4 && !isAssessing && triageResult && visual && (
                <div className="animate-fade-in space-y-6">
                  <Card className={`border-4 overflow-hidden rounded-3xl shadow-2xl ${visual.borderColor}`}>
                    <CardHeader className={`${visual.bgColor} text-primary-foreground p-8`}>
                      <div className="flex items-center gap-5">
                        {(() => {
                          const Icon = visual.icon;
                          return <Icon className="w-12 h-12" />;
                        })()}
                        <div>
                          <CardTitle className="text-3xl font-black uppercase tracking-tight">AI Priority Result: {getTriageLevelLabel(triageResult.priorityLevel)}</CardTitle>
                          <p className="opacity-90 font-bold tracking-wide">Locale-aware AI triage assessment</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                         <div className="p-5 rounded-2xl bg-muted/40 border border-border/50 text-center">
                            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Severity Score</p>
                            <p className="text-4xl font-black text-foreground">{triageResult.riskScore}</p>
                         </div>
                         <div className="p-5 rounded-2xl bg-muted/40 border border-border/50 text-center flex flex-col justify-center">
                            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-2">Urgency Level</p>
                            <Badge className="mx-auto h-7 px-4 rounded-full font-bold uppercase">{getUrgencyBadgeLabel(triageResult.urgencyLabel)}</Badge>
                         </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                        <h4 className="font-black uppercase text-xs tracking-widest text-primary mb-3">Next Action Steps</h4>
                        <p className="text-xl font-bold text-foreground leading-tight">{triageResult.recommendedAction}</p>
                      </div>

                      {triageResult.redFlags.length > 0 && (
                        <div className="p-6 rounded-2xl bg-destructive/5 border border-destructive/20">
                          <h4 className="font-black uppercase text-xs tracking-widest text-destructive mb-3">AI-Detected Red Flags</h4>
                          <ul className="space-y-2">
                            {triageResult.redFlags.map((flag) => (
                              <li key={flag} className="text-sm font-semibold text-foreground">• {flag}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedSymptomChips.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-black uppercase text-xs tracking-widest text-muted-foreground">Reported Symptoms</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedSymptomChips.map((chip) => (
                              <Badge key={chip.id} variant="secondary" className="px-3 py-1 text-xs font-bold border-border/50 rounded-lg">
                                {chip.kind === "custom" ? `Other: ${chip.label}` : chip.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedRiskFactorChips.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-black uppercase text-xs tracking-widest text-muted-foreground">Reported Risk Factors</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedRiskFactorChips.map((chip) => (
                              <Badge key={chip.id} variant="secondary" className="px-3 py-1 text-xs font-bold border-border/50 rounded-lg">
                                {chip.kind === "custom" ? `Other: ${chip.label}` : chip.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-4 rounded-2xl border-2 border-dashed border-border/60">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-1">Contact Reference</p>
                        <p className="text-xl font-black text-primary">{visual.contact}</p>
                      </div>

                      <div className="bg-muted/30 rounded-2xl p-6 border border-border/50 italic text-sm text-muted-foreground leading-relaxed">
                        &quot;{triageResult.summary}&quot;
                      </div>

                      <div className="bg-destructive/5 rounded-2xl p-4 border border-destructive/10">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <strong>Safety Notice:</strong> This quick report does not replace clinical consultation. If your condition worsens or you experience difficulty breathing, chest pain, or trauma, go to the nearest hospital immediately.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Promotion Card */}
                  {!user && (
                    <Card className="border-primary/20 bg-primary/[0.02] rounded-3xl overflow-hidden">
                      <CardContent className="p-8 flex flex-col md:flex-row items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                            <LogIn className="w-8 h-8 text-primary" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-black mb-2">Save this result for your records?</h3>
                            <p className="text-sm text-muted-foreground mb-4 font-medium leading-relaxed">Create a free patient account to save this assessment, track health history, and coordinate referrals with your care team.</p>
                            <div className="flex flex-wrap justify-center md:justify-start gap-4">
                              <Button asChild className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20"><Link to="/signup">Register Now</Link></Button>
                              <Button asChild variant="outline" className="rounded-xl h-11 px-6 font-bold border-2"><Link to="/login">Sign In</Link></Button>
                            </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-4">
                    <Button variant="outline" size="lg" onClick={handleReset} className="flex-1 h-14 rounded-2xl border-2 font-bold text-base hover:bg-muted/10">Start New Report</Button>
                    <Button variant="ghost" size="lg" asChild className="flex-1 h-14 rounded-2xl font-bold">
                      <Link to={user ? "/dashboard" : "/"}>Exit System</Link>
                    </Button>
                  </div>
                </div>
              )}

          {step === 4 && !isAssessing && !assessmentError && !triageResult && (
            <Card className="animate-fade-in">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Stethoscope className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No AI Result Available</h3>
                <p className="text-muted-foreground mb-6">
                  Return to previous steps and run AI triage again.
                </p>
                <Button onClick={() => setStep(3)} size="lg">
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </Button>
              </CardContent>
            </Card>
          )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
