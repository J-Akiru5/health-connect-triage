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
import { ArrowRightLeft, Loader2, ArrowLeft, FileText, Phone, UserPlus, CheckCircle2, Users } from "lucide-react";
import { format } from "date-fns";

type ReferralRow = {
  id: string;
  patient_id?: string;
  facility_name: string;
  urgency: string;
  status: string;
  created_at: string;
  required_documents: string | null;
  patient_name?: string;
};

export default function Referrals() {
  const { user, profile } = useAuth();
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [patientsList, setPatientsList] = useState<CreateReferralPrefilledPatient[]>([]);
  const isClinician = profile?.role === "clinician";
  const isBhw = profile?.role === "bhw";
  const [assignBHWReferral, setAssignBHWReferral] = useState<ReferralRow | null>(null);
  const [assignBHWList, setAssignBHWList] = useState<{ id: string; full_name: string | null }[]>([]);
  const [assignBHWSelected, setAssignBHWSelected] = useState("");
  const [assignBHWNotes, setAssignBHWNotes] = useState("");
  const [assignBHWSubmitting, setAssignBHWSubmitting] = useState(false);
  const [assignBHWLoading, setAssignBHWLoading] = useState(false);

  async function openAssignBHW(r: ReferralRow) {
    setAssignBHWReferral(r);
    setAssignBHWSelected("");
    setAssignBHWNotes("");
    setAssignBHWLoading(true);
    try {
      const patientId = r.patient_id;
      if (!patientId) {
        setAssignBHWList([]);
        setAssignBHWLoading(false);
        return;
      }
      const { data: pp } = await supabase
        .from("patient_profiles")
        .select("barangay_name")
        .eq("user_id", patientId)
        .maybeSingle();
      const barangayName = (pp as { barangay_name?: string | null } | null)?.barangay_name ?? null;
      if (barangayName) {
        const { data: bhws } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "bhw")
          .ilike("assigned_barangay_name", barangayName);
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
    if (!user?.id || !assignBHWReferral || !assignBHWSelected) return;
    setAssignBHWSubmitting(true);
    try {
      const bhw = assignBHWList.find((b) => b.id === assignBHWSelected);
      const providerName = profile?.full_name ?? "Clinician";
      const patientName = assignBHWReferral.patient_name ?? "Patient";
      await supabase.from("bhw_activities").insert({
        bhw_id: assignBHWSelected,
        patient_id: assignBHWReferral.patient_id,
        activity_type: "FOLLOW_UP",
        notes: assignBHWNotes.trim() || "Follow-up assigned by clinician via referral",
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
          patient_id: assignBHWReferral.patient_id,
          patient_name: patientName,
          referral_id: assignBHWReferral.id,
        },
      });
      setAssignBHWReferral(null);
    } catch (e) {
      console.error("Failed to assign BHW", e);
    } finally {
      setAssignBHWSubmitting(false);
    }
  }

  const loadReferrals = async () => {
    if (!user?.id) return;
    if (isClinician) {
      const { data } = await supabase
        .from("referrals")
        .select("id, patient_id, facility_name, urgency, status, created_at, required_documents")
        .eq("from_provider_id", user.id)
        .order("created_at", { ascending: false });
      const patientIds = [...new Set((data ?? []).map((r: { patient_id: string }) => r.patient_id))];
      const { data: profData } = patientIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", patientIds)
        : { data: [] };
      const nameMap = new Map((profData ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Patient"]));
      setReferrals(
        (data ?? []).map((r: { id: string; patient_id: string; facility_name: string; urgency: string; status: string; created_at: string; required_documents: string | null }) => ({
          ...r,
          patient_name: nameMap.get(r.patient_id),
        }))
      );
    } else if (isBhw) {
      const { data } = await supabase
        .from("referrals")
        .select("id, patient_id, facility_name, urgency, status, created_at, required_documents")
        .order("created_at", { ascending: false });
      const patientIds = [...new Set((data ?? []).map((r: { patient_id: string }) => r.patient_id).filter(Boolean))];
      const { data: profData } = patientIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", patientIds)
        : { data: [] as { id: string; full_name: string | null }[] };
      const nameMap = new Map((profData ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Patient"]));
      setReferrals(
        (data ?? []).map((r: { id: string; patient_id: string; facility_name: string; urgency: string; status: string; created_at: string; required_documents: string | null }) => ({
          ...r,
          patient_name: nameMap.get(r.patient_id),
        }))
      );
    } else {
      const { data } = await supabase
        .from("referrals")
        .select("id, facility_name, urgency, status, created_at, required_documents")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });
      setReferrals(data ?? []);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      if (isClinician) {
        const { data } = await supabase
          .from("referrals")
          .select("id, patient_id, facility_name, urgency, status, created_at, required_documents")
          .eq("from_provider_id", user.id)
          .order("created_at", { ascending: false });
        const patientIds = [...new Set((data ?? []).map((r: { patient_id: string }) => r.patient_id))];
        const { data: profData } = patientIds.length
          ? await supabase.from("profiles").select("id, full_name").in("id", patientIds)
          : { data: [] };
        const nameMap = new Map((profData ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Patient"]));
        const rows: ReferralRow[] = (data ?? []).map((r: { id: string; patient_id: string; facility_name: string; urgency: string; status: string; created_at: string; required_documents: string | null }) => ({
          ...r,
          patient_name: nameMap.get(r.patient_id),
        }));
        setReferrals(rows);
      } else if (isBhw) {
        const { data } = await supabase
          .from("referrals")
          .select("id, patient_id, facility_name, urgency, status, created_at, required_documents")
          .order("created_at", { ascending: false });
        const patientIds = [...new Set((data ?? []).map((r: { patient_id: string }) => r.patient_id).filter(Boolean))];
        const { data: profData } = patientIds.length
          ? await supabase.from("profiles").select("id, full_name").in("id", patientIds)
          : { data: [] as { id: string; full_name: string | null }[] };
        const nameMap = new Map((profData ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Patient"]));
        const rows: ReferralRow[] = (data ?? []).map((r: { id: string; patient_id: string; facility_name: string; urgency: string; status: string; created_at: string; required_documents: string | null }) => ({
          ...r,
          patient_name: nameMap.get(r.patient_id),
        }));
        setReferrals(rows);
      } else {
        const { data } = await supabase
          .from("referrals")
          .select("id, facility_name, urgency, status, created_at, required_documents")
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false });
        setReferrals(data ?? []);
      }
      setLoading(false);
    })();
  }, [user?.id, isClinician, isBhw]);

  useEffect(() => {
    if (!user?.id || (!isClinician && !isBhw)) {
      setPatientsList([]);
      return;
    }
    (async () => {
      if (isClinician) {
        const { data: consults } = await supabase
          .from("teleconsultations")
          .select("patient_id")
          .eq("provider_id", user.id);
        const ids = [...new Set((consults ?? []).map((c: { patient_id: string }) => c.patient_id))];
        if (ids.length === 0) {
          setPatientsList([]);
          return;
        }
        const { data: profData } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        setPatientsList(
          (profData ?? []).map((p: { id: string; full_name: string | null }) => ({
            id: p.id,
            name: p.full_name ?? "Patient",
          }))
        );
      } else {
        const { data: ppList } = await supabase.from("patient_profiles").select("user_id").limit(500);
        const ids = (ppList ?? []).map((r: { user_id: string }) => r.user_id);
        if (ids.length === 0) {
          setPatientsList([]);
          return;
        }
        const { data: profData } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        setPatientsList(
          (profData ?? []).map((p: { id: string; full_name: string | null }) => ({
            id: p.id,
            name: p.full_name ?? "Patient",
          }))
        );
      }
    })();
  }, [user?.id, isClinician, isBhw]);

  const pending = referrals.filter((r) => r.status === "pending" || r.status === "confirmed");
  const urgencyColor = (u: string) =>
    u === "emergency" ? "destructive" : u === "urgent" ? "default" : "secondary";

  async function handleBhwUpdateStatus(referralId: string, patientId: string, newStatus: string) {
    if (!user?.id) return;
    setUpdatingId(referralId);
    try {
      await supabase.from("referrals").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", referralId);
      await supabase.from("bhw_activities").insert({
        bhw_id: user.id,
        patient_id: patientId,
        activity_type: "REFERRAL_ASSIST",
        notes: `Referral status updated to ${newStatus}`,
      });
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "bhw_referral_status_update",
        resource: "referrals",
        details: { referral_id: referralId, new_status: newStatus, patient_id: patientId },
      });
      setReferrals((prev) => prev.map((r) => (r.id === referralId ? { ...r, status: newStatus } : r)));
    } catch (e) {
      console.error("Failed to update referral", e);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{isClinician ? "Referrals / Escalations" : "Referrals"}</h1>
                  <p className="text-sm text-muted-foreground">
                    {isClinician ? "Review, approve, and assign BHW follow-up" : isBhw ? "Update referral status for patients" : "Escalations and facility referrals"}
                  </p>
                </div>
              </div>
            </div>
            {(isClinician || isBhw) && (
              <Button
                onClick={() => setReferralModalOpen(true)}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Create referral
              </Button>
            )}
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-12 flex items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Loading…</span>
              </CardContent>
            </Card>
          ) : referrals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No referrals yet.</p>
                <Button asChild className="mt-4" variant="outline">
                  <Link to="/dashboard">Back to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          ) : isBhw ? (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Referrals</CardTitle>
                  <CardDescription>Update status (pending → confirmed → completed) and log REFERRAL_ASSIST for audit.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Facility</TableHead>
                        <TableHead>Urgency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.patient_name ?? "—"}</TableCell>
                          <TableCell>{r.facility_name}</TableCell>
                          <TableCell>
                            <Badge variant={urgencyColor(r.urgency) as "default" | "secondary" | "destructive"}>{r.urgency}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={r.status === "pending" ? "secondary" : r.status === "completed" ? "default" : "outline"}>{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {r.status === "pending" && r.patient_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mr-2"
                                disabled={updatingId === r.id}
                                onClick={() => handleBhwUpdateStatus(r.id, r.patient_id, "confirmed")}
                              >
                                {updatingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                              </Button>
                            )}
                            {(r.status === "pending" || r.status === "confirmed") && r.patient_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={updatingId === r.id}
                                onClick={() => handleBhwUpdateStatus(r.id, r.patient_id, "completed")}
                              >
                                {updatingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Complete
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </>
          ) : isClinician ? (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Referral overview</CardTitle>
                  <CardDescription>Patient name, facility, and status. Approve or assign BHW follow-up.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient name</TableHead>
                        <TableHead>Referral to</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[140px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.patient_name ?? "—"}</TableCell>
                          <TableCell>{r.facility_name}</TableCell>
                          <TableCell>
                            <Badge variant={r.status === "pending" ? "secondary" : r.status === "completed" ? "default" : "outline"}>
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {r.patient_id && (
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </>
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Pending Referrals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pending.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending referrals.</p>
                  ) : (
                    pending.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div>
                          <p className="font-medium">{r.facility_name}</p>
                          <Badge variant={urgencyColor(r.urgency) as "default" | "secondary" | "destructive"} className="mt-1">
                            {r.urgency}
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}>
                          View Details
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {selectedId && (
                <Card className="mb-6">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Referral Details</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>Close</Button>
                  </CardHeader>
                  <CardContent>
                    {referrals.find((r) => r.id === selectedId) && (
                      <>
                        <p><strong>Required documents:</strong> {referrals.find((r) => r.id === selectedId)?.required_documents || "—"}</p>
                        <Button variant="outline" className="mt-4 gap-2">
                          <FileText className="w-4 h-4" />
                          View Details
                        </Button>
                        <Button variant="outline" className="mt-4 ml-2 gap-2">
                          Request BHW Assistance
                          <Phone className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              <Button variant="outline" asChild>
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </>
          )}
        </div>

        {(isClinician || isBhw) && (
          <CreateReferralModal
            open={referralModalOpen}
            onOpenChange={setReferralModalOpen}
            prefilledPatient={null}
            patientsList={patientsList}
            onSuccess={loadReferrals}
          />
        )}

        {/* Assign BHW Modal — clinician only */}
        {isClinician && (
          <Dialog open={!!assignBHWReferral} onOpenChange={(open) => !open && setAssignBHWReferral(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Assign BHW Follow-Up</DialogTitle>
                <DialogDescription>
                  {assignBHWReferral && (
                    <>Assign a Barangay Health Worker to follow up with {assignBHWReferral.patient_name ?? "this patient"}.</>
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
                <Button variant="outline" onClick={() => setAssignBHWReferral(null)}>
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
        )}
      </main>
    </div>
  );
}
