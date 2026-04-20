import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateTriageExplanation } from "../src/server/triageExplain";

type ExplainRequestBody = {
  triageLevel?: string | null;
  riskScore?: number | null;
  recommendedAction?: string | null;
  assessment?: {
    symptoms?: unknown;
    duration?: string | null;
    severity?: string | null;
    notes?: string | null;
    vitals?: Record<string, unknown> | null;
  } | null;
};

function json(res: VercelResponse, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_DEPLOYMENT_NAME) {
    return json(res, 500, { error: "Server not configured: Azure OpenAI environment variables missing" });
  }

  const body = (req.body ?? {}) as ExplainRequestBody;

  try {
    const explanation = await generateTriageExplanation(body, process.env.AZURE_OPENAI_API_KEY ?? "");
    return json(res, 200, { explanation });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = typeof (e as { status?: unknown }).status === "number" ? (e as any).status : 500;
    const detail = typeof (e as { detail?: unknown }).detail === "string" ? (e as any).detail : msg;
    return json(res, status, { error: status >= 500 ? "Server error" : "Request failed", detail });
  }
}

