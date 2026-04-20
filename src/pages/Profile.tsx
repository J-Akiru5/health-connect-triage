import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { TableRowsSkeleton } from "@/components/ui/loading-skeletons";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { User, FileText, Loader2, ArrowLeft, Settings, Sun, Moon, Monitor, Camera, Save } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { motion } from "framer-motion";
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO, format } from "date-fns";
import { showAlert } from "@/lib/alerts";

/* ─── Clinician Profile Schema ─── */
const clinicianProfileSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  assignedBarangayName: z.string().optional(),
});

type ClinicianProfileValues = z.infer<typeof clinicianProfileSchema>;

function ClinicianProfileForm({ user, profile }: { user: { id: string; email?: string } | null; profile: { full_name: string | null } | null }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { t } = useTranslation();
  const form = useForm<ClinicianProfileValues>({
    resolver: zodResolver(clinicianProfileSchema),
    defaultValues: { fullName: "", phone: "", assignedBarangayName: "" },
  });

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("full_name, phone, assigned_barangay_name, avatar_url").eq("id", user?.id ?? "").single();
      if (p) {
        form.reset({
          fullName: (p as any).full_name ?? "",
          phone: (p as any).phone ?? "",
          assignedBarangayName: (p as any).assigned_barangay_name ?? "",
        });
        setAvatarUrl((p as any).avatar_url);
      }
      setLoading(false);
    })();
  }, [user?.id, form]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      setAvatarUrl(publicUrl);
      showAlert.success("Photo Updated", "Your profile picture has been updated successfully.");
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      showAlert.error("Upload Failed", error.message || "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: ClinicianProfileValues) {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: values.fullName,
        phone: values.phone || null,
        assigned_barangay_name: values.assignedBarangayName?.trim() || null,
      })
      .eq("id", user.id);
    setSaving(false);
    
    if (error) {
      showAlert.error("Failed to update profile", error.message);
    } else {
      showAlert.success("Profile Updated", "Your clinician details have been saved.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-20 max-w-6xl">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-4">
                <Skeleton className="h-72 w-full rounded-2xl" />
                <Skeleton className="h-36 w-full rounded-2xl" />
              </div>
              <div className="lg:col-span-8 space-y-4">
                <Skeleton className="h-11 w-56 rounded-xl" />
                <TableRowsSkeleton rows={8} columns={2} />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20 flex-1 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground font-display">{t("profile.title")}</h1>
            <p className="text-muted-foreground">{t("profile.clinicianDetailsDesc")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Overview */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-border/60 overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/5" />
              <CardContent className="relative pt-0">
                <div className="flex flex-col items-center -mt-12">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl bg-background border-4 border-background shadow-xl flex items-center justify-center mb-4 overflow-hidden">
                      <Avatar className="w-full h-full rounded-none">
                        <AvatarImage src={avatarUrl || ""} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary rounded-none">
                          <User className="w-12 h-12" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        {uploading ? (
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        ) : (
                          <>
                            <Camera className="w-6 h-6 text-white mb-1" />
                            <span className="text-[10px] text-white font-bold uppercase">Change</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                      </label>
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-foreground text-center line-clamp-1">
                    {form.getValues("fullName") || profile?.full_name || "Clinician"}
                  </h2>
                  <p className="text-sm text-muted-foreground text-center mb-4 truncate w-full px-2">{user?.email}</p>
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                      {profile?.role || "Staff"}
                    </span>
                  </div>
                  
                  <Button 
                    onClick={() => form.handleSubmit(onSubmit)()}
                    disabled={saving}
                    className="w-full rounded-xl gap-2 shadow-lg shadow-primary/20 mb-4 h-11"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Profile
                  </Button>
                </div>

                <div className="space-y-4 pt-4 border-t border-border/60">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Account Status</span>
                    <span className="text-green-500 font-medium">Verified</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Location</span>
                    <span className="text-foreground">{form.getValues("assignedBarangayName") || "Not set"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your clinical credentials and assigned barangay are managed by the health facility administrator.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="flex w-fit bg-muted p-1 rounded-xl h-11">
                <TabsTrigger value="personal" className="rounded-lg px-6">{t("profile.personalInfo")}</TabsTrigger>
                <TabsTrigger value="settings" className="rounded-lg px-6">{t("profile.settings")}</TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Card className="border-border/60">
                      <CardHeader>
                        <CardTitle className="text-xl">{t("profile.clinicianDetails")}</CardTitle>
                        <CardDescription>{t("profile.clinicianDetailsDesc")}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6 pt-2">
                        <FormField
                          control={form.control}
                          name="fullName"
                          render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.name")}</FormLabel>
                          <FormControl>
                            <Input placeholder="Dr. Juan Dela Cruz" className="rounded-xl h-11" {...field} />
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
                          <FormLabel>{t("profile.contactNumber")}</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="0917-123-4567" className="rounded-xl h-11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <FormLabel>{t("auth.email")}</FormLabel>
                      <Input value={user?.email ?? ""} readOnly className="bg-muted rounded-xl h-11" />
                      <p className="text-xs text-muted-foreground">{t("profile.emailManaged")}</p>
                    </div>
                    <FormField
                      control={form.control}
                      name="assignedBarangayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.assignedBarangay")}</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Barangay Poblacion (optional)" className="rounded-xl h-11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={saving} size="lg" className="rounded-xl px-8 shadow-lg shadow-primary/20">
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("profile.saving")}
                      </>
                    ) : (
                      t("profile.saveChanges")
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  </main>
  <Footer />
</div>
);
}

/* ─── Settings Panel (shared between Patient and Clinician) ─── */
function SettingsPanel() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: "light", label: t("profile.lightMode"), icon: Sun },
    { value: "dark", label: t("profile.darkMode"), icon: Moon },
    { value: "system", label: t("profile.systemMode"), icon: Monitor },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Appearance */}
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("profile.appearance")}</CardTitle>
              <CardDescription>{t("profile.themeDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                  theme === opt.value
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border/60 hover:border-primary/30 hover:bg-muted/30"
                }`}
              >
                <opt.icon className={`w-5 h-5 ${theme === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${theme === opt.value ? "text-primary" : "text-foreground"}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">{t("profile.language")}</CardTitle>
          <CardDescription>{t("profile.languageDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher variant="full" />
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Patient Profile Schema ─── */
const profileSchema = z.object({
  lastName: z.string().optional(),
  firstName: z.string().optional(),
  middleInitial: z.string().max(5).optional(),
  dateOfBirth: z.string().optional(),
  sex: z.string().optional(),
  street: z.string().optional(),
  barangayName: z.string().optional(),
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
  const { user, profile, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [patientProfile, setPatientProfile] = useState<{
    first_name: string | null;
    last_name: string | null;
    middle_initial: string | null;
    date_of_birth: string | null;
    sex: string | null;
    street: string | null;
    barangay_name: string | null;
    city: string | null;
    province: string | null;
    zip_code: string | null;
    contact_phone: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
  } | null>(null);
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
      lastName: "", firstName: "", middleInitial: "", dateOfBirth: "", sex: "",
      street: "", barangayName: "", city: "", province: "", zipCode: "",
      contactPhone: "", emergencyContactName: "", emergencyContactPhone: "",
      conditions: "", medications: "", allergies: "", pregnancyStatus: "", notes: "",
    },
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id || profile?.role !== "patient") {
      setLoading(false);
      return;
    }
    (async () => {
      const [pp, mh] = await Promise.all([
        supabase.from("patient_profiles").select("first_name, last_name, middle_initial, date_of_birth, sex, street, barangay_name, city, province, zip_code, contact_phone, emergency_contact_name, emergency_contact_phone").eq("user_id", user.id).maybeSingle(),
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
        form.setValue("barangayName", pp.data.barangay_name ?? "");
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
      
      const { data: p } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single();
      if (p) setAvatarUrl((p as any).avatar_url);
      
      setLoading(false);
    })();
  }, [user?.id, profile?.role, authLoading]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      setAvatarUrl(publicUrl);
      showAlert.success("Photo Updated", "Your profile picture has been updated successfully.");
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      showAlert.error("Upload Failed", error.message || "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

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
          first_name: values.firstName || null, last_name: values.lastName || null,
          middle_initial: values.middleInitial || null, date_of_birth: values.dateOfBirth || null,
          sex: values.sex || null, street: values.street || null,
          barangay_name: values.barangayName?.trim() || null,
          city: values.city || null, province: values.province || null,
          zip_code: values.zipCode || null, contact_phone: values.contactPhone || null,
          emergency_contact_name: values.emergencyContactName || null,
          emergency_contact_phone: values.emergencyContactPhone || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      await supabase.from("medical_histories").upsert(
        {
          user_id: user.id,
          conditions: values.conditions || null, medications: values.medications || null,
          allergies: values.allergies || null, pregnancy_status: values.pregnancyStatus || null,
          notes: values.notes || null, updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      showAlert.success("Profile Updated", "Your medical and personal information have been saved.");
    } catch (err: any) {
      showAlert.error("Failed to update profile", err.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-20 max-w-6xl">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-4">
                <Skeleton className="h-72 w-full rounded-2xl" />
                <Skeleton className="h-36 w-full rounded-2xl" />
              </div>
              <div className="lg:col-span-8 space-y-4">
                <Skeleton className="h-11 w-56 rounded-xl" />
                <TableRowsSkeleton rows={8} columns={2} />
              </div>
            </div>
          </div>
        </main>
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
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>{t("profile.title")}</CardTitle>
              <CardDescription>{profile?.full_name ?? user?.email}</CardDescription>
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
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20 flex-1 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-foreground font-display">{t("profile.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("profile.keepInfoUpdated")}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Overview */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-border/60 overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/5" />
              <CardContent className="relative pt-0">
                <div className="flex flex-col items-center -mt-12">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl bg-background border-4 border-background shadow-xl flex items-center justify-center mb-4 overflow-hidden">
                      <Avatar className="w-full h-full rounded-none">
                        <AvatarImage src={avatarUrl || ""} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary rounded-none">
                          <User className="w-12 h-12" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        {uploading ? (
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        ) : (
                          <>
                            <Camera className="w-6 h-6 text-white mb-1" />
                            <span className="text-[10px] text-white font-bold uppercase">Change</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                      </label>
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-foreground text-center line-clamp-1">
                    {profile?.full_name || "Patient"}
                  </h2>
                  <p className="text-sm text-muted-foreground text-center mb-4 truncate w-full px-2">{user?.email}</p>
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                      {profile?.role || "Patient"}
                    </span>
                  </div>
                  
                  <Button 
                    onClick={() => form.handleSubmit(onSubmit)()}
                    disabled={saving}
                    className="w-full rounded-xl gap-2 shadow-lg shadow-primary/20 mb-4 h-11"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Profile
                  </Button>
                </div>

                <div className="space-y-4 pt-4 border-t border-border/60">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Account Status</span>
                    <span className="text-green-500 font-medium">Active</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Barangay</span>
                    <span className="text-foreground">{patientProfile?.barangay_name || "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${medicalHistory ? "bg-green-500" : "bg-amber-500"}`} />
                  <span className="text-sm text-foreground">
                    {medicalHistory ? "Medical record complete" : "Medical record incomplete"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="flex w-fit bg-muted p-1 rounded-xl h-11">
                <TabsTrigger value="personal" className="rounded-lg px-6">{t("profile.personalInfo")}</TabsTrigger>
                <TabsTrigger value="settings" className="rounded-lg px-6">{t("profile.settings")}</TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Full Name */}
                  <Card className="border-border/60">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{t("profile.fullNameSection")}</CardTitle>
                          <CardDescription>{t("profile.fullNameDesc")}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField control={form.control} name="lastName" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.lastName")}</FormLabel>
                            <FormControl><Input placeholder={profile?.full_name?.split(' ').slice(1).join(' ') || ""} className="rounded-xl h-11" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="firstName" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.firstName")}</FormLabel>
                            <FormControl><Input placeholder={profile?.full_name?.split(' ')[0] || ""} className="rounded-xl h-11" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="middleInitial" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.middleInitial")}</FormLabel>
                            <FormControl><Input placeholder="" className="rounded-xl h-11" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="mb-2">{t("auth.dateOfBirth")}</FormLabel>
                            <FormControl>
                              <DatePicker
                                date={field.value ? parseISO(field.value) : undefined}
                                setDate={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                placeholder={t("auth.dateOfBirth")}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="sex" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.selectSex")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? ""}>
                              <FormControl>
                                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder={t("auth.selectSex")} /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">{t("auth.male")}</SelectItem>
                                <SelectItem value="female">{t("auth.female")}</SelectItem>
                                <SelectItem value="other">{t("auth.other")}</SelectItem>
                                <SelectItem value="prefer_not_to_say">{t("auth.preferNotToSay")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Address */}
                  <Card className="border-border/60">
                    <CardHeader>
                      <CardTitle className="text-lg">{t("profile.address")}</CardTitle>
                      <CardDescription>{t("profile.addressDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="street" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.streetPurok")}</FormLabel>
                          <FormControl><Input placeholder={patientProfile?.street || ""} className="rounded-xl h-11" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="barangayName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.barangay")}</FormLabel>
                          <FormControl><Input placeholder={patientProfile?.barangay_name || ""} className="rounded-xl h-11" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="city" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.cityMunicipality")}</FormLabel>
                            <FormControl><Input placeholder={patientProfile?.city || ""} className="rounded-xl h-11" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="province" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.province")}</FormLabel>
                            <FormControl><Input placeholder={patientProfile?.province || ""} className="rounded-xl h-11" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="zipCode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.zipCode")}</FormLabel>
                          <FormControl><Input placeholder={patientProfile?.zip_code || ""} className="rounded-xl h-11" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </CardContent>
                  </Card>

                  {/* Contact */}
                  <Card className="border-border/60">
                    <CardHeader>
                      <CardTitle className="text-lg">{t("profile.contactInfo")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField control={form.control} name="contactPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.phoneNumber")}</FormLabel>
                          <FormControl><Input type="tel" placeholder={patientProfile?.contact_phone || ""} className="rounded-xl h-11" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </CardContent>
                  </Card>

                  {/* Emergency Contact */}
                  <Card className="border-border/60">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{t("profile.emergencyContact")}</CardTitle>
                          <CardDescription>{t("profile.emergencyContactDesc")}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.emergencyName")}</FormLabel>
                          <FormControl><Input placeholder="Full name" className="rounded-xl h-11" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.emergencyPhone")}</FormLabel>
                          <FormControl><Input type="tel" placeholder="09XX XXX XXXX" className="rounded-xl h-11" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </CardContent>
                  </Card>

                  {/* Medical History */}
                  <Card className="border-border/60">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{t("profile.medicalHistory")}</CardTitle>
                          <CardDescription>{t("profile.medicalHistoryDesc")}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="conditions" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.existingConditions")}</FormLabel>
                          <FormControl><Textarea placeholder="e.g. Hypertension, diabetes" rows={3} className="rounded-xl" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="medications" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.currentMedications")}</FormLabel>
                          <FormControl><Textarea rows={2} className="rounded-xl" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="allergies" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.allergies")}</FormLabel>
                          <FormControl><Textarea rows={2} className="rounded-xl" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="pregnancyStatus" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.pregnancyStatus")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="not_applicable">{t("profile.notApplicable")}</SelectItem>
                              <SelectItem value="not_pregnant">{t("profile.notPregnant")}</SelectItem>
                              <SelectItem value="pregnant">{t("profile.pregnant")}</SelectItem>
                              <SelectItem value="prefer_not_to_say">{t("auth.preferNotToSay")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.otherNotes")}</FormLabel>
                          <FormControl><Textarea rows={2} className="rounded-xl" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </CardContent>
                  </Card>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" size="lg" disabled={saving} className="rounded-xl px-8 shadow-lg shadow-primary/20">
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t("profile.saving")}
                        </>
                      ) : (
                        t("profile.saveProfile")
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="settings">
              <SettingsPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
    <Footer />
  </div>
  );
}
