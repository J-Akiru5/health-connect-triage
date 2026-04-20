import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Settings, CheckCircle2 } from "lucide-react";
import { SITE_BARANGAY } from "@/lib/site";

const KEYS = ["system_name", "max_patients_per_bhw", "default_session_timeout", "maintenance_mode"] as const;
type SettingKey = (typeof KEYS)[number];

const DEFAULTS: Record<SettingKey, string> = {
  system_name: `TeleHealth — ${SITE_BARANGAY}`,
  max_patients_per_bhw: "50",
  default_session_timeout: "30",
  maintenance_mode: "false",
};

export default function AdminSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<SettingKey, string>>({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("key, value")
        .in("key", [...KEYS]);
      if (data) {
        const merged = { ...DEFAULTS };
        (data as { key: string; value: string }[]).forEach((r) => {
          if (KEYS.includes(r.key as SettingKey)) {
            merged[r.key as SettingKey] = r.value;
          }
        });
        setSettings(merged);
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    setSaved(false);
    try {
      const upserts = KEYS.map((key) => ({
        key,
        value: settings[key],
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }));
      await supabase.from("system_settings").upsert(upserts, { onConflict: "key" });
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "admin_system_settings_updated",
        resource: "system_settings",
        details: { settings },
      });
      setSaved(true);
    } catch (e) {
      console.error("Failed to save settings", e);
    } finally {
      setSaving(false);
    }
  }

  function set(key: SettingKey, value: string) {
    setSaved(false);
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading settings…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6" />
            System Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure platform-wide settings. Changes take effect immediately after saving.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Platform name and capacity limits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="system-name">System name</Label>
              <Input
                id="system-name"
                value={settings.system_name}
                onChange={(e) => set("system_name", e.target.value)}
                placeholder={`TeleHealth — ${SITE_BARANGAY}`}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="max-patients">Max patients per BHW</Label>
              <Input
                id="max-patients"
                type="number"
                min="1"
                max="500"
                value={settings.max_patients_per_bhw}
                onChange={(e) => set("max_patients_per_bhw", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Maximum number of patients a single BHW can be assigned to.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Authentication and session timeout settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label>Default session timeout</Label>
              <Select
                value={settings.default_session_timeout}
                onValueChange={(v) => set("default_session_timeout", v)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance</CardTitle>
            <CardDescription>Control platform availability.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Maintenance mode</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When enabled, non-admin users see a maintenance message.
                </p>
              </div>
              <Switch
                checked={settings.maintenance_mode === "true"}
                onCheckedChange={(checked) => set("maintenance_mode", checked ? "true" : "false")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save settings"
            )}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Settings saved
            </span>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
