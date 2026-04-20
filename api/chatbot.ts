import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getChatbotReply } from "../src/server/chatbot";

type ChatMessageInput = {
  role?: string;
  content?: string;
};

type ChatRequestBody = {
  messages?: ChatMessageInput[];
};

function json(res: VercelResponse, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  const body = (req.body ?? {}) as ChatRequestBody;

  try {
    const result = await getChatbotReply(body);
    return json(res, 200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(res, 500, { error: "Request failed", detail: message });
  }
}import type { VercelRequest, VercelResponse } from "@vercel/node";
    return json(res, 500, { error: "Request failed", detail: message });

type ChatMessageInput = {

  role?: string;
