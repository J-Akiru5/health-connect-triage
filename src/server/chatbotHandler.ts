import { generateGeminiResponse } from "./geminiHandler";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatRequestBody = {
  messages: ChatMessage[];
};

export async function generateChatbotResponse(body: ChatRequestBody) {
  return generateGeminiResponse(body);
}
