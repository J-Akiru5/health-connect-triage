import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateGeminiResponse } from "../src/server/geminiHandler";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatRequestBody = {
  messages: ChatMessage[];
};

function json(res: VercelResponse, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return json(res, 500, { error: "Server not configured: Gemini API key missing" });
  }

  const body = (req.body ?? {}) as ChatRequestBody;

  if (!body.messages || !Array.isArray(body.messages)) {
    return json(res, 400, { error: "Messages array is required" });
  }

  try {
    const response = await generateGeminiResponse(body);
    return json(res, 200, { response });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = typeof (e as { status?: unknown }).status === "number" ? (e as any).status : 500;
    const detail = typeof (e as { detail?: unknown }).detail === "string" ? (e as any).detail : msg;
    return json(res, status, { error: status >= 500 ? "Server error" : "Request failed", detail });
  }
}
