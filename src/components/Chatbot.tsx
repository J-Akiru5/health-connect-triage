import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

const starterMessages: ChatMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content:
      "Hi. I’m the barangay health chatbot. Ask about symptoms, home care, what to watch for, or when you should go to the clinic.",
  },
];

export function Chatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const isEmpty = useMemo(() => messages.length <= starterMessages.length, [messages.length]);

  useEffect(() => {
    const viewport = viewportRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) {
      return;
    }

    const nextUserMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const optimisticMessages = [...messages, nextUserMessage];
    setMessages(optimisticMessages);
    setInput("");
    setSending(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: optimisticMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const data = (await response.json()) as {
        reply?: string;
        response?: string;
        error?: string;
        detail?: string;
      };
      if (!response.ok) {
        throw new Error(data.detail || data.error || "Unable to get a response");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            data.reply || data.response || "I’m having trouble replying right now. Please try again.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "I’m having trouble connecting right now. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="py-16 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border-border/60 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-primary/10 via-secondary/40 to-accent/10 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-2xl sm:text-3xl">Barangay Health Chatbot</CardTitle>
                <CardDescription className="mt-1 text-sm sm:text-base">
                  Ask about symptoms, next steps, and when to seek urgent care. Powered by Gemini.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 p-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="border-b border-border/60 lg:border-b-0 lg:border-r lg:border-r-border/60">
              <ScrollArea className="h-[420px] sm:h-[460px]" ref={viewportRef}>
                <div className="space-y-4 p-5 sm:p-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex items-end gap-3",
                        message.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Sparkles className="h-4 w-4" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground",
                        )}
                      >
                        {message.content}
                      </div>
                      {message.role === "user" && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  {sending && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                      <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground shadow-sm">
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Start a conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Try asking: “I have fever and body pain for 2 days, what should I do?”
                </p>
              </div>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message here..."
                className="min-h-[180px] resize-none"
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={sending || !input.trim()} className="w-full gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send message
              </Button>
              <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
                This chatbot gives general health guidance, not a diagnosis. If symptoms are severe or life-threatening,
                seek emergency care immediately.
              </div>
              {isEmpty && (
                <div className="text-xs text-muted-foreground">
                  It’s ready when you are.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
