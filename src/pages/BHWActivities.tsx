import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, Users, Home, Heart, ClipboardList } from "lucide-react";
import { format } from "date-fns";

type ActivityType = "HOME_VISIT" | "FOLLOW_UP" | "ASSISTED_INTAKE" | "REFERRAL_ASSIST";

type ActivityRow = {
  id: string;
  patient_name: string;
  activity_type: string;
  notes: string | null;
  created_at: string;
};

export default function BHWActivities() {
  const { user, profile } = useAuth();
  const [patients, setPatients] = useState<{ user_id: string; full_name: string }[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [activityType, setActivityType] = useState<ActivityType>("HOME_VISIT");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isBhw = profile?.role === "bhw";

  useEffect(() => {
    if (!user?.id || !isBhw) {
      setLoadingPatients(false);
      return;
    }
    (async () => {
      const { data: p } = await supabase.from("profiles").select("assigned_barangay_id").eq("id", user.id).single();
      const barangayId = (p as { assigned_barangay_id?: string } | null)?.assigned_barangay_id;
      if (!barangayId) {
        setLoadingPatients(false);
        return;
      }
      const { data: ppList } = await supabase.from("patient_profiles").select("user_id, first_name, last_name").eq("barangay_id", barangayId);
      if (!ppList?.length) {
        setLoadingPatients(false);
        return;
      }
      const userIds = ppList.map((r: { user_id: string }) => r.user_id);
      const { data: profData } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const nameMap = new Map((profData ?? []).map((x: { id: string; full_name: string | null }) => [x.id, x.full_name ?? "Patient"]));
      setPatients(
        ppList.map((r: { user_id: string; first_name: string | null; last_name: string | null }) => ({
          user_id: r.user_id,
          full_name: nameMap.get(r.user_id) ?? [r.first_name, r.last_name].filter(Boolean).join(" ") || "Patient",
        }))
      );
      setLoadingPatients(false);
    })();
  }, [user?.id, isBhw]);

  useEffect(() => {
    if (!user?.id || !isBhw) {
      setLoadingActivities(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("bhw_activities")
        .select("id, patient_id, activity_type, notes, created_at")
        .eq("bhw_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!data?.length) {
        setActivities([]);
        setLoadingActivities(false);
        return;
      }
      const patientIds = [...new Set(data.map((r: { patient_id: string }) => r.patient_id))];
      const { data: profData } = await supabase.from("profiles").select("id, full_name").in("id", patientIds);
      const nameMap = new Map((profData ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Patient"]));
      setActivities(
        data.map((r: { id: string; patient_id: string; activity_type: string; notes: string | null; created_at: string }) => ({
          id: r.id,
          patient_name: nameMap.get(r.patient_id) ?? "Patient",
          activity_type: r.activity_type,
          notes: r.notes,
          created_at: r.created_at,
        }))
      );
      setLoadingActivities(false);
    })();
  }, [user?.id, isBhw]);

  async function handleLogActivity() {
    if (!user?.id || !selectedPatientId) {
      alert("Please select a patient.");
      return;
    }
    setSubmitting(true);
    try {
      await supabase.from("bhw_activities").insert({
        bhw_id: user.id,
        patient_id: selectedPatientId,
        activity_type: activityType,
        notes: notes || null,
      });
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "bhw_activity_log",
        resource: "bhw_activities",
        details: { activity_type: activityType, patient_id: selectedPatientId },
      });
      setNotes("");
      setActivities((prev) => [
        {
          id: "",
          patient_name: patients.find((p) => p.user_id === selectedPatientId)?.full_name ?? "Patient",
          activity_type,
          notes: notes || null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (e) {
      console.error("Failed to log activity", e);
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || !isBhw) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-20 text-center">
          <p className="text-muted-foreground">Access limited to Barangay Health Workers.</p>
          <Button asChild className="mt-4">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </main>
      </div>
    );
  }

  const activityLabel = (type: string) => {
    switch (type) {
      case "HOME_VISIT": return "Home visit";
      case "FOLLOW_UP": return "Follow-up";
      case "ASSISTED_INTAKE": return "Assisted intake";
      case "REFERRAL_ASSIST": return "Referral assist";
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Home Visits & Follow-Up</h1>
              <p className="text-sm text-muted-foreground">Log visits and follow-up activities for audit and reporting</p>
            </div>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Log activity
            </CardTitle>
            <CardDescription>Record a home visit or follow-up for a patient in your barangay.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingPatients ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading patients…
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Patient</Label>
                  <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Activity type</Label>
                  <Select value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOME_VISIT">
                        <span className="flex items-center gap-2"><Home className="w-4 h-4" /> Home visit</span>
                      </SelectItem>
                      <SelectItem value="FOLLOW_UP">
                        <span className="flex items-center gap-2"><Heart className="w-4 h-4" /> Follow-up</span>
                      </SelectItem>
                      <SelectItem value="REFERRAL_ASSIST">Referral assist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Vitals, symptom progression, guidance given…" className="resize-none" />
                </div>
                <Button onClick={handleLogActivity} disabled={submitting || !selectedPatientId}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Log activity
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Recent activities
            </CardTitle>
            <CardDescription>Your logged home visits and follow-ups (JC-3 audit)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingActivities ? (
              <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
                Loading…
              </div>
            ) : activities.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No activities logged yet. Log a home visit or follow-up above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((a) => (
                    <TableRow key={a.id || a.created_at}>
                      <TableCell className="font-medium">{a.patient_name}</TableCell>
                      <TableCell>{activityLabel(a.activity_type)}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground">{a.notes ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{format(new Date(a.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Button variant="outline" asChild className="mt-6">
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </main>
    </div>
  );
}
