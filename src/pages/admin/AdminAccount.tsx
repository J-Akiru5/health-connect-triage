import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, UserCog, KeyRound, Mail, CheckCircle2, Camera } from "lucide-react";

export default function AdminAccount() {
  const { user, profile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  useEffect(() => {
    setAvatarUrl(profile?.avatar_url ?? "");
  }, [profile?.avatar_url]);

  const canSaveProfile = useMemo(() => {
    const next = fullName.trim();
    const current = (profile?.full_name ?? "").trim();
    return !!user?.id && next.length > 0 && next !== current;
  }, [fullName, profile?.full_name, user?.id]);

  async function handleSaveProfile() {
    if (!user?.id || !canSaveProfile) return;
    setMessage(null);
    setSavingProfile(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      setMessage({ type: "error", text: error.message || "Failed to save account profile." });
      setSavingProfile(false);
      return;
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "admin_update_own_account",
      resource: "profiles",
      details: { full_name: fullName.trim() },
    });

    setMessage({ type: "success", text: "Profile saved successfully." });
    setSavingProfile(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setMessage(null);

    try {
      setUploadingAvatar(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (updateError) throw updateError;

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "admin_update_own_avatar",
        resource: "profiles",
        details: {},
      });

      setAvatarUrl(publicUrl);
      window.dispatchEvent(new CustomEvent("admin-profile-avatar-updated", { detail: { avatarUrl: publicUrl } }));
      setMessage({ type: "success", text: "Profile photo updated successfully." });
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Failed to upload profile photo." });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  async function handleChangePassword() {
    if (!user?.id) return;
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Password confirmation does not match." });
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setMessage({ type: "error", text: error.message || "Failed to change password." });
      setChangingPassword(false);
      return;
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "admin_change_own_password",
      resource: "auth",
      details: {},
    });

    setNewPassword("");
    setConfirmPassword("");
    setMessage({ type: "success", text: "Password updated successfully." });
    setChangingPassword(false);
  }

  return (
    <AdminLayout>
      <div className="space-y-6 w-full max-w-[1280px]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            My Account
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your administrator account details and security from within the admin console.
          </p>
        </div>

        {message && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" && <CheckCircle2 className="h-4 w-4" />}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your displayed administrator identity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-20 w-20 border border-slate-200 shadow-sm">
                    <AvatarImage src={avatarUrl || ""} className="object-cover" />
                    <AvatarFallback className="bg-[#800000]/10 text-[#800000] text-lg font-semibold">
                      {fullName?.charAt(0) || user?.email?.charAt(0) || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 rounded-full bg-black/45 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    {uploadingAvatar ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  </label>
                </div>
                <div className="text-sm text-slate-500">
                  <p className="font-semibold text-slate-800">Profile photo</p>
                  <p>Hover and click to upload a new avatar.</p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="admin-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input id="admin-email" value={user?.email ?? ""} readOnly className="pl-9 bg-muted" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="admin-full-name">Full name</Label>
                <Input
                  id="admin-full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <Button onClick={handleSaveProfile} disabled={!canSaveProfile || savingProfile} className="gap-2">
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                Save profile
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Change your account password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword || !confirmPassword}
                className="gap-2"
              >
                {changingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                Update password
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
