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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ArrowRightLeft, Loader2, ArrowLeft, FileText, Phone, UserPlus } from "lucide-react";
import { format } from "date-fns";

type ReferralRow = {
  id: string;
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
  const isClinician = profile?.role === "clinician";

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
  }, [user?.id, isClinician]);

  const pending = referrals.filter((r) => r.status === "pending" || r.status === "confirmed");
  const urgencyColor = (u: string) =>
    u === "emergency" ? "destructive" : u === "urgent" ? "default" : "secondary";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
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
                  {isClinician ? "Review, approve, and assign BHW follow-up" : "Escalations and facility referrals"}
                </p>
              </div>
            </div>
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <div className="flex flex-wrap gap-3 mb-6">
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="w-4 h-4" />
                  View details
                </Button>
                <Button variant="outline" size="sm">
                  Approve / Escalate
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Assign BHW follow-up
                </Button>
              </div>
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
      </main>
    </div>
  );
}
