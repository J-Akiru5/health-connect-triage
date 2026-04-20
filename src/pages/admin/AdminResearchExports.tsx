import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Database, Plus } from "lucide-react";
import { format } from "date-fns";

type ExportRow = {
  id: string;
  requested_by: string | null;
  purpose: string;
  anonymized: boolean;
  consent_aligned: boolean;
  status: string;
  created_at: string;
  requested_by_name?: string | null;
};

export default function AdminResearchExports() {
  const { user: currentUser } = useAuth();
  const [exports, setExports] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [anonymized, setAnonymized] = useState(true);
  const [consentAligned, setConsentAligned] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("research_exports")
      .select("id, requested_by, purpose, anonymized, consent_aligned, status, created_at")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as ExportRow[];
    const userIds = [...new Set(rows.map((r) => r.requested_by).filter(Boolean))] as string[];
    let nameMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: prof } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      nameMap = Object.fromEntries((prof ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));
    }
    setExports(rows.map((r) => ({ ...r, requested_by_name: r.requested_by ? nameMap[r.requested_by] ?? null : null })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  async function createExport() {
    if (!purpose.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("research_exports").insert({
      requested_by: currentUser?.id ?? null,
      purpose: purpose.trim(),
      anonymized,
      consent_aligned: consentAligned,
      status: "pending",
      metadata: { created_via: "admin_ui" },
    });
    if (error) {
      console.error(error);
      setSaving(false);
      return;
    }
    await supabase.from("audit_logs").insert({
      user_id: currentUser?.id ?? null,
      action: "admin_create_research_export",
      resource: "research_exports",
      details: { purpose: purpose.trim(), anonymized, consent_aligned: consentAligned },
    });
    setModalOpen(false);
    setPurpose("");
    setAnonymized(true);
    setConsentAligned(true);
    setSaving(false);
    load();
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading research exports…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Research Data Export Management</h1>
            <p className="text-muted-foreground mt-1">
              Prepare anonymized datasets for research; align with consent and IRB. Export metadata logged (who, purpose, anonymized, timestamp).
            </p>
          </div>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New export request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New research export</DialogTitle>
                <DialogDescription>
                  Log export metadata for audit. Ensure dataset aligns with consent records and IRB approvals. Notify research team when ready.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="export-purpose">Purpose</Label>
                  <Input
                    id="export-purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. JC-3 research analysis, IRB-2024-001"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="anonymized" checked={anonymized} onCheckedChange={(c) => setAnonymized(!!c)} />
                  <Label htmlFor="anonymized" className="font-normal">Anonymized dataset</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="consent" checked={consentAligned} onCheckedChange={(c) => setConsentAligned(!!c)} />
                  <Label htmlFor="consent" className="font-normal">Aligned with consent records</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createExport} disabled={!purpose.trim() || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Research exports
            </CardTitle>
            <CardDescription>
              Maintain anonymization and version control; notify research team when dataset is ready.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Purpose</th>
                    <th className="text-left p-3 font-medium">Requested by</th>
                    <th className="text-left p-3 font-medium">Anonymized</th>
                    <th className="text-left p-3 font-medium">Consent aligned</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {exports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">
                        No research exports yet.
                      </td>
                    </tr>
                  ) : (
                    exports.map((e) => (
                      <tr key={e.id} className="border-t">
                        <td className="p-3">{e.purpose}</td>
                        <td className="p-3">{e.requested_by_name ?? e.requested_by ?? "—"}</td>
                        <td className="p-3">{e.anonymized ? "Yes" : "No"}</td>
                        <td className="p-3">{e.consent_aligned ? "Yes" : "No"}</td>
                        <td className="p-3">
                          <Badge variant={e.status === "ready" ? "default" : "secondary"}>{e.status}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{format(new Date(e.created_at), "MMM d, HH:mm")}</td>
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
