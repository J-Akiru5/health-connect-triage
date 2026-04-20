import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import Swal from 'sweetalert2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Clock,
  Stethoscope,
  User,
  Phone,
  Video,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRightLeft,
  MessageSquare,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, parse } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { CreateReferralModal, type CreateReferralPrefilledPatient } from "@/components/CreateReferralModal";

interface ConsultationRow {
  id: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  provider: { full_name: string | null } | null;
}

interface ProviderConsultRow {
  id: string;
  patient_id: string;
  patient_name: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  triage_level: string | null;
  assessment_id?: string | null;
}

const Consultations = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    barangay: "",
    consultationType: "",
    reason: "",
  });
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [loadingConsultations, setLoadingConsultations] = useState(true);
  const [providerConsults, setProviderConsults] = useState<ProviderConsultRow[]>([]);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [bhwConsults, setBhwConsults] = useState<ProviderConsultRow[]>([]);
  const [loadingBhw, setLoadingBhw] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [referralPrefilled, setReferralPrefilled] = useState<CreateReferralPrefilledPatient | null>(null);
  const [referralTeleconsultationId, setReferralTeleconsultationId] = useState<string | undefined>(undefined);
  const [queueUpdatingId, setQueueUpdatingId] = useState<string | null>(null);
  const isClinician = profile?.role === "clinician";
  const isBhw = profile?.role === "bhw";
  const [feedbackDialogId, setFeedbackDialogId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [existingFeedbackIds, setExistingFeedbackIds] = useState<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState<string>(isClinician ? "provider" : isBhw ? "bhw-info" : "my-appointments");

  const loadProviderConsults = useCallback(async () => {
    if (!user?.id || !isClinician) return;
    const { data: consults } = await supabase
      .from("teleconsultations")
      .select("id, patient_id, status, scheduled_at, created_at, assessment_id")
      .eq("provider_id", user.id)
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    if (!consults?.length) {
      setProviderConsults([]);
      return;
    }
    const patientIds = [...new Set(consults.map((c: { patient_id: string }) => c.patient_id))];
    const assessmentIds = consults.map((c: { assessment_id: string | null }) => c.assessment_id).filter(Boolean) as string[];
    const [profRes, triageRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", patientIds),
      assessmentIds.length
        ? supabase.from("ai_triage_results").select("assessment_id, triage_level").in("assessment_id", assessmentIds)
        : { data: [] as { assessment_id: string; triage_level: string }[] },
    ]);
    const nameMap = new Map((profRes.data ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Patient"]));
    const triageMap = new Map((triageRes.data ?? []).map((t: { assessment_id: string; triage_level: string }) => [t.assessment_id, t.triage_level]));
    const rows: ProviderConsultRow[] = consults.map((c: { id: string; patient_id: string; status: string; scheduled_at: string | null; created_at: string; assessment_id: string | null }) => ({
      id: c.id,
      patient_id: c.patient_id,
      patient_name: nameMap.get(c.patient_id) ?? "Patient",
      status: c.status,
      scheduled_at: c.scheduled_at,
      created_at: c.created_at,
      triage_level: c.assessment_id ? triageMap.get(c.assessment_id) ?? null : null,
    }));
    setProviderConsults(rows);
  }, [user?.id, isClinician]);

  // barangays are free-text now; no table to load

  useEffect(() => {
    if (!user?.id) {
      setLoadingConsultations(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("teleconsultations")
        .select("id, status, scheduled_at, created_at, provider_id")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });
      const providerIds = [...new Set((data ?? []).map((r: { provider_id: string }) => r.provider_id))];
      const { data: profData } = providerIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", providerIds)
        : { data: [] };
      const profMap = new Map((profData ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p]));
      const rows = (data ?? []).map((r: { id: string; status: string; scheduled_at: string | null; created_at: string; provider_id: string }) => ({
        id: r.id,
        status: r.status,
        scheduled_at: r.scheduled_at,
        created_at: r.created_at,
        provider: profMap.get(r.provider_id) ?? null,
      }));
      setConsultations(rows);
      const completedIds = rows.filter((r) => r.status === "completed").map((r) => r.id);
      if (completedIds.length > 0) {
        const { data: fb } = await supabase
          .from("consultation_feedback")
          .select("consultation_id")
          .eq("patient_id", user.id)
          .in("consultation_id", completedIds);
        setExistingFeedbackIds(new Set((fb ?? []).map((f: { consultation_id: string }) => f.consultation_id)));
      }
      setLoadingConsultations(false);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !isBhw) {
      setLoadingBhw(false);
      return;
    }
    (async () => {
      const { data: consults } = await supabase
        .from("teleconsultations")
        .select("id, patient_id, status, scheduled_at, created_at, assessment_id")
        .order("created_at", { ascending: false });
      if (!consults?.length) {
        setBhwConsults([]);
        setLoadingBhw(false);
        return;
      }
      const patientIds = [...new Set(consults.map((c: { patient_id: string }) => c.patient_id))];
      const assessmentIds = consults.map((c: { assessment_id: string | null }) => c.assessment_id).filter(Boolean) as string[];
      const [profRes, triageRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", patientIds),
        assessmentIds.length ? supabase.from("ai_triage_results").select("assessment_id, triage_level").in("assessment_id", assessmentIds) : { data: [] as { assessment_id: string; triage_level: string }[] },
      ]);
      const nameMap = new Map((profRes.data ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Patient"]));
      const triageMap = new Map((triageRes.data ?? []).map((t: { assessment_id: string; triage_level: string }) => [t.assessment_id, t.triage_level]));
      const rows: ProviderConsultRow[] = consults.map((c: { id: string; patient_id: string; status: string; scheduled_at: string | null; created_at: string; assessment_id: string | null }) => ({
        id: c.id,
        patient_id: c.patient_id,
        patient_name: nameMap.get(c.patient_id) ?? "Patient",
        status: c.status,
        scheduled_at: c.scheduled_at,
        created_at: c.created_at,
        triage_level: c.assessment_id ? triageMap.get(c.assessment_id) ?? null : null,
      }));
      setBhwConsults(rows);
      setLoadingBhw(false);
    })();
  }, [user?.id, isBhw]);

  useEffect(() => {
    if (!user?.id || !isClinician) {
      setLoadingProvider(false);
      return;
    }
    setLoadingProvider(true);
    loadProviderConsults().then(() => setLoadingProvider(false));
  }, [user?.id, isClinician, loadProviderConsults]);

  async function handleFeedbackSubmit() {
    if (!user?.id || !feedbackDialogId || feedbackRating === 0) return;
    setFeedbackSubmitting(true);
    try {
      await supabase.from("consultation_feedback").insert({
        consultation_id: feedbackDialogId,
        patient_id: user.id,
        rating: feedbackRating,
        comment: feedbackComment.trim() || null,
      });
      setExistingFeedbackIds((prev) => new Set([...prev, feedbackDialogId]));
      setFeedbackDialogId(null);
      setFeedbackRating(0);
      setFeedbackComment("");
    } catch (e) {
      console.error("Feedback submit failed", e);
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  async function handleStartConsultation(consultationId: string) {
    setQueueUpdatingId(consultationId);
    try {
      await supabase
        .from("teleconsultations")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", consultationId);
      await loadProviderConsults();
    } catch (e) {
      console.error("Start consultation failed", e);
    } finally {
      setQueueUpdatingId(null);
    }
  }

  async function handleCompleteConsultation(consultationId: string) {
    setQueueUpdatingId(consultationId);
    try {
      await supabase
        .from("teleconsultations")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", consultationId);
      await loadProviderConsults();
      if (consultationId) {
        navigate(`/consultations/${consultationId}/chat`, { state: { openTab: "notes" } });
      } else {
        navigate("/consultations", { replace: true });
      }
    } catch (e) {
      console.error("Complete consultation failed", e);
    } finally {
      setQueueUpdatingId(null);
    }
  }

  const availableTimeSlots = [
    "8:00 AM",
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      Swal.fire({
        title: "Authentication Required",
        text: "Please log in to book a consultation.",
        icon: "warning",
        confirmButtonColor: "#0f766e"
      });
      return;
    }
    setSubmitting(true);
    try {
      const { data: clinicians } = await supabase.from("profiles").select("id").eq("role", "clinician");
      if (!clinicians || clinicians.length === 0) {
        Swal.fire({
          title: "Setup Needed",
          text: "No provider is available at the moment. Please try again later.",
          icon: "info",
          confirmButtonColor: "#0f766e"
        });
        setSubmitting(false);
        return;
      }
      
      const { data: activeConsults } = await supabase
        .from("teleconsultations")
        .select("provider_id")
        .in("status", ["scheduled", "in_progress"]);

      const loadMap = new Map<string, number>();
      clinicians.forEach(c => loadMap.set(c.id, 0));
      if (activeConsults) {
        activeConsults.forEach(c => {
          if (loadMap.has(c.provider_id)) {
            loadMap.set(c.provider_id, loadMap.get(c.provider_id)! + 1);
          }
        });
      }

      let providerId = clinicians[0].id;
      let minLoad = loadMap.get(providerId) ?? 0;
      for (const [id, count] of loadMap.entries()) {
        if (count < minLoad) {
          minLoad = count;
          providerId = id;
        }
      }

      let scheduledAt = null;
      if (selectedDate && selectedTime) {
        // parse the time strictly on top of selectedDate to avoid browser 'Invalid Date' quirks
        const parsedTime = parse(selectedTime, "h:mm a", selectedDate);
        scheduledAt = parsedTime.toISOString();
      }

      await supabase.from("teleconsultations").insert({
        patient_id: user.id,
        provider_id: providerId,
        status: "scheduled",
        scheduled_at: scheduledAt,
      });
      const { data: updated } = await supabase
        .from("teleconsultations")
        .select("id, status, scheduled_at, created_at, provider_id")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });
      const provIds = [...new Set((updated ?? []).map((x: { provider_id: string }) => x.provider_id))];
      const { data: pData } = provIds.length ? await supabase.from("profiles").select("id, full_name").in("id", provIds) : { data: [] };
      const pm = new Map((pData ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p]));
      const rows = (updated ?? []).map((r: { id: string; status: string; scheduled_at: string | null; created_at: string; provider_id: string }) => ({
        id: r.id,
        status: r.status,
        scheduled_at: r.scheduled_at,
        created_at: r.created_at,
        provider: pm.get(r.provider_id) ?? null,
      }));
      setConsultations(rows);
      setFormData({ fullName: "", phoneNumber: "", barangay: "", consultationType: "", reason: "" });
      setSelectedTime("");
      setSelectedDate(new Date());
      Swal.fire({
        title: "Request Submitted!",
        text: "You will receive a confirmation shortly.",
        icon: "success",
        confirmButtonColor: "#0f766e"
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Error",
        text: "Failed to submit. Please try again.",
        icon: "error",
        confirmButtonColor: "#dc2626"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const displayStatus = (status: string) => {
    if (status === "scheduled" || status === "in_progress") return "upcoming";
    if (status === "completed") return "completed";
    return "cancelled";
  };

  const getStatusBadge = (status: string) => {
    const s = displayStatus(status);
    if (s === "upcoming") return <Badge className="bg-primary">Upcoming</Badge>;
    if (s === "completed") return <Badge className="bg-green-500">Completed</Badge>;
    return <Badge variant="destructive">Cancelled</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Teleconsultation Appointments
              </h1>
              <p className="text-muted-foreground mt-1">
                Schedule and join consultations with healthcare providers.
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full max-w-2xl mx-auto mb-8 ${isClinician ? "grid-cols-2" : isBhw ? "grid-cols-1" : "grid-cols-2"}`}>
              {isClinician && (
                <TabsTrigger value="provider">My Schedule</TabsTrigger>
              )}
              {isBhw && <TabsTrigger value="bhw-info">Schedule / Facilitate</TabsTrigger>}
              <TabsTrigger value="my-appointments">{isClinician ? "All consultations" : isBhw ? "Barangay consultations" : "My Appointments"}</TabsTrigger>
              {!isClinician && !isBhw && <TabsTrigger value="book">Schedule New Consultation</TabsTrigger>}
            </TabsList>

            {isBhw && (
              <TabsContent value="bhw-info" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Facilitate teleconsultation</CardTitle>
                    <CardDescription>To schedule a teleconsultation for a patient: use Dashboard → Assist Symptom Reporting, complete the form for the patient, then click &quot;Schedule teleconsultation for patient&quot; on the triage result.</CardDescription>
                  </CardHeader>
                </Card>
              </TabsContent>
            )}

            {isClinician && (
              <TabsContent value="provider" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Teleconsultation appointments</CardTitle>
                    <CardDescription>Your queue: start a consultation, complete it, then add notes. Open chat to message the patient.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingProvider ? (
                      <div className="flex items-center justify-center py-12 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Loading…</span>
                      </div>
                    ) : providerConsults.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">No upcoming appointments.</p>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4">
                        {providerConsults.map((c) => (
                          <Card key={c.id} className="overflow-hidden border-border/50">
                            <CardHeader className="bg-muted/30 pb-3 flex flex-row items-start justify-between">
                              <div>
                                <CardTitle className="text-base">{c.patient_name}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  {c.scheduled_at
                                    ? format(new Date(c.scheduled_at), "MMM d, yyyy · h:mm a")
                                    : `Requested ${format(new Date(c.created_at), "MMM d")}`}
                                  {c.assessment_id ? " · Post-triage" : " · Direct booking"}
                                </p>
                                {c.triage_level && (
                                  <Badge variant={c.triage_level === "emergency" || c.triage_level === "urgent" ? "destructive" : "secondary"} className="mt-1">
                                    {c.triage_level}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" asChild>
                                  <Link to={c.id ? `/consultations/${c.id}/chat` : "/consultations"}>
                                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                    Open chat
                                  </Link>
                                </Button>
                                {c.status === "scheduled" && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    disabled={queueUpdatingId === c.id}
                                    onClick={() => handleStartConsultation(c.id)}
                                  >
                                    {queueUpdatingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Start"}
                                  </Button>
                                )}
                                {(c.status === "scheduled" || c.status === "in_progress") && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={queueUpdatingId === c.id}
                                    onClick={() => handleCompleteConsultation(c.id)}
                                  >
                                    {queueUpdatingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Complete"}
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => {
                                    setReferralPrefilled({ id: c.patient_id, name: c.patient_name });
                                    setReferralTeleconsultationId(c.id);
                                    setReferralModalOpen(true);
                                  }}
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  Refer to facility
                                </Button>
                                <Button variant="outline" size="sm">Reschedule / Notify BHW</Button>
                                </div>
                              </CardHeader>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                </Card>
                <div className="mt-4">
                  <Button variant="outline" asChild>
                    <Link to="/dashboard">Back to Dashboard</Link>
                  </Button>
                </div>
              </TabsContent>
            )}

            {/* Book Consultation Tab */}
            <TabsContent value="book">
              <Card>
                <CardHeader>
                  <CardTitle>Schedule Your Consultation</CardTitle>
                  <CardDescription>
                    Fill in your details and select your preferred date and time
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit}>
                    <div className="grid lg:grid-cols-12 gap-8">
                      {/* Left: Scheduling Config */}
                      <div className="lg:col-span-5 space-y-6">
                        <div className="space-y-3">
                          <Label className="text-base">
                            Select Date <span className="text-destructive">*</span>
                          </Label>
                          <Card className="p-3 border-border/50 bg-background flex justify-center">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                              className="rounded-md border-0"
                            />
                          </Card>
                        </div>
                        
                        <div className="space-y-3">
                          <Label className="text-base">
                            Select Time <span className="text-destructive">*</span>
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            {availableTimeSlots.map((time) => (
                              <Button
                                key={time}
                                type="button"
                                variant={selectedTime === time ? "default" : "outline"}
                                onClick={() => setSelectedTime(time)}
                                className={`flex items-center gap-2 h-11 rounded-xl ${selectedTime === time ? "shadow-md" : "hover:border-primary/50"}`}
                              >
                                <Clock className="w-4 h-4" />
                                {time}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Personal Information */}
                      <div className="lg:col-span-7 space-y-6">
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                        <Label htmlFor="fullName">
                          Full Name <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="fullName"
                            placeholder="Juan dela Cruz"
                            className="pl-10 h-11 rounded-xl bg-background"
                            required
                            value={formData.fullName}
                            onChange={(e) =>
                              setFormData({ ...formData, fullName: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">
                          Phone Number <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phoneNumber"
                            type="tel"
                            placeholder="0917-123-4567"
                            className="pl-10 h-11 rounded-xl bg-background"
                            required
                            value={formData.phoneNumber}
                            onChange={(e) =>
                              setFormData({ ...formData, phoneNumber: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="barangay">
                        Barangay <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="barangay"
                          placeholder="Type your barangay"
                          className="h-11 rounded-xl bg-background"
                          required
                          value={formData.barangay}
                          onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="consultationType">
                        Consultation Type <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        required
                        value={formData.consultationType}
                        onValueChange={(value) =>
                          setFormData({ ...formData, consultationType: value })
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl bg-background">
                          <SelectValue placeholder="Select consultation type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="teleconsultation">
                            <div className="flex items-center gap-2">
                              <Video className="w-4 h-4" />
                              Teleconsultation (Video Call)
                            </div>
                          </SelectItem>
                          <SelectItem value="in-person">
                            <div className="flex items-center gap-2">
                              <Stethoscope className="w-4 h-4" />
                              In-Person Visit
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reason">
                        Reason for Consultation <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="reason"
                        placeholder="Briefly describe your symptoms or reason for consultation..."
                        rows={4}
                        className="rounded-xl resize-none bg-background"
                        required
                        value={formData.reason}
                        onChange={(e) =>
                          setFormData({ ...formData, reason: e.target.value })
                        }
                      />
                    </div>
                    
                    <div className="pt-6">
                      <Button type="submit" size="lg" className="w-full rounded-xl h-14 text-base" disabled={submitting}>
                        {submitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Submitting Request…
                          </>
                        ) : (
                          <>
                            <CalendarIcon className="w-5 h-5 mr-2" />
                            Book Consultation Now
                          </>
                        )}
                      </Button>
                    </div>
                    </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* My Appointments Tab */}
            <TabsContent value="my-appointments">
              {isBhw ? (
                <>
                  {loadingBhw ? (
                    <Card>
                      <CardContent className="py-12 flex items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Loading…</span>
                      </CardContent>
                    </Card>
                  ) : bhwConsults.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        No teleconsultations yet. Use Assist Symptom Reporting to submit an intake and schedule one.
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Patient consultations</CardTitle>
                        <CardDescription>Teleconsultations you or the system scheduled for patients.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {bhwConsults.map((c) => (
                            <Card key={c.id} className="overflow-hidden border-border/50">
                              <CardHeader className="bg-muted/30 pb-3 flex flex-row items-start justify-between">
                                <div>
                                  <CardTitle className="text-base">{c.patient_name}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  {c.scheduled_at ? format(new Date(c.scheduled_at), "MMM d, yyyy · h:mm a") : `Requested ${format(new Date(c.created_at), "MMM d")}`}
                                  {c.triage_level && (
                                    <Badge variant={c.triage_level === "emergency" || c.triage_level === "urgent" ? "destructive" : "secondary"} className="ml-2">{c.triage_level}</Badge>
                                  )}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button variant="outline" size="sm" asChild className="gap-1">
                                  <Link to={c.id ? `/consultations/${c.id}/chat` : "/consultations"}>
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Open chat
                                  </Link>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => {
                                    setReferralPrefilled({ id: c.patient_id, name: c.patient_name });
                                    setReferralTeleconsultationId(c.id);
                                    setReferralModalOpen(true);
                                  }}
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  Refer to facility
                                </Button>
                                <Badge variant="outline">{c.status}</Badge>
                              </div>
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  )}
                </>
              ) : loadingConsultations ? (
                <Card>
                  <CardContent className="py-12 flex items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Loading appointments…</span>
                  </CardContent>
                </Card>
              ) : consultations.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Appointments Yet
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      You haven't booked any consultations yet. Book your first appointment above or use the Symptom Checker to request one after triage.
                    </p>
                    <Button onClick={() => setActiveTab('book')}>
                      Book Now
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {consultations.map((consultation) => {
                    const date = consultation.scheduled_at ? new Date(consultation.scheduled_at) : new Date(consultation.created_at);
                    const timeStr = consultation.scheduled_at ? format(date, "h:mm a") : "To be scheduled";
                    const statusDisplay = displayStatus(consultation.status);
                    return (
                      <Card key={consultation.id}>
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <Video className="w-4 h-4" />
                                <h3 className="text-lg font-semibold text-foreground">
                                  {consultation.provider?.full_name ?? "Provider"}
                                </h3>
                                {getStatusBadge(consultation.status)}
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="w-4 h-4" />
                                  {format(date, "MMMM d, yyyy")}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  {timeStr}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Video className="w-4 h-4" />
                                  Teleconsultation
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" asChild className="gap-1">
                                <Link to={consultation.id ? `/consultations/${consultation.id}/chat` : "/consultations"}>
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  Open chat
                                </Link>
                              </Button>
                              {statusDisplay === "upcoming" && (
                                <>
                                  <Button size="sm">Join Now</Button>
                                  <Button variant="outline" size="sm">
                                    Reschedule
                                  </Button>
                                </>
                              )}
                              {statusDisplay === "completed" && (
                                existingFeedbackIds.has(consultation.id) ? (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Star className="w-3 h-3" />
                                    Feedback submitted
                                  </span>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => {
                                      setFeedbackDialogId(consultation.id);
                                      setFeedbackRating(0);
                                      setFeedbackComment("");
                                    }}
                                  >
                                    <Star className="w-3.5 h-3.5" />
                                    Leave Feedback
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Information Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Operating Hours</h3>
                <p className="text-sm text-muted-foreground">
                  Monday - Friday: 8:00 AM - 5:00 PM
                  <br />
                  Saturday: 8:00 AM - 12:00 PM
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Need Help?</h3>
                <p className="text-sm text-muted-foreground">
                  Call us at <br />
                  <a href="tel:09171234567" className="text-primary hover:underline">
                    0917-123-4567
                  </a>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-home-care/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 text-home-care" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Confirmation</h3>
                <p className="text-sm text-muted-foreground">
                  You'll receive a confirmation SMS or call within 24 hours of booking.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CreateReferralModal
        open={referralModalOpen}
        onOpenChange={(open) => {
          setReferralModalOpen(open);
          if (!open) {
            setReferralPrefilled(null);
            setReferralTeleconsultationId(undefined);
          }
        }}
        prefilledPatient={referralPrefilled}
        teleconsultationId={referralTeleconsultationId}
        onSuccess={() => {}}
      />

      {/* Feedback Dialog */}
      <Dialog open={!!feedbackDialogId} onOpenChange={(open) => !open && setFeedbackDialogId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rate your consultation</DialogTitle>
            <DialogDescription>Share your experience to help us improve our service.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFeedbackRating(n)}
                    className={`text-2xl transition-colors ${n <= feedbackRating ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-300"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              {feedbackRating > 0 && (
                <p className="text-xs text-muted-foreground">{feedbackRating} out of 5 stars</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fb-comment">Comment (optional)</Label>
              <Textarea
                id="fb-comment"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={3}
                className="resize-none"
                placeholder="How was your experience?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialogId(null)}>Cancel</Button>
            <Button
              onClick={handleFeedbackSubmit}
              disabled={feedbackSubmitting || feedbackRating === 0}
              className="gap-2"
            >
              {feedbackSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Consultations;
