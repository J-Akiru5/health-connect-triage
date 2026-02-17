import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
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
  MapPin,
  Video,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface ConsultationRow {
  id: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  provider: { full_name: string | null } | null;
}

const Consultations = () => {
  const { user } = useAuth();
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
  const [barangays, setBarangays] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("barangays").select("id, name").order("name");
      setBarangays(data ?? []);
    })();
  }, []);

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
      setLoadingConsultations(false);
    })();
  }, [user?.id]);

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
      alert("Please log in to book a consultation.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: clinicians } = await supabase.from("profiles").select("id").eq("role", "clinician").limit(1);
      const providerId = clinicians?.[0]?.id;
      if (!providerId) {
        alert("No provider is available at the moment. Please try again later.");
        setSubmitting(false);
        return;
      }
      const scheduledAt = selectedDate && selectedTime
        ? new Date(`${selectedDate.toISOString().slice(0, 10)} ${selectedTime}`).toISOString()
        : null;
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
      alert("Consultation request submitted! You will receive a confirmation shortly.");
    } catch (err) {
      console.error(err);
      alert("Failed to submit. Please try again.");
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
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

          <Tabs defaultValue="my-appointments" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="my-appointments">My Appointments</TabsTrigger>
              <TabsTrigger value="book">Schedule New Consultation</TabsTrigger>
            </TabsList>

            {/* Book Consultation Tab */}
            <TabsContent value="book">
              <Card>
                <CardHeader>
                  <CardTitle>Schedule Your Consultation</CardTitle>
                  <CardDescription>
                    Fill in your details and select your preferred date and time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Information */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">
                          Full Name <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="fullName"
                            placeholder="Enter your full name"
                            className="pl-10"
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
                            className="pl-10"
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
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                        <Select
                          required
                          value={formData.barangay}
                          onValueChange={(value) =>
                            setFormData({ ...formData, barangay: value })
                          }
                        >
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Select your barangay" />
                          </SelectTrigger>
                          <SelectContent>
                            {barangays.map((barangay) => (
                              <SelectItem key={barangay.id} value={barangay.id}>
                                {barangay.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Select consultation type" />
                        </SelectTrigger>
                        <SelectContent>
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

                    {/* Date and Time Selection */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>
                          Select Date <span className="text-destructive">*</span>
                        </Label>
                        <Card className="p-3">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => date < new Date()}
                            className="rounded-md border-0"
                          />
                        </Card>
                      </div>

                      <div className="space-y-2">
                        <Label>
                          Select Time <span className="text-destructive">*</span>
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          {availableTimeSlots.map((time) => (
                            <Button
                              key={time}
                              type="button"
                              variant={selectedTime === time ? "default" : "outline"}
                              onClick={() => setSelectedTime(time)}
                              className="flex items-center gap-2"
                            >
                              <Clock className="w-4 h-4" />
                              {time}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reason">
                        Reason for Consultation <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="reason"
                        placeholder="Briefly describe your symptoms or reason for consultation..."
                        rows={4}
                        required
                        value={formData.reason}
                        onChange={(e) =>
                          setFormData({ ...formData, reason: e.target.value })
                        }
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button type="submit" size="lg" className="flex-1" disabled={submitting}>
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting…
                          </>
                        ) : (
                          <>
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            Book Consultation
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* My Appointments Tab */}
            <TabsContent value="my-appointments">
              {loadingConsultations ? (
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
                    <Button onClick={() => document.querySelector('[value="book"]')?.click()}>
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
                              {statusDisplay === "upcoming" && (
                                <>
                                  <Button size="sm">Join Now</Button>
                                  <Button variant="outline" size="sm">
                                    Reschedule
                                  </Button>
                                </>
                              )}
                              {statusDisplay === "completed" && (
                                <Button variant="outline" size="sm">
                                  View Details
                                </Button>
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

      <Footer />
    </div>
  );
};

export default Consultations;
