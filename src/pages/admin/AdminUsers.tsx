import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, Pencil, UserX, UserCheck } from "lucide-react";
import type { UserRole } from "@/lib/database.types";

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean | null;
  assigned_barangay_id: string | null;
  created_at: string;
  barangay_name?: string | null;
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [barangays, setBarangays] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole | "">("");
  const [editBarangayId, setEditBarangayId] = useState<string | "">("");
  const [editFullName, setEditFullName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data: profData } = await supabase
      .from("profiles")
      .select("id, full_name, role, is_active, assigned_barangay_id, created_at")
      .order("created_at", { ascending: false });
    const { data: barData } = await supabase.from("barangays").select("id, name").order("name");

    const rows = (profData ?? []) as ProfileRow[];
    const barList = (barData ?? []) as { id: string; name: string }[];
    setBarangays(barList);

    const barIds = [...new Set(rows.map((r) => r.assigned_barangay_id).filter(Boolean))] as string[];
    let barMap: Record<string, string> = {};
    if (barIds.length > 0) {
      const barSub = barList.filter((b) => barIds.includes(b.id));
      barMap = Object.fromEntries(barSub.map((b) => [b.id, b.name]));
    }
    setProfiles(
      rows.map((r) => ({
        ...r,
        is_active: r.is_active ?? true,
        barangay_name: r.assigned_barangay_id ? barMap[r.assigned_barangay_id] ?? null : null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  function openEdit(p: ProfileRow) {
    setEditingId(p.id);
    setEditRole(p.role);
    setEditBarangayId(p.assigned_barangay_id ?? "");
    setEditFullName(p.full_name ?? "");
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editFullName || null,
        role: editRole || undefined,
        assigned_barangay_id: editBarangayId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingId);
    if (error) {
      console.error(error);
      setSaving(false);
      return;
    }
    await supabase.from("audit_logs").insert({
      user_id: currentUser?.id ?? null,
      action: "admin_update_profile",
      resource: "profiles",
      details: { profile_id: editingId, role: editRole, assigned_barangay_id: editBarangayId || null },
    });
    setEditingId(null);
    setSaving(false);
    load();
  }

  async function toggleActive(p: ProfileRow) {
    if (p.id === currentUser?.id) return;
    const next = !(p.is_active ?? true);
    const { error } = await supabase.from("profiles").update({ is_active: next, updated_at: new Date().toISOString() }).eq("id", p.id);
    if (error) {
      console.error(error);
      return;
    }
    await supabase.from("audit_logs").insert({
      user_id: currentUser?.id ?? null,
      action: next ? "admin_activate_user" : "admin_deactivate_user",
      resource: "profiles",
      details: { profile_id: p.id },
    });
    load();
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading users…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground mt-1">
              Create, update, or deactivate user accounts; assign roles and barangays.
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add user
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add user</DialogTitle>
                <DialogDescription>
                  New users must sign up via the platform. After they sign up, assign their role and barangay here.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" asChild>
                  <Link to="/signup">Open signup page</Link>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All users</CardTitle>
            <CardDescription>RBAC and barangay assignment; deactivate to revoke access.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Barangay</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3">
                        {editingId === p.id ? (
                          <Input
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            placeholder="Full name"
                            className="max-w-[180px]"
                          />
                        ) : (
                          p.full_name ?? p.id.slice(0, 8)
                        )}
                      </td>
                      <td className="p-3">
                        {editingId === p.id ? (
                          <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="patient">Patient</SelectItem>
                              <SelectItem value="bhw">BHW</SelectItem>
                              <SelectItem value="clinician">Clinician</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">{p.role}</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        {editingId === p.id ? (
                          <Select value={editBarangayId} onValueChange={setEditBarangayId}>
                            <SelectTrigger className="w-[160px]">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {barangays.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          p.barangay_name ?? "—"
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant={p.is_active !== false ? "default" : "secondary"}>
                          {p.is_active !== false ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {editingId === p.id ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={saveEdit} disabled={saving}>
                              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(p)} className="gap-1">
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                            {p.id !== currentUser?.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleActive(p)}
                                className="gap-1 text-muted-foreground hover:text-destructive"
                              >
                                {p.is_active !== false ? (
                                  <>
                                    <UserX className="h-3 w-3" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-3 w-3" />
                                    Activate
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
