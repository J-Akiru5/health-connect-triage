import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { Loader2, Video, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

type TeleconsultRow = {
  id: string;
  patient_id: string;
  provider_id: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  patient_name?: string | null;
  provider_name?: string | null;
};

type ReferralRow = {
  id: string;
  patient_id: string;
  facility_name: string;
  urgency: string;
  status: string;
  created_at: string;
  patient_name?: string | null;
};

export default function AdminTeleconsultReferrals() {
  const [teleconsults, setTeleconsults] = useState<TeleconsultRow[]>([]);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [teleSearch, setTeleSearch] = useState("");
  const [teleStatus, setTeleStatus] = useState("all");
  const [refSearch, setRefSearch] = useState("");
  const [refStatus, setRefStatus] = useState("all");
  const [refUrgency, setRefUrgency] = useState("all");

  useEffect(() => {
    (async () => {
      const [tcRes, refRes] = await Promise.all([
        supabase
          .from("teleconsultations")
          .select("id, patient_id, provider_id, status, scheduled_at, created_at")
          .order("scheduled_at", { ascending: true, nullsFirst: false })
          .limit(50),
        supabase
          .from("referrals")
          .select("id, patient_id, facility_name, urgency, status, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const tcRows = (tcRes.data ?? []) as TeleconsultRow[];
      const refRows = (refRes.data ?? []) as ReferralRow[];

      const userIds = [
        ...new Set([
          ...tcRows.map((r) => r.patient_id),
          ...tcRows.map((r) => r.provider_id),
          ...refRows.map((r) => r.patient_id),
        ]),
      ];
      let nameMap: Record<string, string | null> = {};
      if (userIds.length > 0) {
        const { data: prof } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        nameMap = Object.fromEntries((prof ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));
      }

      setTeleconsults(tcRows.map((r) => ({ ...r, patient_name: nameMap[r.patient_id], provider_name: nameMap[r.provider_id] })));
      setReferrals(refRows.map((r) => ({ ...r, patient_name: nameMap[r.patient_id] })));
      setLoading(false);
    })();
  }, []);

  const pendingRefs = referrals.filter((r) => r.status === "pending");
  const overdue = teleconsults.filter(
    (t) => t.status === "scheduled" && t.scheduled_at && new Date(t.scheduled_at) < new Date()
  );

  const filteredTeleconsults = useMemo(() => {
    const q = teleSearch.trim().toLowerCase();
    return teleconsults.filter((t) => {
      const matchesSearch =
        q.length === 0 ||
        (t.patient_name ?? "").toLowerCase().includes(q) ||
        (t.provider_name ?? "").toLowerCase().includes(q) ||
        t.patient_id.toLowerCase().includes(q) ||
        t.provider_id.toLowerCase().includes(q);
      const matchesStatus = teleStatus === "all" || t.status === teleStatus;
      return matchesSearch && matchesStatus;
    });
  }, [teleconsults, teleSearch, teleStatus]);

  const filteredReferrals = useMemo(() => {
    const q = refSearch.trim().toLowerCase();
    return referrals.filter((r) => {
      const matchesSearch =
        q.length === 0 ||
        (r.patient_name ?? "").toLowerCase().includes(q) ||
        r.patient_id.toLowerCase().includes(q) ||
        r.facility_name.toLowerCase().includes(q);
      const matchesStatus = refStatus === "all" || r.status === refStatus;
      const matchesUrgency = refUrgency === "all" || r.urgency === refUrgency;
      return matchesSearch && matchesStatus && matchesUrgency;
    });
  }, [referrals, refSearch, refStatus, refUrgency]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teleconsultation & Referral Oversight</h1>
          <p className="text-muted-foreground mt-1">
            View schedules, referral tracking, and resolve conflicts or escalate issues.
          </p>
        </div>

        {(pendingRefs.length > 0 || overdue.length > 0) && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Alerts
              </CardTitle>
              <CardDescription>
                Pending or overdue items may need admin intervention.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {pendingRefs.length > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {pendingRefs.length} pending referral(s)
                </Badge>
              )}
              {overdue.length > 0 && (
                <Badge variant="destructive" className="text-sm">
                  {overdue.length} overdue scheduled consultation(s)
                </Badge>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Teleconsultations (last 50)
            </CardTitle>
            <CardDescription>System-wide scheduling and status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                value={teleSearch}
                onChange={(e) => setTeleSearch(e.target.value)}
                placeholder="Search patient/provider..."
              />
              <Select value={teleStatus} onValueChange={setTeleStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Patient</th>
                    <th className="text-left p-3 font-medium">Provider</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Scheduled</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeleconsults.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No matching teleconsultations.
                      </td>
                    </tr>
                  ) : (
                    filteredTeleconsults.map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="p-3">{t.patient_name ?? t.patient_id.slice(0, 8)}</td>
                        <td className="p-3">{t.provider_name ?? t.provider_id.slice(0, 8)}</td>
                        <td className="p-3">
                          <Badge variant={t.status === "in_progress" ? "default" : "secondary"}>{t.status}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {t.scheduled_at ? format(new Date(t.scheduled_at), "MMM d, HH:mm") : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Referrals (last 50)
            </CardTitle>
            <CardDescription>Referral tracking and completion rates.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
                placeholder="Search patient or facility..."
              />
              <Select value={refStatus} onValueChange={setRefStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={refUrgency} onValueChange={setRefUrgency}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All urgency</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="routine">Routine</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Patient</th>
                    <th className="text-left p-3 font-medium">Facility</th>
                    <th className="text-left p-3 font-medium">Urgency</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferrals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground">
                        No matching referrals.
                      </td>
                    </tr>
                  ) : (
                    filteredReferrals.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-3">{r.patient_name ?? r.patient_id.slice(0, 8)}</td>
                        <td className="p-3">{r.facility_name}</td>
                        <td className="p-3">
                          <Badge variant={r.urgency === "emergency" ? "destructive" : "secondary"}>{r.urgency}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={r.status === "pending" ? "outline" : "secondary"}>{r.status}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{format(new Date(r.created_at), "MMM d, HH:mm")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
