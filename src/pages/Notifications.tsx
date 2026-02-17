import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Bell, Loader2, ArrowLeft, CheckCheck } from "lucide-react";
import { format } from "date-fns";

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    read_at: string | null;
    created_at: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, read_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setNotifications(data ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  async function markAllRead() {
    if (!user?.id) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center justify-between flex-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
                  <p className="text-sm text-muted-foreground">Alerts and updates</p>
                </div>
              </div>
              {notifications.some((n) => !n.read_at) && (
                <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
                  <CheckCheck className="w-4 h-4" />
                  Mark All Read
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-12 flex items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Loading…</span>
              </CardContent>
            </Card>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No notifications yet.</p>
                <Button asChild className="mt-4" variant="outline">
                  <Link to="/dashboard">Back to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="mb-6">
                <CardContent className="p-0 divide-y">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex gap-3 p-4 ${!n.read_at ? "bg-muted/50" : ""}`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {n.read_at ? (
                          <span className="text-xs text-muted-foreground">Read</span>
                        ) : (
                          <span className="text-xs font-medium text-primary">Unread</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{n.title}</p>
                        {n.body && <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.created_at), "MMM d, h:mm a")}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
