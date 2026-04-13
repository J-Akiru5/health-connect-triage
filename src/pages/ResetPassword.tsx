import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { SITE_BARANGAY } from "@/lib/site";
import { AppLogoMark } from "@/components/AppLogoMark";

function getCodeFromUrl() {
  try {
    return new URL(window.location.href).searchParams.get("code");
  } catch {
    return null;
  }
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const code = useMemo(() => getCodeFromUrl(), []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setError(null);
      try {
        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) throw exchangeErr;
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("This reset link is invalid or expired. Please request a new one.");
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? "Unable to verify reset link.");
      } finally {
        if (!mounted) return;
        setIsBootstrapping(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;
      setSuccess("Password updated. You can now log in.");
      setTimeout(() => navigate("/login", { replace: true }), 700);
    } catch (err: any) {
      setError(err?.message ?? "Failed to update password.");
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
              <h1 className="text-xl font-bold text-foreground">Set a new password</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Choose a strong password you don’t use elsewhere.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {isBootstrapping ? (
                <p className="text-sm text-muted-foreground">Verifying reset link…</p>
              ) : null}

              {error && (
                <p className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-sm font-medium text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                  {success}
                </p>
              )}

              <div className="space-y-2">
                <Label>New password</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl h-11"
                  disabled={isBootstrapping}
                />
              </div>

              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-xl h-11"
                  disabled={isBootstrapping}
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl h-11 font-medium"
                disabled={isBootstrapping || isSubmitting}
              >
                {isSubmitting ? "Updating…" : "Update password"}
              </Button>

              <Button type="button" variant="outline" className="w-full rounded-xl" asChild>
                <Link to="/login">Back to login</Link>
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}

