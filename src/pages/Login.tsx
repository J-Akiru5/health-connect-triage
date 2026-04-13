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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { SITE_BARANGAY } from "@/lib/site";
import { safeInternalPath } from "@/lib/safePath";
import { AppLogoMark } from "@/components/AppLogoMark";

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
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-20 pb-16 flex flex-col items-center justify-center min-h-[calc(100vh-5rem)]">
        <div className="w-full max-w-[420px]">
          <Link to="/" className="flex items-center justify-center gap-2 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shrink-0">
              <AppLogoMark className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-xl font-bold text-foreground leading-tight">TeleHealth</span>
              <span className="text-xs font-medium text-muted-foreground">{SITE_BARANGAY}</span>
            </div>
          </Link>
          <Card className="rounded-2xl border shadow-lg overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-6 py-5 border-b">
              <h1 className="text-xl font-bold text-foreground">Login</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Sign in to access the platform</p>
            </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-4">
                {error && (
                  <p className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username / Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          className="rounded-xl h-11"
                          {...field}
                        />
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
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className="rounded-xl h-11 pr-11"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword((s) => !s)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer text-muted-foreground">Remember me</FormLabel>
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="p-6 pt-0 flex flex-col gap-4">
                <Button type="submit" className="w-full rounded-xl h-11 font-medium" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in…" : "Login"}
                </Button>
                <Button type="button" variant="outline" className="w-full rounded-xl" asChild>
                  <Link to="/">Back</Link>
                </Button>
                <div className="flex justify-between w-full text-sm">
                  <Link to="/signup" state={location.state} className="text-primary font-medium hover:underline">
                    Sign up
                  </Link>
                  <Link to="/forgot-password" className="text-muted-foreground hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground text-center hidden">
                  Don’t have an account?{" "}
                  <Link to="/signup" state={location.state} className="text-primary font-medium hover:underline">
                    Sign up
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Form>
        </Card>
        </div>
      </main>
    </div>
  );
}
