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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/database.types";
import { Heart, ArrowRight, ArrowLeft } from "lucide-react";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "patient", label: "Patient" },
  { value: "bhw", label: "Barangay Health Worker (BHW)" },
  { value: "clinician", label: "Nurse / Doctor" },
  { value: "admin", label: "System Administrator" },
];

const signupSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(200, "Name too long"),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().optional(),
  role: z.enum(["patient", "bhw", "clinician", "admin"] as const),
  // Patient: broken-down name
  lastName: z.string().optional(),
  firstName: z.string().optional(),
  middleInitial: z.string().max(5).optional(),
  dateOfBirth: z.string().optional(),
  sex: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  street: z.string().optional(),
  barangayId: z.string().uuid().optional().or(z.literal("")),
  city: z.string().optional(),
  province: z.string().optional(),
  zipCode: z.string().optional(),
  contactPhone: z.string().optional(),
  careConsent: z.boolean().optional(),
  researchConsent: z.boolean().optional(),
}).refine((d) => d.role !== "patient" || (d.password === d.confirmPassword), { message: "Passwords must match", path: ["confirmPassword"] })
  .refine((d) => d.role !== "patient" || (d.firstName?.trim() && d.lastName?.trim()), { message: "First and last name required", path: ["firstName"] });

type SignupFormValues = z.infer<typeof signupSchema>;

const CONSENT_VERSION = "1.0";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, error, clearError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [barangays, setBarangays] = useState<{ id: string; name: string }[]>([]);
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

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
      barangayId: "",
      city: "",
      province: "",
      zipCode: "",
      contactPhone: "",
      careConsent: false,
      researchConsent: false,
    },
  });

  const role = form.watch("role");
  const isPatient = role === "patient";
  const maxStep = isPatient ? 4 : 1;

  useEffect(() => {
    if (!isPatient) return;
    (async () => {
      const { data } = await supabase.from("barangays").select("id, name").order("name");
      setBarangays(data ?? []);
    })();
  }, [isPatient]);

  async function onSubmit(values: SignupFormValues) {
    if (values.role === "patient" && !values.careConsent) {
      form.setError("careConsent", { message: "You must accept care consent to register." });
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
        displayName,
        values.role as UserRole
      );
      if (result?.userId && values.role === "patient") {
        await supabase.from("patient_profiles").insert({
          user_id: result.userId,
          last_name: values.lastName || null,
          first_name: values.firstName || null,
          middle_initial: values.middleInitial || null,
          date_of_birth: values.dateOfBirth || null,
          sex: values.sex ?? null,
          street: values.street || null,
          barangay_id: values.barangayId || null,
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
      }
      navigate(from, { replace: true });
    } catch {
      // error set in context
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNext() {
    if (step < maxStep) setStep(step + 1);
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-12 flex flex-col items-center">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">BarangayHealth</span>
        </Link>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>
              {isPatient && maxStep > 1
                ? `Step ${step} of ${maxStep}: ${step === 1 ? "Account" : step === 2 ? "Name & basic info" : step === 3 ? "Address & contact" : "Consent"}`
                : "Register as a patient, health worker, clinician, or administrator."}
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                {error && (
                  <p className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}

                {/* Step 1: Account */}
                {step === 1 && (
                  <>
                    {!isPatient && (
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full name</FormLabel>
                            <FormControl>
                              <Input autoComplete="name" placeholder="Juan Dela Cruz" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                    )}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="new-password" placeholder="At least 8 characters, letters and numbers" {...field} />
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
                            <FormLabel>Confirm password</FormLabel>
                            <FormControl>
                              <Input type="password" autoComplete="new-password" placeholder="Confirm password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>I am a</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Step 2: Patient name & basic info */}
                {step === 2 && isPatient && (
                  <>
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
                  </>
                )}

                {/* Step 3: Address & contact */}
                {step === 3 && isPatient && (
                  <>
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
                                <SelectValue placeholder="Select your barangay" />
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
                  </>
                )}

                {/* Step 4: Consent (patient only) */}
                {step === 4 && isPatient && (
                  <>
                    <div className="rounded-lg border border-border p-4 space-y-4">
                      <FormField
                        control={form.control}
                        name="careConsent"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start gap-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1">
                              <FormLabel className="font-medium">Accept Terms & Consent (Care + Research) <span className="text-destructive">*</span></FormLabel>
                              <p className="text-sm text-muted-foreground">
                                I agree to use this platform for telehealth and understand that advice is for support only and does not replace in-person care.
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
                          <FormItem className="flex flex-row items-start gap-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1">
                              <FormLabel className="font-medium">Research / data sharing (optional)</FormLabel>
                              <p className="text-sm text-muted-foreground">
                                I agree to allow my anonymized data to be used for health research and program improvement.
                              </p>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <div className="flex gap-2 w-full">
                  {step > 1 ? (
                    <Button type="button" variant="outline" onClick={handleBack}>
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                  ) : null}
                  {step < maxStep ? (
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => {
                        if (step === 1) {
                          const fields = isPatient ? ["email", "password", "confirmPassword", "role"] : ["fullName", "email", "password", "role"];
                          form.trigger(fields).then((ok) => { if (ok) handleNext(); });
                        } else if (step === 2) {
                          form.trigger(["lastName", "firstName", "dateOfBirth", "sex"]).then((ok) => { if (ok) handleNext(); });
                        } else if (step === 3) {
                          form.trigger(["street", "barangayId", "city", "province", "zipCode", "contactPhone"]).then((ok) => { if (ok) handleNext(); });
                        }
                      }}
                    >
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <>
                      <Button type="submit" className="flex-1" disabled={isSubmitting}>
                        {isSubmitting ? "Creating account…" : "Submit"}
                      </Button>
                      <Button type="button" variant="outline" asChild>
                        <Link to="/">Cancel</Link>
                      </Button>
                    </>
                  )}
                </div>
                {step === 1 && maxStep === 1 && (
                  <>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Creating account…" : "Create account"}
                    </Button>
                    <p className="text-sm text-muted-foreground text-center">
                      Already have an account?{" "}
                      <Link to="/login" className="text-primary font-medium hover:underline">
                        Log in
                      </Link>
                    </p>
                  </>
                )}
                {step === maxStep && (
                  <p className="text-sm text-muted-foreground text-center">
                    Already have an account?{" "}
                    <Link to="/login" className="text-primary font-medium hover:underline">
                      Log in
                    </Link>
                  </p>
                )}
              </CardFooter>
            </form>
          </Form>
        </Card>
      </main>
    </div>
  );
}
