import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, MessageSquare, FileText, Send, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";

type MessageRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type ConsultationNote = {
  id?: string;
  diagnosis: string | null;
  advice: string | null;
  treatment_plan: string | null;
  follow_up_date: string | null;
  notes: string | null;
};

export default function ConsultationChat() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const location = useLocation();
  const { user, profile } = useAuth();
  const initialTab = (location.state as { openTab?: string } | null)?.openTab === "notes" ? "notes" : "chat";
  const [consultation, setConsultation] = useState<{
    id: string;
    patient_id: string;
    provider_id: string;
    status: string;
    patient_name?: string;
    provider_name?: string;
  } | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newBody, setNewBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [note, setNote] = useState<ConsultationNote>({
    diagnosis: "",
    advice: "",
    treatment_plan: "",
    follow_up_date: "",
    notes: "",
  });
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteLoaded, setNoteLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isProvider = consultation && user?.id === consultation.provider_id;
  const isPatient = consultation && user?.id === consultation.patient_id;

  useEffect(() => {
    if (!consultationId || !user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: tc, error: tcErr } = await supabase
        .from("teleconsultations")
        .select("id, patient_id, provider_id, status")
        .eq("id", consultationId)
        .single();
      if (tcErr || !tc) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      if (tc.patient_id !== user.id && tc.provider_id !== user.id) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      const [patientRes, providerRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", tc.patient_id).single(),
        supabase.from("profiles").select("full_name").eq("id", tc.provider_id).single(),
      ]);
      setConsultation({
        ...tc,
        patient_name: (patientRes.data as { full_name: string | null } | null)?.full_name ?? "Patient",
        provider_name: (providerRes.data as { full_name: string | null } | null)?.full_name ?? "Provider",
      });
      setLoading(false);
    })();
  }, [consultationId, user?.id]);

  const loadMessages = useCallback(async () => {
    if (!consultationId) return;
    const { data } = await supabase
      .from("consultation_messages")
      .select("id, sender_id, body, created_at")
      .eq("teleconsultation_id", consultationId)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as MessageRow[]);
  }, [consultationId]);

  useEffect(() => {
    if (!consultationId) return;
    // Initial history load, then keep in sync via realtime.
    loadMessages();

    const channel = supabase
      .channel(`consultation_messages:${consultationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "consultation_messages",
          filter: `teleconsultation_id=eq.${consultationId}`,
        },
        (payload) => {
          const row = payload.new as Partial<MessageRow> & { id?: string };
          if (!row?.id) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const next = [
              ...prev,
              {
                id: row.id,
                sender_id: String(row.sender_id ?? ""),
                body: String(row.body ?? ""),
                created_at: String(row.created_at ?? new Date().toISOString()),
              },
            ];
            next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!user?.id || !consultationId || !newBody.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("consultation_messages").insert({
        teleconsultation_id: consultationId,
        sender_id: user.id,
        body: newBody.trim(),
      });
      if (error) throw error;
      setNewBody("");
    } catch (e) {
      console.error("Send message failed", e);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (!consultationId || !user?.id || !consultation) {
      setNoteLoaded(true);
      return;
    }
    const providerIdToLoad = isProvider ? user.id : consultation.provider_id;
    (async () => {
      const { data } = await supabase
        .from("consultation_notes")
        .select("id, diagnosis, advice, treatment_plan, follow_up_date, notes")
        .eq("teleconsultation_id", consultationId)
        .eq("provider_id", providerIdToLoad)
        .maybeSingle();
      if (data) {
        setNote({
          diagnosis: (data as { diagnosis: string | null }).diagnosis ?? "",
          advice: (data as { advice: string | null }).advice ?? "",
          treatment_plan: (data as { treatment_plan: string | null }).treatment_plan ?? "",
          follow_up_date: (data as { follow_up_date: string | null }).follow_up_date ?? "",
          notes: (data as { notes: string | null }).notes ?? "",
        });
      }
      setNoteLoaded(true);
    })();
  }, [consultationId, user?.id, isProvider, consultation]);

  async function handleSaveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!consultationId || !user?.id || profile?.role !== "clinician") return;
    setNoteSaving(true);
    try {
      const { data: existing } = await supabase
        .from("consultation_notes")
        .select("id")
        .eq("teleconsultation_id", consultationId)
        .eq("provider_id", user.id)
        .maybeSingle();
      const payload = {
        teleconsultation_id: consultationId,
        provider_id: user.id,
        diagnosis: note.diagnosis.trim() || null,
        advice: note.advice.trim() || null,
        treatment_plan: note.treatment_plan.trim() || null,
        follow_up_date: note.follow_up_date.trim() || null,
        notes: note.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (existing?.id) {
        await supabase.from("consultation_notes").update(payload).eq("id", (existing as { id: string }).id);
      } else {
        await supabase.from("consultation_notes").insert(payload);
      }
    } catch (e) {
      console.error("Save note failed", e);
    } finally {
      setNoteSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-20 flex items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading…</span>
        </main>
      </div>
    );
  }

  if (forbidden || !consultation) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-20 text-center">
          <p className="text-muted-foreground">You don’t have access to this consultation.</p>
          <Button asChild className="mt-4">
            <Link to="/consultations">Back to Consultations</Link>
          </Button>
        </main>
      </div>
    );
  }

  const otherPartyName = isPatient ? consultation.provider_name : consultation.patient_name;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-20 max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/consultations">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Consultation with {otherPartyName}</h1>
            <p className="text-sm text-muted-foreground">Secure text-based chat · Status: {consultation.status}</p>
          </div>
        </div>

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="notes">
              <FileText className="w-4 h-4" />
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4">
            <Card>
              <CardContent className="p-0 flex flex-col" style={{ minHeight: "360px" }}>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[320px]">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Say hello.</p>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender_id === user?.id;
                      return (
                        <div
                          key={m.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                              isMe
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            <p className="font-medium text-xs opacity-80">{isMe ? "You" : otherPartyName}</p>
                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                            <p className="text-xs opacity-70 mt-1">{format(new Date(m.created_at), "MMM d, h:mm a")}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t p-3 flex gap-2">
                  <Input
                    placeholder="Type a message…"
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button onClick={handleSend} disabled={sending || !newBody.trim()} size="icon">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Consultation notes</CardTitle>
                <CardDescription>
                  {isProvider
                    ? "Add or edit your clinical notes for this consultation. Only you and the system can see these."
                    : "Summary and advice from your provider (if they have added notes)."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!noteLoaded ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading…
                  </div>
                ) : isProvider ? (
                  <form onSubmit={handleSaveNote} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="diagnosis">Diagnosis (optional)</Label>
                      <Input
                        id="diagnosis"
                        value={note.diagnosis}
                        onChange={(e) => setNote((n) => ({ ...n, diagnosis: e.target.value }))}
                        placeholder="Working diagnosis or impression"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="advice">Advice (optional)</Label>
                      <Textarea
                        id="advice"
                        value={note.advice}
                        onChange={(e) => setNote((n) => ({ ...n, advice: e.target.value }))}
                        placeholder="Recommendations for the patient"
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="treatment_plan">Treatment plan (optional)</Label>
                      <Textarea
                        id="treatment_plan"
                        value={note.treatment_plan}
                        onChange={(e) => setNote((n) => ({ ...n, treatment_plan: e.target.value }))}
                        placeholder="Medications, follow-up, etc."
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="follow_up_date">Follow-up date (optional)</Label>
                      <DatePicker
                        date={note.follow_up_date ? parseISO(note.follow_up_date) : undefined}
                        setDate={(date) => setNote((n) => ({ ...n, follow_up_date: date ? format(date, "yyyy-MM-dd") : "" }))}
                        placeholder="Select follow-up"
                        className="rounded-xl h-11"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        value={note.notes}
                        onChange={(e) => setNote((n) => ({ ...n, notes: e.target.value }))}
                        placeholder="Other clinical notes"
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                    <Button type="submit" disabled={noteSaving} className="gap-2">
                      {noteSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save notes
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-3 text-sm">
                    {note.diagnosis ? (
                      <div>
                        <p className="font-medium text-muted-foreground">Diagnosis</p>
                        <p className="text-foreground">{note.diagnosis}</p>
                      </div>
                    ) : null}
                    {note.advice ? (
                      <div>
                        <p className="font-medium text-muted-foreground">Advice</p>
                        <p className="text-foreground whitespace-pre-wrap">{note.advice}</p>
                      </div>
                    ) : null}
                    {note.treatment_plan ? (
                      <div>
                        <p className="font-medium text-muted-foreground">Treatment plan</p>
                        <p className="text-foreground whitespace-pre-wrap">{note.treatment_plan}</p>
                      </div>
                    ) : null}
                    {note.follow_up_date ? (
                      <div>
                        <p className="font-medium text-muted-foreground">Follow-up</p>
                        <p className="text-foreground">{note.follow_up_date}</p>
                      </div>
                    ) : null}
                    {note.notes ? (
                      <div>
                        <p className="font-medium text-muted-foreground">Notes</p>
                        <p className="text-foreground whitespace-pre-wrap">{note.notes}</p>
                      </div>
                    ) : null}
                    {!note.diagnosis && !note.advice && !note.treatment_plan && !note.follow_up_date && !note.notes && (
                      <p className="text-muted-foreground">No notes from your provider yet.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
