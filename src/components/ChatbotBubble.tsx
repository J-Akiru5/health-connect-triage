import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, RotateCcw, Bot, User, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { AppLogoMark } from "@/components/AppLogoMark";

/* ── Types ── */
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

const SESSION_KEY = "bhc_chatbot_messages";
const MAX_HISTORY = 50; // max messages to keep in session

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ── Greeting ── */
const GREETING: Message = {
  id: "greeting",
  role: "assistant",
  content:
    "Kumusta! 👋 I'm your Barangay Health Connect assistant. I can help you with health questions, navigate the app, or explain your triage results.\n\n⚕️ Please note: I'm an AI and not a substitute for professional medical advice.",
  timestamp: Date.now(),
};

/* ── Typing dots ── */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-muted/60 border border-border/30 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/50"
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Single message bubble ── */
function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-primary/10 text-primary"
        }`}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md shadow-md"
            : "bg-muted/60 text-foreground rounded-bl-md border border-border/30"
        }`}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Main ChatbotBubble component
   ═══════════════════════════════════════════ */
export function ChatbotBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ── Load session on mount ── */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        setMessages(parsed.length ? parsed : [GREETING]);
      } else {
        setMessages([GREETING]);
      }
    } catch {
      setMessages([GREETING]);
    }
  }, []);

  /* ── Persist to sessionStorage ── */
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
    }
  }, [messages]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isOpen]);

  /* ── Focus input when panel opens ── */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  /* ── Clear session ── */
  const clearSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    const fresh: Message = {
      ...GREETING,
      id: uid(),
      content:
        "Session cleared ✨\n\nKumusta! I'm your Barangay Health Connect assistant. How can I help you today?\n\n⚕️ I'm an AI — not a substitute for professional medical advice.",
      timestamp: Date.now(),
    };
    setMessages([fresh]);
    setError(null);
  }, []);

  /* ── Send message ── */
  const sendMessage = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = input.trim();
      if (!text || isLoading) return;

      setError(null);
      const userMsg: Message = { id: uid(), role: "user", content: text, timestamp: Date.now() };
      const next = [...messages, userMsg];
      setMessages(next);
      setInput("");
      setIsLoading(true);

      // Auto-resize textarea back
      if (inputRef.current) inputRef.current.style.height = "auto";

      try {
        const res = await fetch("/api/chatbot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: next.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || body.error || `Server error (${res.status})`);
        }

        const data = await res.json();
        const reply = data.reply || data.response;
        const assistantMsg: Message = {
          id: uid(),
          role: "assistant",
          content: reply || "I'm sorry, I couldn't generate a response.",
          timestamp: Date.now(),
        };
        setMessages([...next, assistantMsg]);
      } catch (err) {
        console.error("[ChatbotBubble]", err);
        setError(err instanceof Error ? err.message : "Something went wrong.");
        const errMsg: Message = {
          id: uid(),
          role: "assistant",
          content: "Sorry, I'm having trouble connecting right now. Please try again in a moment. 🙏",
          timestamp: Date.now(),
        };
        setMessages([...next, errMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages]
  );

  /* ── Handle Enter key (Shift+Enter for newline) ── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ── Textarea auto-resize ── */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  };

  /* ═══ Render ═══ */
  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 flex flex-col items-stretch sm:left-auto sm:right-5 sm:items-end"
      id="chatbot-bubble-root"
    >
      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="mb-3 w-full origin-bottom-right sm:w-[390px]"
          >
            <div className="flex h-[min(78vh,640px)] min-h-[480px] w-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-xl">
              {/* ── Header ── */}
              <div className="relative flex items-center justify-between bg-gradient-to-r from-primary to-primary/85 px-4 py-3 text-primary-foreground">
                {/* Decorative glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                <div className="flex items-center gap-2.5 relative z-10">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-inner">
                      <AppLogoMark className="w-[18px] h-[18px] text-primary-foreground" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold leading-tight tracking-tight">Health Assistant</span>
                    <span className="text-[10px] font-medium opacity-75 uppercase tracking-widest leading-tight">
                      Powered by Gemini 2.5 • 24/7
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 relative z-10">
                  <button
                    onClick={clearSession}
                    className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
                    title="New conversation"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ── Messages ── */}
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-3 p-4">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  {isLoading && <TypingIndicator />}

                  {/* Error banner */}
                  {error && !isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{error}</span>
                    </motion.div>
                  )}
                  <div ref={scrollEndRef} />
                </div>
              </ScrollArea>

              {/* ── Input ── */}
              <div className="border-t border-border/40 bg-card/80 p-3 backdrop-blur-sm">
                <form onSubmit={sendMessage} className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      disabled={isLoading}
                      rows={1}
                      className="chatbot-textarea w-full resize-none rounded-xl border border-border/50 bg-muted/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!input.trim() || isLoading}
                    className="rounded-xl h-10 w-10 shrink-0 shadow-md bg-primary hover:bg-primary/90 disabled:opacity-40 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
                <p className="text-[9px] text-muted-foreground/50 text-center mt-2 tracking-wide uppercase font-medium">
                  Powered by Gemini • Not a substitute for medical advice
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Trigger Button ── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="group relative w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background hover:shadow-2xl hover:shadow-primary/30 transition-shadow"
            id="chatbot-trigger"
            aria-label="Open health assistant chat"
          >
            {/* Pulse ring */}
            <span className="chatbot-ping-ring absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-40 pointer-events-none" />
            <MessageCircle className="w-6 h-6 relative z-10" />

            {/* Tooltip */}
            <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-card text-foreground text-xs font-medium shadow-lg border border-border/30 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
              Ask me anything about health
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
