import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const URGENCY_OPTIONS = [
  { value: "routine", label: "Routine" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
] as const;

export type CreateReferralPrefilledPatient = { id: string; name: string };

type CreateReferralModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, this patient is used and no patient selector is shown. */
  prefilledPatient: CreateReferralPrefilledPatient | null;
  /** When prefilledPatient is null, show a patient dropdown from this list. */
  patientsList?: CreateReferralPrefilledPatient[];
  onSuccess: () => void;
};

export function CreateReferralModal({
  open,
  onOpenChange,
  prefilledPatient,
  patientsList = [],
  onSuccess,
}: CreateReferralModalProps) {
  const { user, profile } = useAuth();
  const [facilityName, setFacilityName] = useState("");
  const [urgency, setUrgency] = useState<"routine" | "urgent" | "emergency">("urgent");
  const [requiredDocuments, setRequiredDocuments] = useState("");
  const [priorRecordsNotes, setPriorRecordsNotes] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSelectPatient = !prefilledPatient && patientsList.length > 0;
  const patientId = prefilledPatient?.id ?? (selectedPatientId || null);

  useEffect(() => {
    if (!open) {
      setFacilityName("");
      setUrgency("urgent");
      setRequiredDocuments("");
      setPriorRecordsNotes("");
      setSelectedPatientId(patientsList[0]?.id ?? "");
      setError(null);
    }
  }, [open, patientsList]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !patientId) {
      setError(canSelectPatient ? "Please select a patient." : "Missing patient.");
      return;
    }
    if ((profile?.role !== "clinician" && profile?.role !== "bhw") || !profile) {
      setError("Only clinicians and BHWs can create referrals.");
      return;
    }
    if (!facilityName.trim()) {
      setError("Facility name is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { data: referral, error: insertError } = await supabase
        .from("referrals")
        .insert({
          patient_id: patientId,
          from_provider_id: user.id,
          facility_name: facilityName.trim(),
          urgency,
          required_documents: requiredDocuments.trim() || null,
          prior_records_notes: priorRecordsNotes.trim() || null,
          status: "pending",
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "referral_created",
        resource: "referrals",
        details: {
          referral_id: referral?.id,
          patient_id: patientId,
          facility_name: facilityName.trim(),
          urgency,
        },
      });
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      console.error("Failed to create referral", e);
      setError(e instanceof Error ? e.message : "Failed to create referral.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create referral</DialogTitle>
          <DialogDescription>
            Refer this patient to an RHU or hospital. Required documents and notes help the receiving facility.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {prefilledPatient && (
            <p className="text-sm text-muted-foreground">
              Patient: <span className="font-medium text-foreground">{prefilledPatient.name}</span>
            </p>
          )}
          {canSelectPatient && (
            <div className="grid gap-2">
              <Label>Patient</Label>
              {patientsList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No patients in your list. Create a referral from Triage Monitor for a specific patient.
                </p>
              ) : (
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patientsList.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="facility">Facility name (e.g. RHU / Hospital) *</Label>
            <Input
              id="facility"
              placeholder="e.g. Municipal RHU, Provincial Hospital"
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Urgency</Label>
            <Select value={urgency} onValueChange={(v) => setUrgency(v as typeof urgency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {URGENCY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="documents">Required documents (optional)</Label>
            <Textarea
              id="documents"
              placeholder="e.g. Lab results, referral form, ID"
              value={requiredDocuments}
              onChange={(e) => setRequiredDocuments(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Prior records / notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Brief clinical notes for receiving facility"
              value={priorRecordsNotes}
              onChange={(e) => setPriorRecordsNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || (canSelectPatient && patientsList.length === 0)}
              className="gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create referral
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
