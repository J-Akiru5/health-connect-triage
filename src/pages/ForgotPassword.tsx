import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { SITE_BARANGAY } from "@/lib/site";
import { AppLogoMark } from "@/components/AppLogoMark";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const redirectTo = useMemo(() => `${window.location.origin}/reset-password`, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSentTo(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      });
      if (resetError) throw resetError;
      setSentTo(trimmed);
    } catch (err: any) {
      setError(err?.message ?? "Failed to send reset email.");
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
              <h1 className="text-xl font-bold text-foreground">Reset password</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                We’ll email you a secure link to set a new password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <p className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
              {sentTo && (
                <p className="text-sm font-medium text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                  Password reset email sent to <span className="font-semibold">{sentTo}</span>. Please check your inbox.
                </p>
              )}

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl h-11"
                />
              </div>

              <Button type="submit" className="w-full rounded-xl h-11 font-medium" disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send reset link"}
              </Button>

              <Button type="button" variant="outline" className="w-full rounded-xl" asChild>
                <Link to="/login">Back to login</Link>
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                If you don’t see the email, check spam/junk or try again.
              </p>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}

