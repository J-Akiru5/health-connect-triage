import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Loader2, FileText } from "lucide-react";
import { format } from "date-fns";

type AuditRow = {
  id: string;
  user_id: string | null;
  action: string;
  resource: string;
  details: Record<string, unknown> | null;
  created_at: string;
  full_name?: string | null;
};

export default function AdminAudit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceFilter, setResourceFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("audit_logs")
      .select("id, user_id, action, resource, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (resourceFilter.trim()) {
      q = q.ilike("resource", `%${resourceFilter.trim()}%`);
    }
    if (actionFilter.trim()) {
      q = q.ilike("action", `%${actionFilter.trim()}%`);
    }
    const { data } = await q;

    const list = (data ?? []) as AuditRow[];
    const userIds = [...new Set(list.map((r) => r.user_id).filter(Boolean))] as string[];
    let nameMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: prof } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      nameMap = Object.fromEntries((prof ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));
    }
    setRows(list.map((r) => ({ ...r, full_name: r.user_id ? nameMap[r.user_id] ?? null : null })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit, Compliance & Reporting</h1>
          <p className="text-muted-foreground mt-1">
            Review audit logs for user actions, data access, and system changes. JC-3 governance and research traceability.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit log
            </CardTitle>
            <CardDescription>
              Query audit_logs; generate reports for internal or external evaluation. Report generation and export actions are logged.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="grid gap-2">
                <Label>Resource (filter)</Label>
                <Input
                  placeholder="e.g. profiles, auth"
                  value={resourceFilter}
                  onChange={(e) => setResourceFilter(e.target.value)}
                  className="max-w-[180px]"
                />
              </div>
              <div className="grid gap-2">
                <Label>Action (filter)</Label>
                <Input
                  placeholder="e.g. login, admin_"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="max-w-[180px]"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={load} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Time</th>
                    <th className="text-left p-3 font-medium">User</th>
                    <th className="text-left p-3 font-medium">Action</th>
                    <th className="text-left p-3 font-medium">Resource</th>
                    <th className="text-left p-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground">
                        {loading ? "Loading…" : "No matching audit entries."}
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {format(new Date(r.created_at), "MMM d, HH:mm:ss")}
                        </td>
                        <td className="p-3">{r.full_name ?? r.user_id ?? "—"}</td>
                        <td className="p-3">{r.action}</td>
                        <td className="p-3">{r.resource}</td>
                        <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                          {r.details && Object.keys(r.details).length > 0
                            ? JSON.stringify(r.details)
                            : "—"}
                        </td>
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
