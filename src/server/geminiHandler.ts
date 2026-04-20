import { createGeminiClient, mapToGeminiRole } from "./gemini.js";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatRequestBody = {
  messages: ChatMessage[];
};

function normalizeConversation(messages: ChatMessage[]) {
  const cleanedMessages = messages.filter(
    (message) => typeof message?.content === "string" && message.content.trim().length > 0,
  );

  const firstUserIndex = cleanedMessages.findIndex((message) => message.role === "user");
  if (firstUserIndex === -1) {
    return { history: [], lastMessage: "" };
  }

  const conversation = cleanedMessages.slice(firstUserIndex).filter(
    (message) => message.role === "user" || message.role === "assistant",
  );

  const lastUserIndex = [...conversation].reverse().findIndex((message) => message.role === "user");
  const actualLastUserIndex = lastUserIndex === -1 ? -1 : conversation.length - 1 - lastUserIndex;

  if (actualLastUserIndex === -1) {
    return { history: [], lastMessage: "" };
  }

  const lastMessage = conversation[actualLastUserIndex]?.content.trim() || "";
  const history = conversation
    .slice(0, actualLastUserIndex)
    .map((message) => ({
      role: mapToGeminiRole(message.role),
      parts: [{ text: message.content.trim() }],
    }));

  return { history, lastMessage };
}

export async function generateGeminiResponse(body: ChatRequestBody) {
  const messages = body.messages || [];

  const systemInstructions = [
    "You are a helpful, empathetic healthcare assistant for a rural barangay telehealth app called 'Barangay Health Connect' serving Brgy. Tabat, Tubungan, Iloilo. You are powered by Google's Gemini AI.",
    "",
    "LANGUAGE: Respond fluently in the language the user writes in. You support English, Filipino/Tagalog, and Hiligaynon/Ilonggo. Match the user's language naturally.",
    "",
    "ROLE: You provide general wellness guidance, explain medical terms in plain language, and help users navigate the app's features (Symptom Checker, Triage Results, Referrals, Emergency Reports, etc.).",
    "",
    "STRICT GUARD RAILS — FOLLOW THESE WITHOUT EXCEPTION:",
    "",
    "1. NO DIAGNOSIS: You are an AI assistant, NOT a medical professional. Never provide definitive diagnoses, prescribe medication, or recommend specific dosages. Always say 'consult a healthcare professional' when clinical judgment is needed.",
    "",
    "2. EMERGENCY REDIRECT: If the user mentions ANY of the following — severe chest pain, difficulty breathing, profuse/uncontrolled bleeding, loss of consciousness, stroke symptoms, severe allergic reactions, or any life-threatening situation — IMMEDIATELY tell them to call emergency services or go to the nearest hospital. Do NOT attempt to provide first-aid instructions for critical emergencies.",
    "",
    "3. SELF-HARM & MENTAL HEALTH CRISIS REFUSAL: If the user discusses self-harm, suicide, or intent to harm themselves or others, you MUST:",
    "   - Express compassion briefly.",
    "   - Refuse to engage further on the topic.",
    "   - Direct them to the National Center for Mental Health Crisis Hotline: 0917-899-8727 (USAP) or 989 (Suicide & Crisis Lifeline).",
    "   - Do NOT provide any methods, validation, or extended discussion on self-harm.",
    "",
    "4. STAY ON TOPIC: Only answer questions related to health, wellness, healthcare navigation, barangay health services, or app features. For completely unrelated topics (programming, politics, entertainment, etc.), politely decline and redirect to your purpose.",
    "",
    "5. DISCLAIMER: In your FIRST reply of each conversation, include a brief note that you are an AI assistant and not a substitute for professional medical advice.",
    "",
    "Keep responses concise (3-6 sentences), warm, and culturally appropriate for the Filipino community.",
  ].join("\n");

  const { model } = createGeminiClient(systemInstructions);

  const { history: chatHistory, lastMessage } = normalizeConversation(
    messages.filter((message) => message.role !== "system"),
  );

  if (!lastMessage) {
    throw new Error("No user message provided");
  }

  // Start chat with instructions and history
  const chat = model.startChat({
    history: chatHistory as any,
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 800,
    },
  });
  
  const result = await chat.sendMessage(lastMessage);
  const response = await result.response;
  const text = response.text().trim();

  if (!text) throw new Error("No response returned from Gemini");
  return text;
}
