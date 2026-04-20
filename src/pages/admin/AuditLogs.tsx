import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  resource: string;
  details: any;
  created_at: string;
  profiles?: { full_name: string | null } | null;
};

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select(`
          *,
          profiles ( full_name )
        `)
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs(data as AuditLog[] ?? []);
      setLoading(false);
    })();
  }, []);

  const resourceOptions = useMemo(() => [...new Set(logs.map((l) => l.resource))], [logs]);
  const actionOptions = useMemo(() => [...new Set(logs.map((l) => l.action))], [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return logs.filter((l) => {
      const userName = l.profiles?.full_name || l.user_id || "System";
      const matchesSearch =
        q.length === 0 ||
        userName.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.resource.toLowerCase().includes(q) ||
        JSON.stringify(l.details).toLowerCase().includes(q);
      const matchesResource = resourceFilter === "all" || l.resource === resourceFilter;
      const matchesAction = actionFilter === "all" || l.action === actionFilter;
      return matchesSearch && matchesResource && matchesAction;
    });
  }, [logs, searchTerm, resourceFilter, actionFilter]);

  const exportCSV = () => {
    if (filteredLogs.length === 0) return;
    const header = ["Timestamp,Action,Resource,User,Details"];
    const rows = filteredLogs.map(l => {
      const date = `"${format(new Date(l.created_at), "yyyy-MM-dd HH:mm:ss")}"`;
      const action = `"${l.action}"`;
      const resource = `"${l.resource}"`;
      const user = `"${l.profiles?.full_name || l.user_id || "System"}"`;
      const details = `"${JSON.stringify(l.details).replace(/"/g, '""')}"`;
      return [date, action, resource, user, details].join(",");
    });
    
    const csvStr = [...header, ...rows].join("\n");
    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `audit_logs_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading logs…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground mt-2">View and track all system activities for HIPAA compliance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
              <Download className="h-4 w-4" />
              CSV Export
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Activity Log</CardTitle>
            <CardDescription>Most recent 100 system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search user, action, resource, details..."
              />
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All resources</SelectItem>
                  {resourceOptions.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {actionOptions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {filteredLogs.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No audit logs available yet</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium whitespace-nowrap">Timestamp</th>
                      <th className="text-left p-3 font-medium whitespace-nowrap">User</th>
                      <th className="text-left p-3 font-medium whitespace-nowrap">Action</th>
                      <th className="text-left p-3 font-medium whitespace-nowrap">Resource</th>
                      <th className="text-left p-3 font-medium min-w-[200px]">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, HH:mm")}
                        </td>
                        <td className="p-3 font-medium whitespace-nowrap">
                          {log.profiles?.full_name || "System"}
                        </td>
                        <td className="p-3">
                          <code className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {log.action}
                          </code>
                        </td>
                        <td className="p-3 whitespace-nowrap">{log.resource}</td>
                        <td className="p-3 text-muted-foreground font-mono text-[10px] break-all">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
export default AuditLogs;
