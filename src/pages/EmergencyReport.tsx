import { useState } from "react";
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
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
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
                    <CardDescription>Select all categories that apply to the patient.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-10">
                    {symptomCategories.map((category) => (
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
                    <CardDescription>Certain factors change how we evaluate urgeny.</CardDescription>
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
                    <div className="flex gap-4 pt-4">
                      <Button onClick={() => setStep(2)} variant="outline" size="lg" className="rounded-2xl h-14 px-8 border-2 font-bold focus-visible:ring-0">Back</Button>
                      <Button onClick={handleSubmit} variant="hero" size="lg" className="flex-1 h-14 rounded-2xl font-bold shadow-2xl shadow-primary/20">Get Quick Result <ArrowRight className="w-5 h-5 ml-2" /></Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Results */}
              {step === 4 && triageResult && (
                <div className="animate-fade-in space-y-6">
                  <Card className={`border-4 overflow-hidden rounded-3xl shadow-2xl ${triageResults[triageResult].borderColor}`}>
                    <CardHeader className={`${triageResults[triageResult].bgColor} text-primary-foreground p-8`}>
                      <div className="flex items-center gap-5">
                        {(() => { const Icon = triageResults[triageResult].icon; return <Icon className="w-12 h-12" />; })()}
                        <div>
                          <CardTitle className="text-3xl font-black uppercase tracking-tight">Priority Result: {triageResult}</CardTitle>
                          <p className="opacity-90 font-bold tracking-wide">Automated System Assessment</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                         <div className="p-5 rounded-2xl bg-muted/40 border border-border/50 text-center">
                            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Severity Score</p>
                            <p className="text-4xl font-black text-foreground">{getRiskScore(triageResult)}</p>
                         </div>
                         <div className="p-5 rounded-2xl bg-muted/40 border border-border/50 text-center flex flex-col justify-center">
                            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-2">Urgency Level</p>
                            <Badge className="mx-auto h-7 px-4 rounded-full font-bold uppercase">{getTriageLevelLabel(triageResult)}</Badge>
                         </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                        <h4 className="font-black uppercase text-xs tracking-widest text-primary mb-3">Next Action Steps</h4>
                        <p className="text-xl font-bold text-foreground leading-tight">{triageResults[triageResult].action}</p>
                      </div>

                      {selectedSymptoms.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-black uppercase text-xs tracking-widest text-muted-foreground">Reported Symptoms</h4>
                          <div className="flex flex-wrap gap-2">
                             {selectedSymptoms.map((id) => (
                               <Badge key={id} variant="secondary" className="px-3 py-1 text-xs font-bold border-border/50 rounded-lg">{resolveSymptomLabel(id)}</Badge>
                             ))}
                          </div>
                        </div>
                      )}

                      <div className="p-4 rounded-2xl border-2 border-dashed border-border/60">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-1">Contact Reference</p>
                        <p className="text-xl font-black text-primary">{triageResults[triageResult].contact}</p>
                      </div>

                      <div className="bg-muted/30 rounded-2xl p-6 border border-border/50 italic text-sm text-muted-foreground leading-relaxed">
                        &quot;{triageResults[triageResult].description}&quot;
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
                            <p className="text-sm text-muted-foreground mb-4 font-medium leading-relaxed">Create a free patient account to save this assessment, track health history, and request immediate teleconsultations via video/chat.</p>
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
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
