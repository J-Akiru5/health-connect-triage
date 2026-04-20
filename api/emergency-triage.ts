import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateEmergencyTriageAssessment } from "../src/server/emergencyTriage";

type EmergencyTriageBody = {
  locale?: string | null;
  patient?: {
    name?: string | null;
    duration?: string | null;
  } | null;
  symptoms?: Array<{
    id?: string;
    label?: string;
    category?: string;
  }> | null;
  riskFactors?: string[] | null;
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

  const body = (req.body ?? {}) as EmergencyTriageBody;
  const symptoms = Array.isArray(body.symptoms) ? body.symptoms : [];
  if (symptoms.length === 0) {
    return json(res, 400, { error: "At least one symptom is required" });
  }

  try {
    const result = await generateEmergencyTriageAssessment(body, process.env.AZURE_OPENAI_API_KEY ?? "");
    return json(res, 200, result);
  } catch (e) {
    const status = typeof (e as { status?: unknown }).status === "number" ? (e as any).status : 500;
    const msg = e instanceof Error ? e.message : String(e);
    const detail = typeof (e as { detail?: unknown }).detail === "string" ? (e as any).detail : msg;
    return json(res, status, { error: status >= 500 ? "Server error" : "Request failed", detail });
  }
}
