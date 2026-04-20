import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Shield, ArrowRight } from "lucide-react";
import { SITE_BARANGAY } from "@/lib/site";
import { safeInternalPath } from "@/lib/safePath";
import { AppLogoMark } from "@/components/AppLogoMark";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, error, clearError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();
  const fromLocation = (location.state as { from?: { pathname: string; search?: string; hash?: string } } | null)?.from;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  async function onSubmit(values: LoginFormValues) {
    clearError();
    setIsSubmitting(true);
    try {
      const profile = await signIn(values.email, values.password);
      const role = profile?.role;
      const returnTo = (() => {
        const p = fromLocation?.pathname;
        if (typeof p !== "string" || !p.startsWith("/")) return null;
        if (p === "/" || p === "/login" || p === "/signup") return null;
        if (p.split("/").includes("undefined")) return null;
        if (p.startsWith("/admin") && role !== "admin") return null;
        return `${p}${fromLocation.search ?? ""}${fromLocation.hash ?? ""}`;
      })();
      const destination =
        role === "admin"
          ? "/admin"
          : role === "bhw" || role === "patient" || role === "clinician"
            ? returnTo ?? "/dashboard"
            : returnTo ?? "/";
      const fallback =
        role === "admin"
          ? "/admin"
          : role === "bhw" || role === "patient" || role === "clinician"
            ? "/dashboard"
            : "/";
      navigate(safeInternalPath(destination, fallback), { replace: true });
    } catch {
      // error set in context
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      <Navigation />
      
      <main className="min-h-screen flex flex-col lg:flex-row">
        {/* Left Cinematic Panel */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden bg-foreground">
          {/* Animated Mesh Background */}
          <div className="absolute inset-0 gradient-hero opacity-80" />
          <div className="absolute inset-0 noise-overlay" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.1),transparent_60%)]" />
          
          {/* Floating Elements */}
          <motion.div
            animate={{ 
              y: [0, -20, 0],
              rotate: [0, 5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[15%] left-[20%] w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none"
          />
          <motion.div
            animate={{ 
              y: [0, 30, 0],
              rotate: [0, -8, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[20%] right-[25%] w-80 h-80 bg-accent/15 rounded-full blur-[100px] pointer-events-none"
          />

          <div className="relative z-10 w-full flex flex-col justify-center px-16 xl:px-24 py-12">
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
              className="space-y-6 max-w-lg"
            >
              <h2 className="text-4xl xl:text-6xl font-display font-bold text-primary-foreground leading-[1.1] tracking-tight">
                {t("auth.loginBrandMessage")}
              </h2>
              <p className="text-primary-foreground/70 text-lg xl:text-xl leading-relaxed">
                {t("auth.loginBrandSub")}
              </p>
              
              <div className="pt-8 flex flex-wrap gap-6 items-center">
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <Shield className="w-4 h-4 text-primary-foreground/70" />
                  <span className="text-sm font-medium text-primary-foreground/60 tracking-wider uppercase">HIPAA Compliant</span>
                </div>
                <div className="flex items-center gap-1.5 text-primary-foreground/40 text-sm italic">
                  <span className="w-1.5 h-1.5 rounded-full bg-home-care pulse-ring" />
                  <span>Secure 256-bit Connection Active</span>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Bottom attribution */}
          <div className="absolute bottom-12 left-16 xl:left-24">
            <p className="text-primary-foreground/30 text-xs font-bold uppercase tracking-[0.2em]">
              Serving {SITE_BARANGAY} Community
            </p>
          </div>
        </div>

        {/* Right Auth Panel */}
        <div className="flex-1 flex flex-col relative bg-background">
          <div className="flex-1 flex items-center justify-center px-6 sm:px-12 py-24 lg:py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[440px]"
            >
              {/* Header */}
              <div className="mb-10 text-center lg:text-left">
                <Link to="/" className="inline-flex items-center gap-2.5 mb-8 lg:hidden">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                    <AppLogoMark className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-display font-bold text-foreground">TeleHealth</span>
                </Link>
                <h1 className="text-3xl xl:text-4xl font-display font-bold text-foreground tracking-tight mb-3">
                  {t("auth.loginTitle")}
                </h1>
                <p className="text-muted-foreground text-lg">
                  {t("auth.loginSubtitle")}
                </p>
              </div>

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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-5">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            {t("auth.email")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              autoComplete="email"
                              placeholder="johndoe@email.com"
                              className="rounded-2xl h-14 bg-muted/30 border-border/40 focus:bg-background focus:ring-primary/20 transition-all text-base px-5"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs font-medium" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              {t("auth.password")}
                            </FormLabel>
                            <Link to="/forgot-password" className="text-xs font-bold text-primary/70 hover:text-primary transition-colors uppercase tracking-widest">
                              {t("auth.forgotPassword")}
                            </Link>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                className="rounded-2xl h-14 pr-12 bg-muted/30 border-border/40 focus:bg-background focus:ring-primary/20 transition-all text-base px-5"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-transparent"
                                onClick={() => setShowPassword((s) => !s)}
                              >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs font-medium" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center">
                    <FormField
                      control={form.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              className="rounded-lg h-5 w-5 data-[state=checked]:bg-primary"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-medium text-muted-foreground cursor-pointer select-none">
                            {t("auth.rememberMe")}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="xl"
                    className="w-full rounded-2xl h-16 font-bold text-lg shadow-xl hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all group"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        <span>{t("auth.signingIn")}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 w-full">
                        <span>{t("auth.loginButton")}</span>
                        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                      </div>
                    )}
                  </Button>
                </form>
              </Form>

              {/* Footer */}
              <div className="mt-12 pt-8 border-t border-border/40 text-center">
                <p className="text-muted-foreground text-[15px]">
                  {t("auth.noAccount")}{" "}
                  <Link 
                    to="/signup" 
                    state={location.state} 
                    className="text-primary font-bold hover:underline underline-offset-4"
                  >
                    {t("auth.signUp")}
                  </Link>
                </p>
                <div className="mt-8 flex items-center justify-center gap-8">
                  <Link to="/" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors">
                    {t("nav.home")}
                  </Link>
                  <Link to="/about" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors">
                    {t("nav.about")}
                  </Link>
                  <Link to="/faq" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors">
                    {t("nav.faq")}
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
