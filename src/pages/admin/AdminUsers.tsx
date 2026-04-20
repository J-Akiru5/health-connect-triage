import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
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
import { Loader2, Plus, Pencil, KeyRound, Users } from "lucide-react";
import type { UserRole } from "@/lib/database.types";

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: UserRole;
  assigned_barangay_name: string | null;
  created_at: string;
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole | "">("");
  const [editBarangayName, setEditBarangayName] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [saving, setSaving] = useState(false);

  const [resetRow, setResetRow] = useState<ProfileRow | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const load = async () => {
    const { data: profData } = await supabase
      .from("profiles")
      .select("id, full_name, role, assigned_barangay_name, created_at")
      .order("created_at", { ascending: false });

    setProfiles((profData ?? []) as ProfileRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredProfiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return profiles.filter((p) => {
      const matchesSearch =
        q.length === 0 ||
        (p.full_name ?? "").toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.assigned_barangay_name ?? "").toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || p.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [profiles, searchTerm, roleFilter]);

  function openEdit(p: ProfileRow) {
    setEditingId(p.id);
    setEditRole(p.role);
    setEditBarangayName(p.assigned_barangay_name ?? "");
    setEditFullName(p.full_name ?? "");
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editFullName.trim() || null,
        role: editRole || undefined,
        assigned_barangay_name: editBarangayName.trim() || null,
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
      details: {
        profile_id: editingId,
        role: editRole,
        assigned_barangay_name: editBarangayName.trim() || null,
      },
    });

    setEditingId(null);
    setSaving(false);
    load();
  }

  async function handleResetPassword() {
    if (!resetRow || !resetEmail.trim()) return;
    setResetSending(true);

    try {
      await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      await supabase.from("audit_logs").insert({
        user_id: currentUser?.id ?? null,
        action: "admin_password_reset",
        resource: "profiles",
        details: { profile_id: resetRow.id, email: resetEmail.trim() },
      });

      setResetSent(true);
    } catch (e) {
      console.error("Reset failed", e);
    } finally {
      setResetSending(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading users...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col h-full space-y-8 w-full mx-auto max-w-[1920px]">
        <section className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#800000]/10 border border-[#800000]/20 text-[#800000] text-[11px] font-bold tracking-widest uppercase mb-2">
              <Users className="w-3.5 h-3.5" /> Platform Access Control
            </div>
            <h1 className="text-[28px] leading-tight font-bold tracking-tight text-slate-900 border-b-2 border-transparent">
              User Management
            </h1>
            <p className="text-[14px] text-slate-500 max-w-[700px] leading-relaxed">
              Create, update, or revoke access credentials and assign RBAC roles and barangays.
            </p>
          </div>

          <div className="md:ml-auto md:self-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-[#800000] hover:bg-[#5C0000] text-white rounded-lg shadow-sm hover:shadow-md transition-all px-4 py-2.5 h-auto text-[13px] font-semibold">
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  Provision New Identity
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add user</DialogTitle>
                  <DialogDescription>
                    New users must sign up via the platform. After they sign up, assign role and barangay here.
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
        </section>

        <section className="flex-1 min-h-[350px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative z-10">
          <div className="border-b border-slate-100 p-4 md:p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, user ID, or barangay..."
              />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="clinician">Clinician</SelectItem>
                  <SelectItem value="bhw">BHW</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-white p-0">
            <table className="w-full text-left border-collapse border-0">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="py-3 px-6 text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                    Operator Name
                  </th>
                  <th className="py-3 px-6 text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                    Access Level (RBAC)
                  </th>
                  <th className="py-3 px-6 text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                    Assigned Sector
                  </th>
                  <th className="py-3 px-6 text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap text-right">
                    Administrative Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No matching users found.
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group border-t border-slate-100">
                      <td className="py-3 px-6 text-[13px] font-medium text-slate-800">
                        {editingId === p.id ? (
                          <Input
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            placeholder="Full name"
                            className="max-w-[220px]"
                          />
                        ) : (
                          p.full_name ?? p.id.slice(0, 8)
                        )}
                      </td>
                      <td className="py-3 px-6 text-[13px] font-medium text-slate-800">
                        {editingId === p.id ? (
                          <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                            <SelectTrigger className="w-[150px]">
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
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider border border-slate-200">
                            {p.role}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-[13px] font-medium text-slate-800">
                        {editingId === p.id ? (
                          <Input
                            value={editBarangayName}
                            onChange={(e) => setEditBarangayName(e.target.value)}
                            placeholder="Barangay (optional)"
                            className="w-[220px]"
                          />
                        ) : (
                          p.assigned_barangay_name ?? "-"
                        )}
                      </td>

                      <td className="py-3 px-6 text-[13px]">
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
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1 text-muted-foreground"
                              onClick={() => {
                                setResetRow(p);
                                setResetEmail("");
                                setResetSent(false);
                              }}
                            >
                              <KeyRound className="h-3 w-3" />
                              Reset PW
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Dialog
        open={!!resetRow}
        onOpenChange={(open) => {
          if (!open) {
            setResetRow(null);
            setResetSent(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              {resetSent
                ? "A password reset email has been sent. The user can follow the link to set a new password."
                : `Send a password reset email for ${resetRow?.full_name ?? "this user"}.`}
            </DialogDescription>
          </DialogHeader>
          {!resetSent && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="reset-email">User email address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetRow(null);
                setResetSent(false);
              }}
            >
              {resetSent ? "Close" : "Cancel"}
            </Button>
            {!resetSent && (
              <Button onClick={handleResetPassword} disabled={resetSending || !resetEmail.trim()} className="gap-2">
                {resetSending && <Loader2 className="h-4 w-4 animate-spin" />}
                Send reset email
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
