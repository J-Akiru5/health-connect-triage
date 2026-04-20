import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Initialize the Gemini client using environment variables.
 * Note: This runs on the server (Vercel functions).
 */
export function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  return { genAI, model };
}

/**
 * Maps a message role to Gemini's expected role.
 * Gemini uses 'user' and 'model' (for assistant).
 */
export function mapToGeminiRole(role: "user" | "assistant" | "system"): string {
  if (role === "assistant") return "model";
  return "user";
}
