import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { CreateReferralModal, type CreateReferralPrefilledPatient } from "@/components/CreateReferralModal";
import { ArrowLeft, Loader2, Activity, Video, ArrowRightLeft, CheckCircle2, Pencil, AlertCircle, Users } from "lucide-react";

const TRIAGE_LEVELS = ["emergency", "urgent", "non_urgent", "home_care"] as const;

type TriageRow = {
  id: string;
  assessment_id: string;
  patient_id: string;
  patient_name: string;
  risk_score: number | null;
  triage_level: string;
  created_at: string;
  validated_triage_level: string | null;
  provider_rationale: string | null;
};

export default function TriageMonitor() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<TriageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [validateRow, setValidateRow] = useState<TriageRow | null>(null);
  const [validateLevel, setValidateLevel] = useState<string>("");
  const [validateRationale, setValidateRationale] = useState("");
  const [validateSubmitting, setValidateSubmitting] = useState(false);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [referralPatient, setReferralPatient] = useState<CreateReferralPrefilledPatient | null>(null);
  const [submittingFollowUp, setSubmittingFollowUp] = useState<Record<string, boolean>>({});
  const [assignBHWRow, setAssignBHWRow] = useState<TriageRow | null>(null);
  const [assignBHWList, setAssignBHWList] = useState<{ id: string; full_name: string | null }[]>([]);
  const [assignBHWSelected, setAssignBHWSelected] = useState("");
  const [assignBHWNotes, setAssignBHWNotes] = useState("");
  const [assignBHWSubmitting, setAssignBHWSubmitting] = useState(false);
  const [assignBHWLoading, setAssignBHWLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || (profile?.role !== "clinician" && profile?.role !== "bhw")) {
      setLoading(false);
      return;
    }
    (async () => {
      if (profile?.role === "bhw") {
        const { data: p } = await supabase.from("profiles").select("assigned_barangay_id").eq("id", user.id).single();
        const barangayId = (p as { assigned_barangay_id?: string } | null)?.assigned_barangay_id;
        if (!barangayId) {
          setRows([]);
          setLoading(false);
          return;
        }
        const { data: ppList } = await supabase.from("patient_profiles").select("user_id").eq("barangay_id", barangayId);
        const patientIds = (ppList ?? []).map((r: { user_id: string }) => r.user_id);
        if (patientIds.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }
        const { data: assessments } = await supabase.from("symptom_assessments").select("id, user_id").in("user_id", patientIds);
        const assessmentIds = (assessments ?? []).map((a: { id: string }) => a.id);
        if (assessmentIds.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }
        const { data: triageData } = await supabase
          .from("ai_triage_results")
          .select("id, assessment_id, risk_score, triage_level, created_at, validated_triage_level, provider_rationale")
          .in("assessment_id", assessmentIds)
          .order("created_at", { ascending: false });
        const assessmentToPatient = new Map((assessments ?? []).map((a: { id: string; user_id: string }) => [a.id, a.user_id]));
        const { data: profData } = await supabase.from("profiles").select("id, full_name").in("id", patientIds);
        const nameMap = new Map((profData ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Patient"]));
        const list: TriageRow[] = (triageData ?? []).map((t: { id: string; assessment_id: string; risk_score: number | null; triage_level: string; created_at: string; validated_triage_level: string | null; provider_rationale: string | null }) => ({
          id: t.id,
          assessment_id: t.assessment_id,
          patient_id: assessmentToPatient.get(t.assessment_id) ?? "",
          patient_name: nameMap.get(assessmentToPatient.get(t.assessment_id) ?? "") ?? "Patient",
          risk_score: t.risk_score != null ? Number(t.risk_score) : null,
          triage_level: t.triage_level,
          created_at: t.created_at,
          validated_triage_level: t.validated_triage_level ?? null,
          provider_rationale: t.provider_rationale ?? null,
        }));
        setRows(list);
        setLoading(false);
        return;
      }
      const { data: consults } = await supabase
        .from("teleconsultations")
        .select("id, patient_id, assessment_id")
        .eq("provider_id", user.id);
      const assessmentIds = (consults ?? []).map((c: { assessment_id: string | null }) => c.assessment_id).filter(Boolean) as string[];
      if (assessmentIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data: triageData } = await supabase
        .from("ai_triage_results")
        .select("id, assessment_id, risk_score, triage_level, created_at, validated_triage_level, provider_rationale")
        .in("assessment_id", assessmentIds)
        .order("created_at", { ascending: false });
      const { data: assessments } = await supabase
        .from("symptom_assessments")
        .select("id, user_id")
        .in("id", assessmentIds);
      const patientIds = [...new Set((assessments ?? []).map((a: { user_id: string }) => a.user_id))];
      const { data: profData } = await supabase.from("profiles").select("id, full_name").in("id", patientIds);
      const nameMap = new Map((profData ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Patient"]));
      const assessmentToPatient = new Map((assessments ?? []).map((a: { id: string; user_id: string }) => [a.id, a.user_id]));
      const list: TriageRow[] = (triageData ?? []).map((t: { id: string; assessment_id: string; risk_score: number | null; triage_level: string; created_at: string; validated_triage_level: string | null; provider_rationale: string | null }) => ({
        id: t.id,
        assessment_id: t.assessment_id,
        patient_id: assessmentToPatient.get(t.assessment_id) ?? "",
        patient_name: nameMap.get(assessmentToPatient.get(t.assessment_id) ?? "") ?? "Patient",
        risk_score: t.risk_score != null ? Number(t.risk_score) : null,
        triage_level: t.triage_level,
        created_at: t.created_at,
        validated_triage_level: t.validated_triage_level ?? null,
        provider_rationale: t.provider_rationale ?? null,
      }));
      setRows(list);
      setLoading(false);
    })();
  }, [user?.id, profile?.role]);

  async function handleMarkFollowUp(r: TriageRow) {
    if (!user?.id) return;
    setSubmittingFollowUp((prev) => ({ ...prev, [r.id]: true }));
    try {
      if (profile?.role === "bhw") {
        await supabase.from("bhw_activities").insert({
          bhw_id: user.id,
          patient_id: r.patient_id,
          activity_type: "FOLLOW_UP",
          notes: "Follow-up marked complete",
        });
      }
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "follow_up_completed",
        resource: "ai_triage_results",
        details: {
          triage_id: r.id,
          assessment_id: r.assessment_id,
          patient_id: r.patient_id,
        },
      });
    } catch (e) {
      console.error("Failed to mark follow-up", e);
    } finally {
      setSubmittingFollowUp((prev) => ({ ...prev, [r.id]: false }));
    }
  }

  async function openAssignBHW(r: TriageRow) {
    setAssignBHWRow(r);
    setAssignBHWSelected("");
    setAssignBHWNotes("");
    setAssignBHWLoading(true);
    try {
      const { data: pp } = await supabase
        .from("patient_profiles")
        .select("barangay_id")
        .eq("user_id", r.patient_id)
        .maybeSingle();
      const barangayId = (pp as { barangay_id?: string } | null)?.barangay_id;
      if (barangayId) {
        const { data: bhws } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "bhw")
          .eq("assigned_barangay_id", barangayId);
        setAssignBHWList(bhws ?? []);
      } else {
        setAssignBHWList([]);
      }
    } catch (e) {
      console.error("Failed to load BHWs", e);
    } finally {
      setAssignBHWLoading(false);
    }
  }

  async function handleAssignBHWSubmit() {
    if (!user?.id || !assignBHWRow || !assignBHWSelected) return;
    setAssignBHWSubmitting(true);
    try {
      const bhw = assignBHWList.find((b) => b.id === assignBHWSelected);
      const providerName = profile?.full_name ?? "Clinician";
      const patientName = assignBHWRow.patient_name;
      await supabase.from("bhw_activities").insert({
        bhw_id: assignBHWSelected,
        patient_id: assignBHWRow.patient_id,
        activity_type: "FOLLOW_UP",
        notes: assignBHWNotes.trim() || "Follow-up assigned by clinician",
      });
      await supabase.from("notifications").insert({
        user_id: assignBHWSelected,
        message: `Follow-up assigned by ${providerName} for patient ${patientName}`,
        type: "follow_up",
      });
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "bhw_followup_assigned",
        resource: "bhw_activities",
        details: {
          bhw_id: assignBHWSelected,
          bhw_name: bhw?.full_name ?? null,
          patient_id: assignBHWRow.patient_id,
          patient_name: patientName,
          triage_id: assignBHWRow.id,
        },
      });
      setAssignBHWRow(null);
    } catch (e) {
      console.error("Failed to assign BHW", e);
    } finally {
      setAssignBHWSubmitting(false);
    }
  }

  const displayLevel = (level: string) => {
    if (level === "emergency" || level === "urgent") return "HIGH";
    if (level === "non_urgent") return "MODERATE";
    return "LOW";
  };

  const levelVariant = (level: string): "destructive" | "default" | "secondary" => {
    if (level === "emergency" || level === "urgent") return "destructive";
    if (level === "non_urgent") return "default";
    return "secondary";
  };

  function openValidateDialog(r: TriageRow) {
    setValidateRow(r);
    setValidateLevel(r.validated_triage_level ?? r.triage_level);
    setValidateRationale(r.provider_rationale ?? "");
  }

  async function handleValidateSubmit() {
    if (!user?.id || !validateRow) return;
    setValidateSubmitting(true);
    try {
      const { error } = await supabase
        .from("ai_triage_results")
        .update({
          validated_by: user.id,
          validated_at: new Date().toISOString(),
          validated_triage_level: validateLevel as (typeof TRIAGE_LEVELS)[number],
          provider_rationale: validateRationale.trim() || null,
        })
        .eq("id", validateRow.id);
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "triage_validated",
        resource: "ai_triage_results",
        details: {
          triage_id: validateRow.id,
          assessment_id: validateRow.assessment_id,
          original_level: validateRow.triage_level,
          validated_level: validateLevel,
          rationale: validateRationale.trim() || null,
        },
      });
      setRows((prev) =>
        prev.map((row) =>
          row.id === validateRow.id
            ? {
                ...row,
                validated_triage_level: validateLevel,
                provider_rationale: validateRationale.trim() || null,
              }
            : row
        )
      );
      setValidateRow(null);
    } catch (e) {
      console.error("Failed to validate triage", e);
    } finally {
      setValidateSubmitting(false);
    }
  }

  if (profile?.role !== "clinician" && profile?.role !== "bhw") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-20">
          <p className="text-muted-foreground text-center">Access limited to nurses, physicians, and Barangay Health Workers.</p>
          <Button asChild className="mt-4 mx-auto block">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Triage Monitor</h1>
              <p className="text-sm text-muted-foreground">
                {profile?.role === "bhw" ? "Monitor AI triage for patients in your barangay" : "Monitor AI-assigned triage levels for your assigned patients"}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="py-16 flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading…</span>
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">No AI triage results for your assigned patients yet.</p>
              <Button asChild variant="outline" className="mt-4 rounded-xl">
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="rounded-2xl border shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle>Patient triage overview</CardTitle>
                <CardDescription>Risk score and triage level from AI-assisted triage. View details or notify Nurse/Physician for urgent cases.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient name</TableHead>
                      <TableHead className="text-right">Risk score</TableHead>
                      <TableHead>Triage level</TableHead>
                      <TableHead>Validated</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.patient_name}</TableCell>
                        <TableCell className="text-right">
                          {r.risk_score != null ? `${Math.round(r.risk_score)} / 100` : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={levelVariant(r.triage_level)}>{displayLevel(r.triage_level)}</Badge>
                            {(r.triage_level === "emergency" || r.triage_level === "urgent") && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
                                <AlertCircle className="w-3 h-3 mr-0.5" />
                                Needs referral
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.validated_triage_level ? (
                            <Badge variant="outline">{displayLevel(r.validated_triage_level)}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              onClick={() => openValidateDialog(r)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Validate
                            </Button>
                            <Button
                              variant={r.triage_level === "emergency" || r.triage_level === "urgent" ? "default" : "ghost"}
                              size="sm"
                              className="gap-1"
                              onClick={() => {
                                setReferralPatient({ id: r.patient_id, name: r.patient_name });
                                setReferralModalOpen(true);
                              }}
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              Refer
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              disabled={!!submittingFollowUp[r.id]}
                              onClick={() => handleMarkFollowUp(r)}
                            >
                              {submittingFollowUp[r.id] ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Follow-up done
                            </Button>
                            {profile?.role === "clinician" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1"
                                onClick={() => openAssignBHW(r)}
                              >
                                <Users className="w-3.5 h-3.5" />
                                Assign BHW
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" asChild className="gap-2 rounded-xl">
                <Link to="/consultations">
                  <Video className="w-4 h-4" />
                  Assign teleconsultation
                </Link>
              </Button>
              <Button variant="outline" asChild className="gap-2 rounded-xl">
                <Link to="/referrals">
                  <ArrowRightLeft className="w-4 h-4" />
                  Escalate referral
                </Link>
              </Button>
              <Button variant="ghost" asChild className="rounded-xl">
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>

            <Dialog open={!!validateRow} onOpenChange={(open) => !open && setValidateRow(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Validate / override triage</DialogTitle>
                  <DialogDescription>
                    {validateRow && (
                      <>Confirm or change the final triage level for {validateRow.patient_name}. This is recorded for audit and research.</>
                    )}
                  </DialogDescription>
                </DialogHeader>
                {validateRow && (
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Final triage level</Label>
                      <Select value={validateLevel} onValueChange={setValidateLevel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIAGE_LEVELS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {displayLevel(level)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Reason for change (optional)</Label>
                      <Textarea
                        placeholder="e.g. Confirmed after review / Escalated due to..."
                        value={validateRationale}
                        onChange={(e) => setValidateRationale(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setValidateRow(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleValidateSubmit} disabled={validateSubmitting} className="gap-2">
                    {validateSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save validation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <CreateReferralModal
              open={referralModalOpen}
              onOpenChange={setReferralModalOpen}
              prefilledPatient={referralPatient}
              onSuccess={() => setReferralPatient(null)}
            />

            {/* Assign BHW Modal */}
            <Dialog open={!!assignBHWRow} onOpenChange={(open) => !open && setAssignBHWRow(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign BHW Follow-Up</DialogTitle>
                  <DialogDescription>
                    {assignBHWRow && (
                      <>Assign a Barangay Health Worker to follow up with {assignBHWRow.patient_name}.</>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {assignBHWLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading BHWs…
                    </div>
                  ) : assignBHWList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No BHWs found for this patient's barangay.</p>
                  ) : (
                    <div className="grid gap-2">
                      <Label>Barangay Health Worker</Label>
                      <Select value={assignBHWSelected} onValueChange={setAssignBHWSelected}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select BHW" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignBHWList.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.full_name ?? "BHW"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label>Notes / Instructions (optional)</Label>
                    <Textarea
                      placeholder="e.g. Check blood pressure daily, ensure medication compliance..."
                      value={assignBHWNotes}
                      onChange={(e) => setAssignBHWNotes(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAssignBHWRow(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignBHWSubmit}
                    disabled={assignBHWSubmitting || !assignBHWSelected || assignBHWLoading}
                    className="gap-2"
                  >
                    {assignBHWSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Assign BHW
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </main>
    </div>
  );
}
