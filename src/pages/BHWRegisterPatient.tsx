import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, adminAuthClient } from "@/lib/supabase";
import { ArrowLeft, UserPlus } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO, format } from "date-fns";
import { Footer } from "@/components/Footer";
import Swal from 'sweetalert2';

type Sex = "male" | "female" | "other" | "prefer_not_to_say";

export default function BHWRegisterPatient() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedBarangayName, setAssignedBarangayName] = useState<string>("");

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [street, setStreet] = useState("");
  const [barangayName, setBarangayName] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [email, setEmail] = useState("");
  const [careConsent, setCareConsent] = useState(false);
  const [researchConsent, setResearchConsent] = useState(false);

  const isBhw = profile?.role === "bhw";

  useEffect(() => {
    (async () => {
      if (user?.id && isBhw) {
        const { data: p } = await supabase.from("profiles").select("assigned_barangay_name").eq("id", user.id).single();
        const name = (p as { assigned_barangay_name?: string | null } | null)?.assigned_barangay_name ?? "";
        setAssignedBarangayName(name);
        setBarangayName(name);
      }
      setLoading(false);
    })();
  }, [user?.id, isBhw]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !careConsent) {
      Swal.fire("Error", "Please fill required fields and agree to care consent.", "error");
      return;
    }
    
    setLoading(true);
    try {
      const generatedPassword = Math.random().toString(36).slice(-10) + "A1!";
      
      const { data: newAuthData, error: authError } = await adminAuthClient.auth.admin.createUser({
        email: email.trim(),
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          role: "patient",
        }
      });
      
      if (authError) throw authError;
      
      const newUserId = newAuthData.user.id;
      
      const { error: profileError } = await adminAuthClient.from("profiles").update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        role: "patient",
      }).eq("id", newUserId);
      if (profileError) throw profileError;

      const { error: patientError } = await adminAuthClient.from("patient_profiles").insert({
        user_id: newUserId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        middle_initial: middleInitial.trim() || null,
        date_of_birth: dateOfBirth || null,
        sex: sex || null,
        street: street.trim() || null,
        barangay_name: barangayName.trim() || null,
        city: city.trim() || null,
        province: province.trim() || null,
        zip_code: zipCode.trim() || null,
        contact_phone: contactPhone.trim() || null,
      });
      if (patientError) throw patientError;

      await adminAuthClient.from("consent_records").insert({
        user_id: newUserId,
        care_consent: careConsent,
        research_consent: researchConsent,
        consent_date: new Date().toISOString()
      });

      Swal.fire({
        title: "Patient Registered!",
        html: `Patient account created successfully.<br><br><b>Email:</b> ${email.trim()}<br><b>Temporary Password:</b> ${generatedPassword}<br><br>Please provide this password to the patient.`,
        icon: "success",
        confirmButtonColor: "#0f766e"
      }).then(() => {
        navigate("/dashboard");
      });
      
    } catch (error: any) {
      console.error(error);
      Swal.fire("Registration Failed", error.message || "Could not register patient", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!user || !isBhw) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-20 text-center flex-1 max-w-5xl">
          <p className="text-muted-foreground">Access limited to Barangay Health Workers.</p>
          <Button asChild className="mt-4">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-20 pb-24 flex-1 max-w-5xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Register New Patient</h1>
              <p className="text-sm text-muted-foreground">Assisted registration for your barangay. Completes on signup page.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full name */}
          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Full name</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dela Cruz" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Juan" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Middle initial</Label>
                  <Input value={middleInitial} onChange={(e) => setMiddleInitial(e.target.value)} placeholder="M" maxLength={5} className="rounded-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DOB & Sex */}
          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Date of birth & sex</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 flex flex-col">
                <Label>Date of birth (Kaarawan)</Label>
                <DatePicker
                  date={dateOfBirth ? parseISO(dateOfBirth) : undefined}
                  setDate={(date) => setDateOfBirth(date ? format(date, "yyyy-MM-dd") : "")}
                  placeholder="Select birthday"
                />
              </div>
              <div className="space-y-2">
                <Label>Sex</Label>
                <Select value={sex} onValueChange={(v) => setSex(v as Sex)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Street / Purok</Label>
                <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Purok 5" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Barangay</Label>
                <Input
                  value={barangayName}
                  onChange={(e) => setBarangayName(e.target.value)}
                  placeholder="Type barangay"
                  className="rounded-xl"
                  disabled={loading && !!assignedBarangayName}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City / Municipality</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Province</Label>
                  <Input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Province" className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ZIP code</Label>
                <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="ZIP" className="rounded-xl max-w-[140px]" />
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Phone number</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="09XX XXX XXXX" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Email (for account)</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="patient@example.com" className="rounded-xl" />
              </div>
            </CardContent>
          </Card>

          {/* Consent */}
          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Consent</CardTitle>
              <CardDescription>Required for care; optional for research.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={careConsent} onCheckedChange={(c) => setCareConsent(!!c)} />
                <span className="text-sm font-medium">Consent for care & telehealth</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={researchConsent} onCheckedChange={(c) => setResearchConsent(!!c)} />
                <span className="text-sm font-medium">Consent for research (optional)</span>
              </label>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" className="rounded-xl gap-2" disabled={!firstName.trim() || !lastName.trim() || !email.trim() || !careConsent}>
              <UserPlus className="w-4 h-4" />
              Continue to complete registration
            </Button>
            <Button type="button" variant="outline" size="lg" className="rounded-xl" asChild>
              <Link to="/dashboard">Cancel</Link>
            </Button>
          </div>
        </form>

        <p className="text-xs text-muted-foreground mt-6">
          You will be taken to the signup page with these details. Set the patient&apos;s password there to finish. After signup, log out and log back in as BHW to return to the dashboard.
        </p>
      </main>
      <Footer />
    </div>
  );
}
