import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateEmergencyTriageAssessment } from "../src/server/emergencyTriage.js";

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

function getErrorStatus(error: unknown): number {
  const e = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };

  const candidate = e?.statusCode ?? e?.status ?? e?.response?.status;
  const parsed = typeof candidate === "number" ? candidate : Number(candidate);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
}

function getErrorDetail(error: unknown): string {
  const e = error as {
    detail?: unknown;
    message?: unknown;
    response?: { data?: unknown; bodyAsText?: unknown };
  };

  if (typeof e?.detail === "string" && e.detail.trim()) return e.detail;
  if (typeof e?.message === "string" && e.message.trim()) return e.message;
  if (typeof e?.response?.bodyAsText === "string" && e.response.bodyAsText.trim()) return e.response.bodyAsText;
  if (typeof e?.response?.data === "string" && e.response.data.trim()) return e.response.data;
  return "Unknown server error";
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
    const status = getErrorStatus(e);
    const detail = getErrorDetail(e);
    console.error("[api/emergency-triage]", { status, detail });
    return json(res, status, {
      error: status >= 500 ? "Server error" : "Request failed",
      detail,
    });
  }
}
