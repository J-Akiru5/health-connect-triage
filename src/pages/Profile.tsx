import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { User, FileText, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const clinicianProfileSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  assignedBarangayId: z.string().uuid().optional().or(z.literal("")),
});

type ClinicianProfileValues = z.infer<typeof clinicianProfileSchema>;

function ClinicianProfileForm({ user, profile }: { user: { id: string; email?: string } | null; profile: { full_name: string | null } | null }) {
  const [barangays, setBarangays] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const form = useForm<ClinicianProfileValues>({
    resolver: zodResolver(clinicianProfileSchema),
    defaultValues: { fullName: "", phone: "", assignedBarangayId: "" },
  });

  useEffect(() => {
    (async () => {
      const { data: b } = await supabase.from("barangays").select("id, name").order("name");
      setBarangays(b ?? []);
      const { data: p } = await supabase.from("profiles").select("full_name, phone, assigned_barangay_id").eq("id", user?.id ?? "").single();
      if (p) {
        form.reset({
          fullName: (p as { full_name: string | null }).full_name ?? "",
          phone: (p as { phone?: string }).phone ?? "",
          assignedBarangayId: (p as { assigned_barangay_id?: string }).assigned_barangay_id ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user?.id, form]);

  async function onSubmit(values: ClinicianProfileValues) {
    if (!user?.id) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        full_name: values.fullName,
        phone: values.phone || null,
        assigned_barangay_id: values.assignedBarangayId || null,
      })
      .eq("id", user.id);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20 max-w-xl">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Update profile</h1>
            <p className="text-sm text-muted-foreground">Name, contact, and assigned barangay</p>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Clinician details</CardTitle>
                <CardDescription>Update your display name and contact information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Dr. Juan Dela Cruz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact number</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="0917-123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormLabel>Email</FormLabel>
                  <Input value={user?.email ?? ""} readOnly className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email is managed by your account and cannot be changed here.</p>
                </div>
                <FormField
                  control={form.control}
                  name="assignedBarangayId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned barangay</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select barangay (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {barangays.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/dashboard">Cancel</Link>
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}

const profileSchema = z.object({
  lastName: z.string().optional(),
  firstName: z.string().optional(),
  middleInitial: z.string().max(5).optional(),
  dateOfBirth: z.string().optional(),
  sex: z.string().optional(),
  street: z.string().optional(),
  barangayId: z.string().uuid().optional().or(z.literal("")),
  city: z.string().optional(),
  province: z.string().optional(),
  zipCode: z.string().optional(),
  contactPhone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  conditions: z.string().optional(),
  medications: z.string().optional(),
  allergies: z.string().optional(),
  pregnancyStatus: z.string().optional(),
  notes: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patientProfile, setPatientProfile] = useState<{
    first_name: string | null;
    last_name: string | null;
    middle_initial: string | null;
    date_of_birth: string | null;
    sex: string | null;
    street: string | null;
    barangay_id: string | null;
    city: string | null;
    province: string | null;
    zip_code: string | null;
    contact_phone: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
  } | null>(null);
  const [barangays, setBarangays] = useState<{ id: string; name: string }[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<{
    conditions: string | null;
    medications: string | null;
    allergies: string | null;
    pregnancy_status: string | null;
    notes: string | null;
  } | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      lastName: "",
      firstName: "",
      middleInitial: "",
      dateOfBirth: "",
      sex: "",
      street: "",
      barangayId: "",
      city: "",
      province: "",
      zipCode: "",
      contactPhone: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      conditions: "",
      medications: "",
      allergies: "",
      pregnancyStatus: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!user?.id || profile?.role !== "patient") {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: barData } = await supabase.from("barangays").select("id, name").order("name");
      setBarangays(barData ?? []);
      const [pp, mh] = await Promise.all([
        supabase.from("patient_profiles").select("first_name, last_name, middle_initial, date_of_birth, sex, street, barangay_id, city, province, zip_code, contact_phone, emergency_contact_name, emergency_contact_phone").eq("user_id", user.id).maybeSingle(),
        supabase.from("medical_histories").select("conditions, medications, allergies, pregnancy_status, notes").eq("user_id", user.id).maybeSingle(),
      ]);
      if (pp.data) {
        setPatientProfile(pp.data);
        form.setValue("firstName", pp.data.first_name ?? "");
        form.setValue("lastName", pp.data.last_name ?? "");
        form.setValue("middleInitial", pp.data.middle_initial ?? "");
        form.setValue("dateOfBirth", pp.data.date_of_birth ?? "");
        form.setValue("sex", pp.data.sex ?? "");
        form.setValue("street", pp.data.street ?? "");
        form.setValue("barangayId", pp.data.barangay_id ?? "");
        form.setValue("city", pp.data.city ?? "");
        form.setValue("province", pp.data.province ?? "");
        form.setValue("zipCode", pp.data.zip_code ?? "");
        form.setValue("contactPhone", pp.data.contact_phone ?? "");
        form.setValue("emergencyContactName", pp.data.emergency_contact_name ?? "");
        form.setValue("emergencyContactPhone", pp.data.emergency_contact_phone ?? "");
      }
      if (mh.data) {
        setMedicalHistory(mh.data);
        form.setValue("conditions", mh.data.conditions ?? "");
        form.setValue("medications", mh.data.medications ?? "");
        form.setValue("allergies", mh.data.allergies ?? "");
        form.setValue("pregnancyStatus", mh.data.pregnancy_status ?? "");
        form.setValue("notes", mh.data.notes ?? "");
      }
      setLoading(false);
    })();
  }, [user?.id, profile?.role]);

  async function onSubmit(values: ProfileFormValues) {
    if (!user?.id || profile?.role !== "patient") return;
    setSaving(true);
    try {
      const fullName = [values.firstName, values.middleInitial, values.lastName].filter(Boolean).join(" ").trim() || profile?.full_name;
      if (fullName) {
        await supabase.from("profiles").update({ full_name: fullName, updated_at: new Date().toISOString() }).eq("id", user.id);
      }
      await supabase.from("patient_profiles").upsert(
        {
          user_id: user.id,
          first_name: values.firstName || null,
          last_name: values.lastName || null,
          middle_initial: values.middleInitial || null,
          date_of_birth: values.dateOfBirth || null,
          sex: values.sex || null,
          street: values.street || null,
          barangay_id: values.barangayId || null,
          city: values.city || null,
          province: values.province || null,
          zip_code: values.zipCode || null,
          contact_phone: values.contactPhone || null,
          emergency_contact_name: values.emergencyContactName || null,
          emergency_contact_phone: values.emergencyContactPhone || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      await supabase.from("medical_histories").upsert(
        {
          user_id: user.id,
          conditions: values.conditions || null,
          medications: values.medications || null,
          allergies: values.allergies || null,
          pregnancy_status: values.pregnancyStatus || null,
          notes: values.notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      setPatientProfile({
        first_name: values.firstName || null,
        last_name: values.lastName || null,
        middle_initial: values.middleInitial || null,
        date_of_birth: values.dateOfBirth || null,
        sex: values.sex || null,
        street: values.street || null,
        barangay_id: values.barangayId || null,
        city: values.city || null,
        province: values.province || null,
        zip_code: values.zipCode || null,
        contact_phone: values.contactPhone || null,
        emergency_contact_name: values.emergencyContactName || null,
        emergency_contact_phone: values.emergencyContactPhone || null,
      });
      setMedicalHistory({
        conditions: values.conditions || null,
        medications: values.medications || null,
        allergies: values.allergies || null,
        pregnancy_status: values.pregnancyStatus || null,
        notes: values.notes || null,
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading profile…</p>
      </div>
    );
  }

  if (profile?.role === "clinician") {
    return <ClinicianProfileForm user={user} profile={profile} />;
  }

  if (profile?.role !== "patient") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>You are signed in as {profile?.full_name ?? user?.email}.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Profile editing is available for patients and clinicians only.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Update Profile</h1>
            <p className="text-muted-foreground mt-1">
              Keep your name, address, contact, and health information up to date.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Full name</CardTitle>
                  <CardDescription>Last, first, and middle initial</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last name</FormLabel>
                          <FormControl>
                            <Input placeholder="Dela Cruz" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First name</FormLabel>
                          <FormControl>
                            <Input placeholder="Juan" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="middleInitial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Middle initial</FormLabel>
                          <FormControl>
                            <Input placeholder="M." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of birth (YYYY-MM-DD)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sex</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Address</CardTitle>
                  <CardDescription>Street, barangay, city, province, ZIP</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street / Purok</FormLabel>
                        <FormControl>
                          <Input placeholder="Purok 5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="barangayId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barangay</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select barangay" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {barangays.map((b) => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City / Municipality</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Province</FormLabel>
                          <FormControl>
                            <Input placeholder="Province" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP code</FormLabel>
                        <FormControl>
                          <Input placeholder="1234" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact info</CardTitle>
                  <CardDescription>Phone number</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="09XX XXX XXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Emergency contact</CardTitle>
                  <CardDescription>Used in case of emergency or if we need to reach someone on your behalf.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency contact name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergencyContactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency contact phone</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="09XX XXX XXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Medical history</CardTitle>
                  <CardDescription>Existing conditions, medications, and allergies help us provide better triage and advice.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="conditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Existing conditions</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g. Hypertension, diabetes" rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="medications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current medications</FormLabel>
                        <FormControl>
                          <Textarea placeholder="List current medications" rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="allergies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allergies</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Known allergies" rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pregnancyStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pregnancy status (if applicable)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="not_applicable">Not applicable</SelectItem>
                            <SelectItem value="not_pregnant">Not pregnant</SelectItem>
                            <SelectItem value="pregnant">Pregnant</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any other health information" rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Button type="submit" size="lg" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save profile"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
