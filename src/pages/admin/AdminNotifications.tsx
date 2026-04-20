import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Bell, Send } from "lucide-react";
import type { UserRole } from "@/lib/database.types";

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  read_at: string | null;
  created_at: string;
};

export default function AdminNotifications() {
  const { user: currentUser } = useAuth();
  const [list, setList] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetRole, setTargetRole] = useState<string>("all");
  const [notifType, setNotifType] = useState("system_alert");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [readFilter, setReadFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setList((data ?? []) as NotificationRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const typeOptions = useMemo(() => [...new Set(list.map((n) => n.type))], [list]);

  const filteredList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return list.filter((n) => {
      const matchesSearch = q.length === 0 || n.title.toLowerCase().includes(q) || n.type.toLowerCase().includes(q);
      const matchesRead =
        readFilter === "all" ||
        (readFilter === "read" && !!n.read_at) ||
        (readFilter === "unread" && !n.read_at);
      const matchesType = typeFilter === "all" || n.type === typeFilter;
      return matchesSearch && matchesRead && matchesType;
    });
  }, [list, searchTerm, readFilter, typeFilter]);

  async function sendNotification() {
    if (!title.trim()) return;
    setSending(true);

    let userIds: string[] = [];
    if (targetRole === "all") {
      const { data: profiles } = await supabase.from("profiles").select("id");
      userIds = (profiles ?? []).map((p: { id: string }) => p.id);
    } else {
      const { data: profiles } = await supabase.from("profiles").select("id").eq("role", targetRole);
      userIds = (profiles ?? []).map((p: { id: string }) => p.id);
    }

    const inserts = userIds.map((user_id) => ({
      user_id,
      type: notifType,
      title: title.trim(),
      body: body.trim() || null,
    }));

    const { error } = await supabase.from("notifications").insert(inserts);
    if (error) {
      console.error(error);
      setSending(false);
      return;
    }
    await supabase.from("audit_logs").insert({
      user_id: currentUser?.id ?? null,
      action: "admin_send_notification",
      resource: "notifications",
      details: { target_role: targetRole, type: notifType, title: title.trim(), count: userIds.length },
    });
    setTitle("");
    setBody("");
    setSending(false);
    load();
  }

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
          <h1 className="text-2xl font-bold tracking-tight">System Notifications & Alerts</h1>
          <p className="text-muted-foreground mt-1">
            Configure system-wide notifications; push to selected roles or all users. Delivery and read status tracked.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send notification
            </CardTitle>
            <CardDescription>
              Emergency alerts, health campaigns, follow-up reminders. Target by role or all users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Target</Label>
                <Select value={targetRole} onValueChange={setTargetRole}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    <SelectItem value="patient">Patients only</SelectItem>
                    <SelectItem value="bhw">BHWs only</SelectItem>
                    <SelectItem value="clinician">Clinicians only</SelectItem>
                    <SelectItem value="admin">Admins only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={notifType} onValueChange={setNotifType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system_alert">System alert</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="health_campaign">Health campaign</SelectItem>
                    <SelectItem value="follow_up_reminder">Follow-up reminder</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notif-title">Title</Label>
              <Input
                id="notif-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notif-body">Body (optional)</Label>
              <Input
                id="notif-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Message body"
              />
            </div>
            <Button onClick={sendNotification} disabled={!title.trim() || sending} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent notifications (last 100)
            </CardTitle>
            <CardDescription>Delivery and read status for compliance reporting.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search title or type..."
              />
              <Select value={readFilter} onValueChange={setReadFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter read" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {typeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Title</th>
                    <th className="text-left p-3 font-medium">Read</th>
                    <th className="text-left p-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No matching notifications.
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((n) => (
                      <tr key={n.id} className="border-t">
                        <td className="p-3">{n.type}</td>
                        <td className="p-3">{n.title}</td>
                        <td className="p-3">{n.read_at ? "Yes" : "No"}</td>
                        <td className="p-3 text-muted-foreground">{new Date(n.created_at).toLocaleString()}</td>
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
