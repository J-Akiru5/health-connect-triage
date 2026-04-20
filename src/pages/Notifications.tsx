import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableRowsSkeleton } from "@/components/ui/loading-skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { handleMissingNotificationsTable } from "@/lib/notifications";
import { Bell, ArrowLeft, CheckCheck } from "lucide-react";
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
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, read_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error && handleMissingNotificationsTable(error)) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      setNotifications(data ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  async function markAllRead() {
    if (!user?.id) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error && handleMissingNotificationsTable(error)) {
      setNotifications([]);
      return;
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-20 pb-24 flex-1">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div className="flex items-center justify-between flex-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
                  <p className="text-sm text-muted-foreground">Alerts and updates</p>
                </div>
              </div>
              {notifications.some((n) => !n.read_at) && (
                <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2 rounded-xl">
                  <CheckCheck className="w-4 h-4" />
                  Mark All Read
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="py-6">
                <TableRowsSkeleton rows={6} columns={3} />
              </CardContent>
            </Card>
          ) : notifications.length === 0 ? (
            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="py-16 text-center">
                <Bell className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications yet.</p>
                <Button asChild className="mt-4 rounded-xl" variant="outline">
                  <Link to="/dashboard">Back to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="rounded-2xl border shadow-sm overflow-hidden mb-6">
                <CardContent className="p-0 divide-y">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex gap-4 p-4 sm:p-5 ${!n.read_at ? "bg-primary/5 border-l-4 border-l-primary" : ""}`}
                    >
                      <div className="shrink-0">
                        {n.read_at ? (
                          <span className="text-xs text-muted-foreground font-medium">Read</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">Unread</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{n.title}</p>
                        {n.body && <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>}
                        <p className="text-xs text-muted-foreground mt-2">{format(new Date(n.created_at), "MMM d, h:mm a")}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Button variant="outline" className="rounded-xl" asChild>
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
