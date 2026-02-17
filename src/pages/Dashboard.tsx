import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Stethoscope,
  ClipboardList,
  Video,
  ArrowRightLeft,
  FileText,
  Bell,
  UserCog,
  LogOut,
  Loader2,
  Heart,
  ArrowRight,
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [patientProfile, setPatientProfile] = useState<{
    first_name: string | null;
    last_name: string | null;
    barangay?: { name: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || profile?.role !== "patient") {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: pp } = await supabase
        .from("patient_profiles")
        .select("first_name, last_name, barangay_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!pp) {
        setPatientProfile(null);
        setLoading(false);
        return;
      }
      let barangayName: string | null = null;
      if (pp.barangay_id) {
        const { data: b } = await supabase.from("barangays").select("name").eq("id", pp.barangay_id).maybeSingle();
        barangayName = b?.name ?? null;
      }
      setPatientProfile({
        first_name: pp.first_name,
        last_name: pp.last_name,
        barangay: barangayName ? { name: barangayName } : null,
      });
      setLoading(false);
    })();
  }, [user?.id, profile?.role]);

  async function handleLogout() {
    await signOut();
    navigate("/", { replace: true });
  }

  if (!user || profile?.role !== "patient") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-12 text-center">
          <p className="text-muted-foreground">Access limited to patients. Please log in as a patient.</p>
          <Button asChild className="mt-4">
            <Link to="/login">Log in</Link>
          </Button>
        </main>
      </div>
    );
  }

  const firstName = patientProfile?.first_name || profile?.full_name?.split(" ")[0] || "Patient";
  const lastName = patientProfile?.last_name || profile?.full_name?.split(" ").slice(1).join(" ") || "";
  const welcomeName = [firstName, lastName].filter(Boolean).join(" ");
  const barangayName = patientProfile?.barangay?.name ?? "—";

  const menu = [
    { to: "/symptom-checker", icon: Stethoscope, label: "Report Symptoms" },
    { to: "/symptom-checker", icon: ClipboardList, label: "My AI Triage Results" },
    { to: "/consultations", icon: Video, label: "Teleconsultation Appointments" },
    { to: "/referrals", icon: ArrowRightLeft, label: "Referrals / Escalations" },
    { to: "/medical-history", icon: FileText, label: "View / Update Medical History" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/profile", icon: UserCog, label: "Update Profile" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading…</span>
            </div>
          ) : (
            <>
              <Card className="mb-8 border-primary/20 bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Heart className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Patient Dashboard</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Welcome, {welcomeName}
                      </p>
                      <p className="text-sm text-muted-foreground">Barangay: {barangayName}</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid gap-3">
                {menu.map(({ to, icon: Icon, label }) => (
                  <Link key={to} to={to}>
                    <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
                      <CardContent className="flex items-center gap-4 py-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{label}</span>
                        <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                <Card className="border-border">
                  <CardContent className="py-4">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-4 text-muted-foreground hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <LogOut className="w-5 h-5" />
                      </div>
                      Logout
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
