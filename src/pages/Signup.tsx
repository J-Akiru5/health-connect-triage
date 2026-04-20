import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/database.types";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Shield, UserPlus, MapPin, CheckCircle2 } from "lucide-react";
import { SITE_BARANGAY } from "@/lib/site";
import { safeInternalPath } from "@/lib/safePath";
import { AppLogoMark } from "@/components/AppLogoMark";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO, format } from "date-fns";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "patient", label: "Patient" },
  { value: "bhw", label: "Barangay Health Worker (BHW)" },
  { value: "clinician", label: "Nurse / Doctor" },
  { value: "admin", label: "System Administrator" },
];

const signupSchema = z.object({
  fullName: z.string().max(200, "Name too long").optional().or(z.literal("")),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().optional().or(z.literal("")),
  role: z.enum(["patient", "bhw", "clinician", "admin"] as const),
  // Patient: broken-down name
  lastName: z.string().optional(),
  firstName: z.string().optional(),
  middleInitial: z.string().max(5).optional(),
  dateOfBirth: z.string().optional(),
  sex: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  street: z.string().optional(),
  barangayName: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  zipCode: z.string().optional(),
  contactPhone: z.string().optional(),
  careConsent: z.boolean().optional(),
  researchConsent: z.boolean().optional(),
})
  .refine((d) => d.role === "patient" || !!d.fullName?.trim(), { message: "Full name is required", path: ["fullName"] })
  .superRefine((d, ctx) => {
    if (d.role !== "patient") return;

    const requireTrimmed = (key: keyof typeof d, label: string) => {
      const v = d[key as keyof typeof d];
      if (typeof v !== "string" || !v.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${label} is required` });
      }
    };

    requireTrimmed("lastName", "Last name");
    requireTrimmed("firstName", "First name");
    requireTrimmed("middleInitial", "Middle initial");
    requireTrimmed("dateOfBirth", "Date of birth");
    requireTrimmed("street", "Street / Purok");
    requireTrimmed("barangayName", "Barangay");
    requireTrimmed("city", "City / Municipality");
    requireTrimmed("province", "Province");
    requireTrimmed("zipCode", "ZIP code");
    requireTrimmed("contactPhone", "Phone number");
    requireTrimmed("confirmPassword", "Confirm password");

    if (!d.sex) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sex"], message: "Sex is required" });
    }

    if (d.password !== d.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords must match" });
    }

    if (d.careConsent !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["careConsent"],
        message: "You must accept the care consent to register.",
      });
    }
  });

type SignupFormValues = z.infer<typeof signupSchema>;

const CONSENT_VERSION = "1.0";
const PENDING_ASSESSMENT_LS_KEY = "bhc_pending_symptom_assessment_id";

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, error, clearError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const fromRaw = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const from = safeInternalPath(fromRaw, "/");
  const bhwPrefill = (location.state as { bhwPrefill?: Partial<SignupFormValues> } | null)?.bhwPrefill;

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "patient",
      lastName: "",
      firstName: "",
      middleInitial: "",
      dateOfBirth: "",
      sex: undefined,
      street: "",
      barangayName: "",
      city: "",
      province: "",
      zipCode: "",
      contactPhone: "",
      careConsent: false,
      researchConsent: false,
    },
  });

  const role = form.watch("role");
  const careConsent = form.watch("careConsent");
  const isPatient = role === "patient";
  const maxStep = isPatient ? 4 : 1;

  useEffect(() => {
    if (!bhwPrefill) return;
    const fullName = [bhwPrefill.firstName, bhwPrefill.middleInitial, bhwPrefill.lastName].filter(Boolean).join(" ").trim();
    form.reset({
      fullName: fullName || "",
      email: bhwPrefill.email ?? "",
      password: "",
      confirmPassword: "",
      role: "patient",
      lastName: bhwPrefill.lastName ?? "",
      firstName: bhwPrefill.firstName ?? "",
      middleInitial: bhwPrefill.middleInitial ?? "",
      dateOfBirth: bhwPrefill.dateOfBirth ?? "",
      sex: bhwPrefill.sex,
      street: bhwPrefill.street ?? "",
      barangayName: "",
      city: bhwPrefill.city ?? "",
      province: bhwPrefill.province ?? "",
      zipCode: bhwPrefill.zipCode ?? "",
      contactPhone: bhwPrefill.contactPhone ?? "",
      careConsent: bhwPrefill.careConsent ?? false,
      researchConsent: bhwPrefill.researchConsent ?? false,
    });
  }, [bhwPrefill]);

  async function onSubmit(values: SignupFormValues) {
    if (values.role === "patient" && !values.careConsent) {
      form.setError("careConsent", { message: "You must accept care consent to register." });
      setStep(4);
      return;
    }
    const displayName = isPatient && values.firstName != null && values.lastName != null
      ? [values.firstName, values.middleInitial, values.lastName].filter(Boolean).join(" ").trim()
      : values.fullName;
    clearError();
    setIsSubmitting(true);
    try {
      const result = await signUp(
        values.email,
        values.password,
        displayName as string,
        values.role as UserRole
      );
      if (result?.userId && values.role === "patient") {
        const typedBarangay = (values.barangayName ?? "").trim().replace(/\s+/g, " ");
        const resolvedBarangayId = null;
        await supabase.from("patient_profiles").insert({
          user_id: result.userId,
          last_name: values.lastName || null,
          first_name: values.firstName || null,
          middle_initial: values.middleInitial || null,
          date_of_birth: values.dateOfBirth || null,
          sex: values.sex ?? null,
          street: values.street || null,
          barangay_id: resolvedBarangayId,
          barangay_name: typedBarangay || null,
          city: values.city || null,
          province: values.province || null,
          zip_code: values.zipCode || null,
          contact_phone: values.contactPhone || null,
        });
        await supabase.from("consent_records").insert([
          {
            user_id: result.userId,
            consent_type: "care",
            version: CONSENT_VERSION,
          },
          ...(values.researchConsent
            ? [
                {
                  user_id: result.userId,
                  consent_type: "research",
                  version: CONSENT_VERSION,
                },
              ]
            : []),
        ]);
        if (bhwPrefill) {
          await supabase.from("notifications").insert({
            user_id: result.userId,
            message: "Welcome! Your account has been registered by your Barangay Health Worker.",
            type: "system",
          });
        }
      }

      if (result?.userId) {
        try {
          const pendingId = localStorage.getItem(PENDING_ASSESSMENT_LS_KEY);
          if (pendingId) {
            const { error: claimErr } = await supabase
              .from("symptom_assessments")
              .update({ user_id: result.userId })
              .eq("id", pendingId)
              .is("user_id", null);
            if (!claimErr) {
              localStorage.removeItem(PENDING_ASSESSMENT_LS_KEY);
            }
          } else {
            const normalized = normalizeName(displayName as string);
            const { data: candidates, error: findErr } = await supabase
              .from("symptom_assessments")
              .select("id, created_at, vitals")
              .is("user_id", null)
              .order("created_at", { ascending: false })
              .limit(20);
            if (!findErr && candidates?.length) {
              const match = candidates.find((c: any) => {
                const name = typeof c?.vitals?.patient_name === "string" ? c.vitals.patient_name : "";
                return normalizeName(name) === normalized;
              });
              if (match?.id) {
                await supabase
                  .from("symptom_assessments")
                  .update({ user_id: result.userId })
                  .eq("id", match.id)
                  .is("user_id", null);
              }
            }
          }
        } catch {
          // ignore
        }
      }
      navigate(from, { replace: true });
    } catch {
      //
    } finally {
      setIsSubmitting(false);
    }
  }

  function onInvalidSubmit(errs: any) {
    if (errs.email || errs.password || errs.confirmPassword || errs.fullName || errs.role) {
      setStep(1); return;
    }
    if (errs.lastName || errs.firstName || errs.middleInitial || errs.dateOfBirth || errs.sex) {
      setStep(2); return;
    }
    if (errs.street || errs.barangayName || errs.city || errs.province || errs.zipCode || errs.contactPhone) {
      setStep(3); return;
    }
    if (errs.careConsent || errs.researchConsent) {
      setStep(4);
    }
  }

  function handleNext() {
    if (step < maxStep) setStep(step + 1);
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      <Navigation />
      
      <main className="min-h-screen flex flex-col lg:flex-row">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-[40%] xl:w-[45%] relative overflow-hidden bg-foreground">
          <div className="absolute inset-0 gradient-hero opacity-85" />
          <div className="absolute inset-0 noise-overlay opacity-40" />
          
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] pointer-events-none"
          />
          
          <div className="relative z-10 w-full flex flex-col justify-center px-12 xl:px-20 py-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-10 shadow-2xl"
            >
              <AppLogoMark className="w-8 h-8 text-primary-foreground" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
            >
              <h2 className="text-4xl xl:text-5xl font-display font-bold text-primary-foreground leading-[1.1] tracking-tight">
                {bhwPrefill ? "Completing your official health record" : "Join the healthcare revolution in Tabat"}
              </h2>
              
              <div className="space-y-6">
                {[
                  { icon: CheckCircle2, text: "Official Digital Health ID" },
                  { icon: Shield, text: "Privacy Protected by Law" },
                  { icon: UserPlus, text: "Instant Triage & Referrals" }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                      <item.icon className="w-5 h-5 text-home-care" />
                    </div>
                    <span className="text-lg font-medium text-primary-foreground/80">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
          
          <div className="absolute bottom-12 left-12 xl:left-20">
            <div className="flex items-center gap-3 text-primary-foreground/30 text-xs font-bold uppercase tracking-[0.2em]">
              <div className="w-2 h-2 rounded-full bg-home-care pulse-ring" />
              <span>Verifying {SITE_BARANGAY} Health Records 2026</span>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col relative bg-background">
          <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 py-24 lg:py-16">
            <div className="w-full max-w-[500px]">
              {/* Mobile Header */}
              <div className="lg:hidden mb-10 flex flex-col items-center text-center">
                <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                    <AppLogoMark className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-display font-bold text-foreground">TeleHealth</span>
                </Link>
                <h1 className="text-3xl font-display font-bold text-foreground">{t("auth.createAccount")}</h1>
              </div>

              {/* Desktop Header Content */}
              <div className="hidden lg:block mb-8">
                <h1 className="text-3xl xl:text-4xl font-display font-bold text-foreground tracking-tight mb-2">
                  {t("auth.createAccount")}
                </h1>
                <p className="text-muted-foreground text-lg">
                  {bhwPrefill && isPatient ? t("auth.bhwPrefillMessage") : t("auth.signupSubtitle")}
                </p>
              </div>

              {/* Progress Indicator */}
              {isPatient && (
                <div className="mb-10">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3 px-1">
                    <span>STEP {step} OF {maxStep}</span>
                    <span>{step === 1 ? "Account" : step === 2 ? "Identity" : step === 3 ? "Location" : "Legal"}</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(step / maxStep) * 100}%` }}
                      className="h-full bg-primary"
                    />
                  </div>
                </div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-8 text-sm font-semibold text-destructive bg-destructive/[0.03] border border-destructive/10 rounded-2xl px-5 py-4 flex items-center gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  {error}
                </motion.div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-8">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-6"
                    >
                      {step === 1 && (
                        <div className="space-y-5">
                          {!isPatient && (
                            <FormField
                              control={form.control}
                              name="fullName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("auth.fullName")}</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Juan Dela Cruz" className="rounded-2xl h-14 bg-muted/30 border-border/40 focus:bg-background px-5" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("auth.email")}</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="you@example.com" className="rounded-2xl h-14 bg-muted/30 border-border/40 focus:bg-background px-5" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                             <FormField
                              control={form.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("auth.password")}</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="rounded-2xl h-14 pr-12 bg-muted/30 border-border/40 focus:bg-background px-5"
                                        {...field}
                                      />
                                      <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      </Button>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            {isPatient && (
                              <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("auth.confirmPassword")}</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <Input
                                          type={showConfirmPassword ? "text" : "password"}
                                          placeholder="••••••••"
                                          className="rounded-2xl h-14 pr-12 bg-muted/30 border-border/40 focus:bg-background px-5"
                                          {...field}
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                          <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("auth.iAmA")}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="rounded-2xl h-14 bg-muted/30 border-border/40 px-5">
                                      <SelectValue placeholder={t("auth.selectRole")} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-xl">
                                    {ROLES.map((r) => (
                                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {step === 2 && isPatient && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <FormField
                              control={form.control}
                              name="firstName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("auth.firstName")}</FormLabel>
                                  <FormControl><Input placeholder="Juan" className="rounded-2xl h-14 px-5" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="lastName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("auth.lastName")}</FormLabel>
                                  <FormControl><Input placeholder="Dela Cruz" className="rounded-2xl h-14 px-5" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="middleInitial"
                            render={({ field }) => (
                              <FormItem className="max-w-[120px]">
                                <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("auth.middleInitial")}</FormLabel>
                                <FormControl><Input placeholder="M." className="rounded-2xl h-14 px-5 text-center" {...field} maxLength={5} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <FormField
                              control={form.control}
                              name="dateOfBirth"
                              render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{t("auth.dateOfBirth")}</FormLabel>
                                  <FormControl>
                                    <DatePicker
                                      date={field.value ? parseISO(field.value) : undefined}
                                      setDate={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                      placeholder="Select birthday"
                                    />
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
                                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("auth.sex")}</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                                    <FormControl>
                                      <SelectTrigger className="rounded-2xl h-14 px-5">
                                        <SelectValue placeholder="Select sex" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-xl">
                                      <SelectItem value="male">{t("auth.male")}</SelectItem>
                                      <SelectItem value="female">{t("auth.female")}</SelectItem>
                                      <SelectItem value="other">{t("auth.other")}</SelectItem>
                                      <SelectItem value="prefer_not_to_say">{t("auth.preferNotToSay")}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}

                      {step === 3 && isPatient && (
                        <div className="space-y-6">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <FormField
                              control={form.control}
                              name="street"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("auth.streetPurok")}</FormLabel>
                                  <FormControl><Input placeholder="Purok 5" className="rounded-2xl h-14 px-5" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <FormField
                              control={form.control}
                              name="barangayName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("auth.barangay")}</FormLabel>
                                  <FormControl><Input placeholder={t("auth.typeBarangay")} className="rounded-2xl h-14 px-5" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <FormField
                              control={form.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("auth.cityMunicipality")}</FormLabel>
                                  <FormControl><Input placeholder="City/Municipality" className="rounded-2xl h-14 px-5" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="province"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("auth.province")}</FormLabel>
                                  <FormControl><Input placeholder="Province" className="rounded-2xl h-14 px-5" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <FormField
                              control={form.control}
                              name="zipCode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("auth.zipCode")}</FormLabel>
                                  <FormControl><Input placeholder="1234" className="rounded-2xl h-14 px-5" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                              />
                            </div>
                            <FormField
                              control={form.control}
                              name="contactPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("auth.phoneNumber")}</FormLabel>
                                  <FormControl><Input type="tel" placeholder="09XX XXX XXXX" className="rounded-2xl h-14 px-5" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                      {step === 4 && isPatient && (
                        <div className="space-y-6">
                          <div className="rounded-3xl border border-border/40 p-6 space-y-6 bg-muted/20">
                            <FormField
                              control={form.control}
                              name="careConsent"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start gap-4">
                                  <FormControl>
                                    <Checkbox checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} className="mt-1 h-5 w-5 rounded-lg" />
                                  </FormControl>
                                  <div className="space-y-1">
                                    <FormLabel className="font-bold text-[15px] leading-tight">Accept Terms & Care Consent <span className="text-destructive">*</span></FormLabel>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                      I agree to use this platform for telehealth and understand that advice is for support only.{" "}
                                      <Link to="/privacy" className="text-primary font-bold hover:underline" target="_blank">Privacy Notice</Link>
                                    </p>
                                    <FormMessage />
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="researchConsent"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start gap-4">
                                  <FormControl>
                                    <Checkbox checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} className="mt-1 h-5 w-5 rounded-lg" />
                                  </FormControl>
                                  <div className="space-y-1">
                                    <FormLabel className="font-bold text-[15px] leading-tight">Research (Optional)</FormLabel>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                      I allow my anonymized data to be used for health research and program improvement.
                                    </p>
                                    <FormMessage />
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  <div className="pt-2">
                    <div className="flex gap-4">
                      {step > 1 && (
                        <Button type="button" variant="outline" size="xl" onClick={handleBack} className="rounded-2xl border-2 h-16 w-20">
                          <ArrowLeft className="w-6 h-6" />
                        </Button>
                      )}
                      {step < maxStep ? (
                        <Button
                          type="button"
                          size="xl"
                          className="flex-1 rounded-2xl h-16 font-bold text-lg shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center"
                          onClick={() => {
                            const fieldsMap: any = {
                              1: isPatient ? ["email", "password", "confirmPassword", "role"] : ["fullName", "email", "password", "role"],
                              2: ["lastName", "firstName", "middleInitial", "dateOfBirth", "sex"],
                              3: ["street", "barangayName", "city", "province", "zipCode", "contactPhone"]
                            };
                            form.trigger(fieldsMap[step]).then(ok => ok && handleNext());
                          }}
                        >
                          <span className="mr-2">{t("auth.continue")}</span>
                          <ArrowRight className="w-6 h-6" />
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          size="xl"
                          className="flex-1 rounded-2xl h-16 font-bold text-lg shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                              <span>{t("auth.creatingAccount")}</span>
                            </div>
                          ) : (
                            <span>{t("auth.createAccount")}</span>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </Form>

              <div className="mt-12 text-center text-[15px]">
                <p className="text-muted-foreground">
                  {t("auth.alreadyHaveAccount")} <Link to="/login" className="text-primary font-bold hover:underline underline-offset-4">{t("auth.logIn")}</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
