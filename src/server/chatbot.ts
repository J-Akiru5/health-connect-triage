import OpenAI from "openai";

type ChatMessageInput = {
  role?: string;
  content?: string;
};

type ChatRequestBody = {
  messages?: ChatMessageInput[];
};

type ChatResponse = {
  reply: string;
};

function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  return { apiKey, model };
}

function normalizeMessages(messages: ChatMessageInput[]) {
  const cleaned = messages
    .filter((message) => typeof message?.content === "string" && message.content.trim().length > 0)
    .map((message) => ({
      role:
        message.role === "assistant" || message.role === "user" || message.role === "system"
          ? message.role
          : "user",
      content: message.content!.trim(),
    }));

  return cleaned.slice(-12);
}

function buildSystemPrompt() {
  return [
    "You are a calm, helpful health support chatbot for a barangay telehealth app.",
    "Use clear everyday English and short sentences.",
    "Do not diagnose. Do not claim to be a doctor.",
    "Offer safe general guidance, suggest when to seek urgent care, and remind the user to contact local health workers for concerning symptoms.",
    "If a user mentions chest pain, trouble breathing, fainting, severe bleeding, stroke-like symptoms, or other emergency warning signs, tell them to seek emergency care immediately.",
    "When appropriate, mention common Philippine rural concerns such as dengue, dehydration, leptospirosis, diarrhea, fever, and respiratory infections.",
    "Stay supportive and practical.",
  ].join(" ");
}

export async function getChatbotReply(body: ChatRequestBody): Promise<ChatResponse> {
  const { apiKey, model } = getOpenAIConfig();
  const messages = normalizeMessages(body.messages ?? []);

  if (messages.length === 0) {
    throw new Error("No messages provided");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "system", content: buildSystemPrompt() }, ...messages],
    temperature: 0.4,
  });

  const reply = response.choices[0]?.message?.content?.trim() || "Sorry, I could not generate a reply right now.";
  return { reply };
}
