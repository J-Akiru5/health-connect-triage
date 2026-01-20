import { useState } from "react";
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
} from "lucide-react";
import { format } from "date-fns";

interface Consultation {
  id: string;
  date: Date;
  time: string;
  provider: string;
  type: "in-person" | "teleconsultation";
  status: "upcoming" | "completed" | "cancelled";
  reason: string;
}

const Consultations = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    barangay: "",
    consultationType: "",
    reason: "",
  });

  // Mock data for existing consultations
  const [consultations] = useState<Consultation[]>([
    {
      id: "1",
      date: new Date(2026, 0, 15),
      time: "10:00 AM",
      provider: "Dr. Maria Santos - RHU",
      type: "teleconsultation",
      status: "upcoming",
      reason: "Follow-up for hypertension",
    },
    {
      id: "2",
      date: new Date(2025, 11, 20),
      time: "2:30 PM",
      provider: "BHW Juan Dela Cruz",
      type: "in-person",
      status: "completed",
      reason: "General check-up",
    },
  ]);

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

  const barangays = [
    "Barangay 1",
    "Barangay 2",
    "Barangay 3",
    "Barangay 4",
    "Barangay 5",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Booking consultation:", { selectedDate, selectedTime, formData });
    alert("Consultation booking request submitted! You will receive a confirmation shortly.");
    // Reset form
    setFormData({
      fullName: "",
      phoneNumber: "",
      barangay: "",
      consultationType: "",
      reason: "",
    });
    setSelectedTime("");
    setSelectedDate(new Date());
  };

  const getStatusBadge = (status: Consultation["status"]) => {
    switch (status) {
      case "upcoming":
        return <Badge className="bg-primary">Upcoming</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
    }
  };

  const getTypeIcon = (type: Consultation["type"]) => {
    return type === "teleconsultation" ? (
      <Video className="w-4 h-4" />
    ) : (
      <Stethoscope className="w-4 h-4" />
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Book a Consultation
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Schedule an appointment with healthcare providers at your local barangay health center or rural health unit.
            </p>
          </div>

          <Tabs defaultValue="book" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="book">Book Consultation</TabsTrigger>
              <TabsTrigger value="my-appointments">My Appointments</TabsTrigger>
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
                              <SelectItem key={barangay} value={barangay}>
                                {barangay}
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
                      <Button type="submit" size="lg" className="flex-1">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Book Consultation
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* My Appointments Tab */}
            <TabsContent value="my-appointments">
              {consultations.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Appointments Yet
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      You haven't booked any consultations yet. Book your first appointment above.
                    </p>
                    <Button onClick={() => document.querySelector('[value="book"]')?.click()}>
                      Book Now
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {consultations.map((consultation) => (
                    <Card key={consultation.id}>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              {getTypeIcon(consultation.type)}
                              <h3 className="text-lg font-semibold text-foreground">
                                {consultation.provider}
                              </h3>
                              {getStatusBadge(consultation.status)}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4" />
                                {format(consultation.date, "MMMM d, yyyy")}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {consultation.time}
                              </div>
                              <div className="flex items-center gap-2">
                                {consultation.type === "teleconsultation" ? (
                                  <>
                                    <Video className="w-4 h-4" />
                                    Teleconsultation
                                  </>
                                ) : (
                                  <>
                                    <Stethoscope className="w-4 h-4" />
                                    In-Person
                                  </>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Reason:</span> {consultation.reason}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {consultation.status === "upcoming" && (
                              <>
                                <Button variant="outline" size="sm">
                                  Reschedule
                                </Button>
                                <Button variant="outline" size="sm" className="text-destructive">
                                  Cancel
                                </Button>
                              </>
                            )}
                            {consultation.status === "completed" && (
                              <Button variant="outline" size="sm">
                                View Details
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
