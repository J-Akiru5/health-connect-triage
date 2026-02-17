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
import { Heart, ArrowLeft } from "lucide-react";

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
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  async function onSubmit(values: LoginFormValues) {
    clearError();
    setIsSubmitting(true);
    try {
      const profile = await signIn(values.email, values.password);
      const destination =
        profile?.role === "admin" ? "/admin" : profile?.role === "bhw" || profile?.role === "patient" || profile?.role === "clinician" ? "/dashboard" : from;
      navigate(destination, { replace: true });
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
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">BarangayHealth</span>
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
                        <Input
                          type="password"
                          autoComplete="current-password"
                          placeholder="••••••••"
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
                  <Link to="/signup" className="text-primary font-medium hover:underline">Sign up</Link>
                  <Link to="#" className="text-muted-foreground hover:underline">Forgot password?</Link>
                </div>
                <p className="text-sm text-muted-foreground text-center hidden">
                  Don’t have an account?{" "}
                  <Link to="/signup" className="text-primary font-medium hover:underline">
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
