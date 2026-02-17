import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, Pencil } from "lucide-react";

type BarangayRow = { id: string; name: string; created_at: string };

export default function AdminBarangays() {
  const { user: currentUser } = useAuth();
  const [barangays, setBarangays] = useState<BarangayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("barangays").select("id, name, created_at").order("name");
    setBarangays((data ?? []) as BarangayRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditId(null);
    setName("");
    setModalOpen(true);
  }

  function openEdit(b: BarangayRow) {
    setEditId(b.id);
    setName(b.name);
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    if (editId) {
      const { error } = await supabase.from("barangays").update({ name: name.trim() }).eq("id", editId);
      if (error) {
        console.error(error);
        setSaving(false);
        return;
      }
      await supabase.from("audit_logs").insert({
        user_id: currentUser?.id ?? null,
        action: "admin_update_barangay",
        resource: "barangays",
        details: { barangay_id: editId, name: name.trim() },
      });
    } else {
      const { error } = await supabase.from("barangays").insert({ name: name.trim() });
      if (error) {
        console.error(error);
        setSaving(false);
        return;
      }
      await supabase.from("audit_logs").insert({
        user_id: currentUser?.id ?? null,
        action: "admin_create_barangay",
        resource: "barangays",
        details: { name: name.trim() },
      });
    }
    setModalOpen(false);
    setSaving(false);
    load();
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading barangays…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Barangay & Community Data</h1>
            <p className="text-muted-foreground mt-1">
              Add or update barangay records; assign BHWs to barangays via User Management.
            </p>
          </div>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Add barangay
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? "Edit barangay" : "New barangay"}</DialogTitle>
                <DialogDescription>
                  Barangay name is used for patient assignment and BHW/clinician assignment.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="barangay-name">Name</Label>
                  <Input
                    id="barangay-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Barangay Poblacion"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={!name.trim() || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Barangays</CardTitle>
            <CardDescription>Patient registration and BHW assignment are linked via User Management.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-lg border">
              {barangays.length === 0 ? (
                <li className="p-4 text-center text-muted-foreground">No barangays yet. Add one above.</li>
              ) : (
                barangays.map((b) => (
                  <li key={b.id} className="flex items-center justify-between p-3">
                    <span className="font-medium">{b.name}</span>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(b)} className="gap-1">
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
